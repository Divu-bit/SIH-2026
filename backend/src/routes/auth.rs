use alloy::primitives::Address;
use axum::{extract::State, Json};
use jsonwebtoken::{encode, EncodingKey, Header};
use std::time::{SystemTime, UNIX_EPOCH};

use crate::error::AppError;
use crate::models::{
    ChallengeRequest, ChallengeResponse, JwtClaims, VerifySignatureRequest, VerifySignatureResponse,
};
use crate::AppState;

pub async fn request_challenge(
    State(state): State<AppState>,
    Json(payload): Json<ChallengeRequest>,
) -> Result<Json<ChallengeResponse>, AppError> {
    if payload.address.trim().is_empty() {
        return Err(AppError::BadRequest("Address cannot be empty".to_string()));
    }

    let (nonce, message) = state.auth_store.generate_challenge(&payload.address);

    Ok(Json(ChallengeResponse {
        address: payload.address,
        nonce,
        message,
    }))
}

pub async fn verify_signature(
    State(state): State<AppState>,
    Json(payload): Json<VerifySignatureRequest>,
) -> Result<Json<VerifySignatureResponse>, AppError> {
    // 1. Verify EIP-191 signature
    state
        .auth_store
        .verify_signature(&payload.address, &payload.signature)?;

    let parsed_addr: Address = payload
        .address
        .parse()
        .map_err(|e| AppError::BadRequest(format!("Invalid wallet address: {}", e)))?;

    // 2. Resolve DID via IdentityRegistry (best effort)
    let expected_did = format!("did:trustchain:{}", payload.address.to_lowercase());
    let (did, _) = match state.client.get_identity(&expected_did).await {
        Ok(id_rec) => (id_rec.did, true),
        Err(_) => (expected_did.clone(), false),
    };

    // 3. Resolve roles from RoleManager
    let is_admin = state.client.is_admin(parsed_addr).await.unwrap_or(false);
    let is_manager = state.client.is_manager(parsed_addr).await.unwrap_or(false);
    let is_auditor = state.client.is_auditor(parsed_addr).await.unwrap_or(false);

    // 4. Issue JWT
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();

    let expires_in = state.config.jwt_expiry_secs;

    let claims = JwtClaims {
        sub: payload.address.to_lowercase(),
        did: did.clone(),
        is_admin,
        is_manager,
        is_auditor,
        iat: now,
        exp: now + expires_in,
    };

    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(state.config.jwt_secret.as_bytes()),
    )
    .map_err(|e| AppError::Internal(format!("Failed to issue JWT: {}", e)))?;

    tracing::info!(
        "Auth: {} verified — admin={} manager={} auditor={}",
        payload.address, is_admin, is_manager, is_auditor
    );

    Ok(Json(VerifySignatureResponse {
        authenticated: true,
        address: payload.address,
        did,
        is_admin,
        is_manager,
        is_auditor,
        token,
        expires_in,
    }))
}

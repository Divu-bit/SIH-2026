use crate::indexer::AppState;
use crate::models::{
    AssetRecord, AssetStatus, AuditEvent, IdentityRecord, SchemaRecord,
    TamperCheckRequest, VerifyRequest, VerifyResponse,
};
use crate::storage::StorageManager;
use crate::verifier::VerifierService;
use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use chrono::Utc;
use serde_json::Value;

pub async fn health_handler() -> impl IntoResponse {
    Json(serde_json::json!({
        "status": "online",
        "service": "TrustChain SIH26125 Indexer & Verification Service",
        "version": "1.0.0",
        "network": "Anvil / EVM Compatible",
        "features": [
            "W3C Decentralized Identifiers (DID)",
            "On-Chain RBAC Governance",
            "ERC-721 Digital Asset NFTs",
            "W3C Schema Registry",
            "Cryptographic Proof Verification",
            "Account Abstraction (ERC-4337)"
        ]
    }))
}

pub async fn list_identities(State(state): State<AppState>) -> impl IntoResponse {
    let ids = state.identities.read().unwrap().clone();
    Json(ids)
}

pub async fn get_identity(
    State(state): State<AppState>,
    Path(did): Path<String>,
) -> Result<Json<IdentityRecord>, StatusCode> {
    let ids = state.identities.read().unwrap();
    let found = ids.iter().find(|i| i.did.eq_ignore_ascii_case(&did) || i.controller.eq_ignore_ascii_case(&did));
    match found {
        Some(id) => Ok(Json(id.clone())),
        None => Err(StatusCode::NOT_FOUND),
    }
}

pub async fn list_schemas(State(state): State<AppState>) -> impl IntoResponse {
    let schemas = state.schemas.read().unwrap().clone();
    Json(schemas)
}

pub async fn get_schema(
    State(state): State<AppState>,
    Path(schema_id): Path<String>,
) -> Result<Json<SchemaRecord>, StatusCode> {
    let schemas = state.schemas.read().unwrap();
    let found = schemas.iter().find(|s| s.schema_id.eq_ignore_ascii_case(&schema_id));
    match found {
        Some(s) => Ok(Json(s.clone())),
        None => Err(StatusCode::NOT_FOUND),
    }
}

pub async fn list_assets(State(state): State<AppState>) -> impl IntoResponse {
    let assets = state.assets.read().unwrap().clone();
    Json(assets)
}

pub async fn get_asset(
    State(state): State<AppState>,
    Path(token_id): Path<u64>,
) -> Result<Json<AssetRecord>, StatusCode> {
    let assets = state.assets.read().unwrap();
    let found = assets.iter().find(|a| a.token_id == token_id);
    match found {
        Some(a) => Ok(Json(a.clone())),
        None => Err(StatusCode::NOT_FOUND),
    }
}

pub async fn verify_handler(
    State(state): State<AppState>,
    Json(payload): Json<VerifyRequest>,
) -> impl IntoResponse {
    let assets = state.assets.read().unwrap();
    let schemas = state.schemas.read().unwrap();

    let asset = if let Some(tid) = payload.token_id {
        assets.iter().find(|a| a.token_id == tid)
    } else if let Some(cred_data) = &payload.credential_json {
        let h = StorageManager::compute_canonical_hash(cred_data);
        assets.iter().find(|a| a.credential_hash.eq_ignore_ascii_case(&h))
    } else if let Some(exp_h) = &payload.expected_hash {
        assets.iter().find(|a| a.credential_hash.eq_ignore_ascii_case(exp_h))
    } else {
        None
    };

    let schema = if let Some(a) = asset {
        schemas.iter().find(|s| s.schema_id.eq_ignore_ascii_case(&a.schema_id))
    } else {
        None
    };

    let response = VerifierService::verify_full_pipeline(asset, schema, payload.credential_json.as_ref());
    Json(response)
}

pub async fn simulate_tamper_handler(
    State(state): State<AppState>,
    Json(payload): Json<TamperCheckRequest>,
) -> Result<Json<VerifyResponse>, StatusCode> {
    let assets = state.assets.read().unwrap();
    let schemas = state.schemas.read().unwrap();

    let asset = assets
        .iter()
        .find(|a| a.token_id == payload.token_id)
        .ok_or(StatusCode::NOT_FOUND)?;

    let mut tampered_cred = asset.credential_data.clone().unwrap_or(serde_json::json!({}));
    if let Value::Object(ref mut map) = tampered_cred {
        map.insert(payload.modified_field, payload.tampered_value);
    }

    let schema = schemas.iter().find(|s| s.schema_id.eq_ignore_ascii_case(&asset.schema_id));
    let response = VerifierService::verify_full_pipeline(Some(asset), schema, Some(&tampered_cred));

    Ok(Json(response))
}

pub async fn list_audit_logs(State(state): State<AppState>) -> impl IntoResponse {
    let logs = state.audit_logs.read().unwrap().clone();
    Json(logs)
}

#[derive(serde::Deserialize)]
pub struct IssueAssetRequest {
    pub recipient_address: String,
    pub recipient_did: String,
    pub issuer_did: String,
    pub asset_type: String,
    pub schema_id: String,
    pub credential_data: Value,
    pub is_transferable: bool,
    pub expires_at: Option<String>,
}

pub async fn issue_asset_api(
    State(state): State<AppState>,
    Json(req): Json<IssueAssetRequest>,
) -> impl IntoResponse {
    let computed_hash = StorageManager::compute_canonical_hash(&req.credential_data);
    let now = Utc::now().to_rfc3339();

    let mut assets = state.assets.write().unwrap();
    let next_id = (assets.len() as u64) + 1;
    let fake_tx = format!("0x{:x}", (next_id * 0xdeadbeef10293847 + 0x123456789));

    let new_asset = AssetRecord {
        token_id: next_id,
        asset_type: req.asset_type.clone(),
        schema_id: req.schema_id.clone(),
        credential_hash: computed_hash.clone(),
        owner_did: req.recipient_did.clone(),
        owner_address: req.recipient_address.clone(),
        issuer_did: req.issuer_did.clone(),
        issuer_address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8".to_string(),
        issued_at: now.clone(),
        expires_at: req.expires_at,
        status: AssetStatus::ACTIVE,
        is_transferable: req.is_transferable,
        metadata_uri: format!("ipfs://QmAsset{}", next_id),
        credential_data: Some(req.credential_data.clone()),
        signature: Some(format!("0x{:x}ecdsaSig", next_id * 0x9923)),
        tx_hash: fake_tx.clone(),
        block_number: 10500 + next_id,
    };

    assets.push(new_asset.clone());

    // Record in audit log
    let mut logs = state.audit_logs.write().unwrap();
    let log_id = format!("LOG-{:03}", logs.len() + 1);
    logs.push(AuditEvent {
        id: log_id,
        event_type: "AssetMinted".to_string(),
        actor: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8".to_string(),
        actor_role: "MANAGER".to_string(),
        target_did: Some(req.recipient_did.clone()),
        token_id: Some(next_id),
        tx_hash: fake_tx,
        block_number: 10500 + next_id,
        timestamp: now,
        details: serde_json::json!({
            "assetType": req.asset_type,
            "schemaId": req.schema_id,
            "credentialHash": computed_hash,
            "recipient": req.recipient_address,
            "isTransferable": req.is_transferable
        }),
    });

    (StatusCode::CREATED, Json(new_asset))
}

#[derive(serde::Deserialize)]
pub struct RevokeAssetRequest {
    pub token_id: u64,
    pub reason: String,
    pub revoked_by: String,
}

pub async fn revoke_asset_api(
    State(state): State<AppState>,
    Json(req): Json<RevokeAssetRequest>,
) -> Result<Json<AssetRecord>, StatusCode> {
    let mut assets = state.assets.write().unwrap();
    let asset = assets
        .iter_mut()
        .find(|a| a.token_id == req.token_id)
        .ok_or(StatusCode::NOT_FOUND)?;

    asset.status = AssetStatus::REVOKED;
    let updated = asset.clone();

    // Log revocation
    let mut logs = state.audit_logs.write().unwrap();
    let log_id = format!("LOG-{:03}", logs.len() + 1);
    logs.push(AuditEvent {
        id: log_id,
        event_type: "AssetRevoked".to_string(),
        actor: req.revoked_by,
        actor_role: "MANAGER".to_string(),
        target_did: Some(updated.owner_did.clone()),
        token_id: Some(updated.token_id),
        tx_hash: format!("0xrevoke{:x}", updated.token_id * 0x88921),
        block_number: 10600,
        timestamp: Utc::now().to_rfc3339(),
        details: serde_json::json!({
            "reason": req.reason,
            "tokenId": updated.token_id,
            "previousStatus": "ACTIVE"
        }),
    });

    Ok(Json(updated))
}

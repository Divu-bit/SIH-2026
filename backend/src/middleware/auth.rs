/// JWT Authentication Middleware
///
/// Extracts and validates `Authorization: Bearer <token>` header.
/// Injects `AuthenticatedUser` into request extensions for route handlers.

use axum::{
    extract::{Request, State},
    http::{header::AUTHORIZATION, StatusCode},
    middleware::Next,
    response::Response,
    Json,
};
use jsonwebtoken::{decode, DecodingKey, Validation};
use serde::{Deserialize, Serialize};
use serde_json::json;

use crate::{models::JwtClaims, AppState};

/// The authenticated user — injected by this middleware into request extensions
#[derive(Debug, Clone)]
pub struct AuthenticatedUser {
    pub address: String,
    pub did: String,
    pub is_admin: bool,
    pub is_manager: bool,
    pub is_auditor: bool,
}

/// Extract JWT claims from `Authorization: Bearer <token>` header
pub fn extract_claims(
    header_value: &str,
    jwt_secret: &str,
) -> Result<JwtClaims, &'static str> {
    let token = header_value
        .strip_prefix("Bearer ")
        .ok_or("Missing Bearer prefix")?;

    let key = DecodingKey::from_secret(jwt_secret.as_bytes());
    let mut validation = Validation::default();
    validation.validate_exp = true;

    decode::<JwtClaims>(token, &key, &validation)
        .map(|data| data.claims)
        .map_err(|_| "Invalid or expired token")
}

/// Axum middleware function — requires valid JWT on the route
pub async fn require_auth(
    State(state): State<AppState>,
    mut request: Request,
    next: Next,
) -> Result<Response, (StatusCode, Json<serde_json::Value>)> {
    let auth_header = request
        .headers()
        .get(AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_owned());

    let Some(header_value) = auth_header else {
        return Err((
            StatusCode::UNAUTHORIZED,
            Json(json!({ "error": "unauthorized", "message": "Missing Authorization header" })),
        ));
    };

    match extract_claims(&header_value, &state.config.jwt_secret) {
        Ok(claims) => {
            let user = AuthenticatedUser {
                address: claims.sub.clone(),
                did: claims.did.clone(),
                is_admin: claims.is_admin,
                is_manager: claims.is_manager,
                is_auditor: claims.is_auditor,
            };
            request.extensions_mut().insert(user);
            Ok(next.run(request).await)
        }
        Err(msg) => Err((
            StatusCode::UNAUTHORIZED,
            Json(json!({ "error": "unauthorized", "message": msg })),
        )),
    }
}


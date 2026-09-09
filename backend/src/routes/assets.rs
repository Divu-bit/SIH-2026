use axum::{
    extract::{Path, State},
    Json,
};
use crate::error::AppError;
use crate::models::{AssetRecord, VerifyAssetPayload, VerifyAssetResult};
use crate::AppState;

pub async fn get_asset(
    State(state): State<AppState>,
    Path(token_id): Path<u64>,
) -> Result<Json<AssetRecord>, AppError> {
    let asset = state.client.get_asset(token_id).await?;
    Ok(Json(asset))
}

pub async fn verify_asset(
    State(state): State<AppState>,
    Json(payload): Json<VerifyAssetPayload>,
) -> Result<Json<VerifyAssetResult>, AppError> {
    let result = state
        .client
        .verify_asset(payload.token_id, &payload.credential_hash)
        .await?;

    Ok(Json(result))
}

use axum::{
    extract::{Query, State},
    Json,
};
use serde::Deserialize;
use serde_json::{json, Value};

use crate::{
    db::{asset as db_asset, event as db_event},
    error::AppError,
    models::{AssetRecord, AuditSummary},
    AppState,
};


// ── Query Params ──────────────────────────────────────────────────────────────

#[derive(Debug, Deserialize)]
pub struct AuditEventsQuery {
    pub event: Option<String>,
    pub limit: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct AssetListQuery {
    pub owner_did: Option<String>,
    pub issuer_did: Option<String>,
    pub schema_id: Option<String>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

// ── Handlers ──────────────────────────────────────────────────────────────────

/// GET /api/audit/summary — overall system state summary
pub async fn get_audit_summary(
    State(state): State<AppState>,
) -> Result<Json<AuditSummary>, AppError> {
    // Get counts from DB (fast) — blockchain remains authoritative source
    let total_assets = db_asset::count_assets(&state.db).await.unwrap_or(0) as u64;
    let total_schemas = db_event::count_events_by_name(&state.db, "SchemaRegistered")
        .await
        .unwrap_or(0) as usize;

    // Live chain totals for the "official" count (authoritative)
    let chain_asset_count = state.client.get_asset_count().await.unwrap_or(total_assets);
    let chain_schema_ids = state.client.get_all_schema_ids().await.unwrap_or_default();

    let issued_count = db_event::count_events_by_name(&state.db, "AssetIssued").await.unwrap_or(0);
    let transferred_count = db_event::count_events_by_name(&state.db, "AssetTransferred").await.unwrap_or(0);
    let revoked_count = db_event::count_events_by_name(&state.db, "AssetRevoked").await.unwrap_or(0);

    Ok(Json(AuditSummary {
        chain_id: 11155111,
        role_manager: format!("{:#x}", state.client.role_manager_addr),
        identity_registry: format!("{:#x}", state.client.identity_registry_addr),
        schema_registry: format!("{:#x}", state.client.schema_registry_addr),
        asset_nft: format!("{:#x}", state.client.asset_nft_addr),
        asset_registry: format!("{:#x}", state.client.asset_registry_addr),
        paymaster: format!("{:#x}", state.client.trust_paymaster_addr),
        total_assets: chain_asset_count,
        total_schemas: chain_schema_ids.len(),
        // extended audit fields
        indexed_assets: total_assets,
        indexed_schemas: total_schemas as u64,
        total_issuances: issued_count as u64,
        total_transfers: transferred_count as u64,
        total_revocations: revoked_count as u64,
    }))
}

/// GET /api/audit/assets — list indexed assets (fast, from DB)
pub async fn get_auditable_assets(
    State(state): State<AppState>,
    Query(params): Query<AssetListQuery>,
) -> Result<Json<Vec<AssetRecord>>, AppError> {
    let limit = params.limit.unwrap_or(50).min(200);
    let offset = params.offset.unwrap_or(0);

    let rows = db_asset::list_assets(
        &state.db,
        params.owner_did.as_deref(),
        params.issuer_did.as_deref(),
        params.schema_id.as_deref(),
        limit,
        offset,
    ).await?;

    let records: Vec<AssetRecord> = rows.into_iter().map(AssetRecord::from).collect();
    Ok(Json(records))
}

/// GET /api/audit/issuances — recent AssetIssued events
pub async fn get_issuances(
    State(state): State<AppState>,
    Query(params): Query<AuditEventsQuery>,
) -> Result<Json<Vec<Value>>, AppError> {
    let limit = params.limit.unwrap_or(50).min(200);
    let events = db_event::list_recent_events(&state.db, Some("AssetIssued"), limit).await?;
    let result: Vec<Value> = events
        .into_iter()
        .map(|e| json!({
            "blockNumber": e.block_number,
            "transactionHash": e.transaction_hash,
            "timestamp": e.block_timestamp,
            "data": e.event_data,
        }))
        .collect();
    Ok(Json(result))
}

/// GET /api/audit/transfers — recent AssetTransferred events
pub async fn get_transfers(
    State(state): State<AppState>,
    Query(params): Query<AuditEventsQuery>,
) -> Result<Json<Vec<Value>>, AppError> {
    let limit = params.limit.unwrap_or(50).min(200);
    let events = db_event::list_recent_events(&state.db, Some("AssetTransferred"), limit).await?;
    let result: Vec<Value> = events
        .into_iter()
        .map(|e| json!({
            "blockNumber": e.block_number,
            "transactionHash": e.transaction_hash,
            "timestamp": e.block_timestamp,
            "data": e.event_data,
        }))
        .collect();
    Ok(Json(result))
}

/// GET /api/audit/revocations — recent AssetRevoked events
pub async fn get_revocations(
    State(state): State<AppState>,
    Query(params): Query<AuditEventsQuery>,
) -> Result<Json<Vec<Value>>, AppError> {
    let limit = params.limit.unwrap_or(50).min(200);
    let events = db_event::list_recent_events(&state.db, Some("AssetRevoked"), limit).await?;
    let result: Vec<Value> = events
        .into_iter()
        .map(|e| json!({
            "blockNumber": e.block_number,
            "transactionHash": e.transaction_hash,
            "timestamp": e.block_timestamp,
            "data": e.event_data,
        }))
        .collect();
    Ok(Json(result))
}

/// GET /api/audit/events — raw event log (any event type)
pub async fn get_events(
    State(state): State<AppState>,
    Query(params): Query<AuditEventsQuery>,
) -> Result<Json<Vec<Value>>, AppError> {
    let limit = params.limit.unwrap_or(50).min(200);
    let events = db_event::list_recent_events(
        &state.db,
        params.event.as_deref(),
        limit,
    ).await?;

    let result: Vec<Value> = events
        .into_iter()
        .map(|e| json!({
            "id": e.id,
            "contractAddress": e.contract_address,
            "eventName": e.event_name,
            "blockNumber": e.block_number,
            "transactionHash": e.transaction_hash,
            "logIndex": e.log_index,
            "timestamp": e.block_timestamp,
            "data": e.event_data,
            "indexedAt": e.indexed_at,
        }))
        .collect();
    Ok(Json(result))
}

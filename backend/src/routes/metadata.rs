/// Phase 11 — Mock IPFS Metadata Storage
///
/// Stores arbitrary JSON documents in PostgreSQL and returns a mock
/// `ipfs://mock/<uuid>` URI. This is functionally equivalent to real IPFS
/// for the demo — the URI is stored on-chain in the metadataUri field.
///
/// In production, swap `store_metadata_db()` with a Pinata API call.

use axum::{
    extract::{Path, State},
    Extension, Json,
};
use serde_json::{json, Value};
use uuid::Uuid;

use crate::{
    error::AppError,
    middleware::auth::AuthenticatedUser,
    models::{MetadataUploadRequest, MetadataUploadResponse},
    AppState,
};

/// POST /api/metadata
/// Upload a JSON document. Returns a mock IPFS URI.
/// Requires authentication (any authenticated user can upload).
pub async fn upload_metadata(
    State(state): State<AppState>,
    Extension(_user): Extension<AuthenticatedUser>,
    Json(payload): Json<MetadataUploadRequest>,
) -> Result<Json<MetadataUploadResponse>, AppError> {
    let id = Uuid::new_v4().to_string();
    let uri = format!("ipfs://mock/{}", id);
    let doc_type = payload.doc_type.unwrap_or_else(|| "generic".to_string());

    // Store in PostgreSQL metadata table
    sqlx::query(
        r#"
        INSERT INTO metadata_store (id, uri, doc_type, data)
        VALUES ($1, $2, $3, $4)
        "#
    )
    .bind(&id)
    .bind(&uri)
    .bind(&doc_type)
    .bind(&payload.data)
    .execute(&state.db)
    .await
    .map_err(|e| AppError::DatabaseError(format!("Failed to store metadata: {}", e)))?;

    tracing::info!("Metadata stored: {} type={}", uri, doc_type);

    Ok(Json(MetadataUploadResponse { id, uri }))
}

/// GET /api/metadata/:id
/// Retrieve a stored metadata document by its UUID.
/// Public — no auth required (metadata is meant to be readable).
pub async fn get_metadata(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<Json<Value>, AppError> {
    let row = sqlx::query(
        r#"SELECT id, uri, doc_type, data, created_at FROM metadata_store WHERE id = $1"#
    )
    .bind(&id)
    .fetch_optional(&state.db)
    .await
    .map_err(|e| AppError::DatabaseError(format!("DB query failed: {}", e)))?;

    match row {
        Some(r) => {
            use sqlx::Row;
            Ok(Json(json!({
                "id": r.get::<String, _>("id"),
                "uri": r.get::<String, _>("uri"),
                "docType": r.get::<String, _>("doc_type"),
                "data": r.get::<Value, _>("data"),
                "createdAt": r.get::<chrono::DateTime<chrono::Utc>, _>("created_at"),
            })))
        }
        None => Err(AppError::NotFound(format!("Metadata '{}' not found", id))),
    }
}

use sqlx::{PgPool, Row};
use chrono::{DateTime, Utc};
use uuid::Uuid;
use crate::error::AppError;
use crate::models::AssetRecord;

#[derive(Debug)]
pub struct AssetRow {
    pub id: Uuid,
    pub token_id: i64,
    pub asset_type: String,
    pub schema_id: String,
    pub credential_hash: String,
    pub owner_did: String,
    pub issuer_did: String,
    pub issuer_address: String,
    pub nft_owner_address: String,
    pub issued_at: Option<DateTime<Utc>>,
    pub expires_at: Option<DateTime<Utc>>,
    pub status: i16,
    pub is_transferable: bool,
    pub metadata_uri: String,
    pub transaction_hash: Option<String>,
    pub block_number: Option<i64>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

impl From<AssetRow> for AssetRecord {
    fn from(row: AssetRow) -> Self {
        let status_str = match row.status {
            0 => "ACTIVE",
            1 => "SUSPENDED",
            2 => "REVOKED",
            3 => "EXPIRED",
            _ => "UNKNOWN",
        };
        AssetRecord {
            token_id: row.token_id as u64,
            recipient: row.issuer_address.clone(),
            owner_did: row.owner_did,
            issuer_did: row.issuer_did,
            asset_type: row.asset_type,
            schema_id: row.schema_id,
            credential_hash: row.credential_hash,
            metadata_uri: row.metadata_uri,
            issued_at: row.issued_at.map(|t| t.timestamp() as u64).unwrap_or(0),
            expires_at: row.expires_at.map(|t| t.timestamp() as u64).unwrap_or(0),
            status: status_str.to_string(),
            is_transferable: row.is_transferable,
            nft_owner: row.nft_owner_address,
        }
    }
}

fn map_asset_row(row: sqlx::postgres::PgRow) -> AssetRow {
    use sqlx::Row;
    AssetRow {
        id: row.get("id"),
        token_id: row.get("token_id"),
        asset_type: row.get("asset_type"),
        schema_id: row.get("schema_id"),
        credential_hash: row.get("credential_hash"),
        owner_did: row.get("owner_did"),
        issuer_did: row.get("issuer_did"),
        issuer_address: row.get("issuer_address"),
        nft_owner_address: row.get("nft_owner_address"),
        issued_at: row.get("issued_at"),
        expires_at: row.get("expires_at"),
        status: row.get("status"),
        is_transferable: row.get("is_transferable"),
        metadata_uri: row.get("metadata_uri"),
        transaction_hash: row.get("transaction_hash"),
        block_number: row.get("block_number"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    }
}

/// Upsert an asset record from AssetIssued blockchain event
pub async fn upsert_asset(
    pool: &PgPool,
    token_id: i64,
    asset_type: &str,
    schema_id: &str,
    credential_hash: &str,
    owner_did: &str,
    issuer_did: &str,
    issuer_address: &str,
    nft_owner_address: &str,
    issued_at: Option<DateTime<Utc>>,
    expires_at: Option<DateTime<Utc>>,
    status: i16,
    is_transferable: bool,
    metadata_uri: &str,
    transaction_hash: Option<&str>,
    block_number: Option<i64>,
) -> Result<(), AppError> {
    sqlx::query(
        r#"
        INSERT INTO assets (
            token_id, asset_type, schema_id, credential_hash, owner_did, issuer_did,
            issuer_address, nft_owner_address, issued_at, expires_at, status,
            is_transferable, metadata_uri, transaction_hash, block_number
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
        ON CONFLICT (token_id) DO UPDATE SET
            asset_type = CASE WHEN EXCLUDED.asset_type != '' THEN EXCLUDED.asset_type ELSE assets.asset_type END,
            schema_id = CASE WHEN EXCLUDED.schema_id != '' THEN EXCLUDED.schema_id ELSE assets.schema_id END,
            credential_hash = CASE WHEN EXCLUDED.credential_hash != '' THEN EXCLUDED.credential_hash ELSE assets.credential_hash END,
            owner_did = CASE WHEN EXCLUDED.owner_did != '' THEN EXCLUDED.owner_did ELSE assets.owner_did END,
            issuer_did = CASE WHEN EXCLUDED.issuer_did != '' THEN EXCLUDED.issuer_did ELSE assets.issuer_did END,
            issuer_address = CASE WHEN EXCLUDED.issuer_address != '' THEN EXCLUDED.issuer_address ELSE assets.issuer_address END,
            nft_owner_address = CASE WHEN EXCLUDED.nft_owner_address != '' THEN EXCLUDED.nft_owner_address ELSE assets.nft_owner_address END,
            issued_at = COALESCE(EXCLUDED.issued_at, assets.issued_at),
            expires_at = COALESCE(EXCLUDED.expires_at, assets.expires_at),
            status = EXCLUDED.status,
            is_transferable = EXCLUDED.is_transferable,
            metadata_uri = CASE WHEN EXCLUDED.metadata_uri != '' THEN EXCLUDED.metadata_uri ELSE assets.metadata_uri END,
            transaction_hash = COALESCE(EXCLUDED.transaction_hash, assets.transaction_hash),
            block_number = COALESCE(EXCLUDED.block_number, assets.block_number),
            updated_at = NOW()
        "#
    )
    .bind(token_id)
    .bind(asset_type)
    .bind(schema_id)
    .bind(credential_hash)
    .bind(owner_did)
    .bind(issuer_did)
    .bind(issuer_address)
    .bind(nft_owner_address)
    .bind(issued_at)
    .bind(expires_at)
    .bind(status)
    .bind(is_transferable)
    .bind(metadata_uri)
    .bind(transaction_hash)
    .bind(block_number)
    .execute(pool)
    .await
    .map_err(|e| AppError::DatabaseError(format!("Failed to upsert asset #{}: {}", token_id, e)))?;

    Ok(())
}

/// Update NFT owner address (from AssetTransferred / NFTOwnerSynced events)
pub async fn update_nft_owner(pool: &PgPool, token_id: i64, new_nft_owner: &str) -> Result<(), AppError> {
    sqlx::query(r#"UPDATE assets SET nft_owner_address = $2, updated_at = NOW() WHERE token_id = $1"#)
        .bind(token_id)
        .bind(new_nft_owner)
        .execute(pool)
        .await
        .map_err(|e| AppError::DatabaseError(format!("Failed to update NFT owner: {}", e)))?;

    Ok(())
}

/// Update asset status (from AssetRevoked etc.)
pub async fn update_asset_status(pool: &PgPool, token_id: i64, new_status: i16) -> Result<(), AppError> {
    sqlx::query(r#"UPDATE assets SET status = $2, updated_at = NOW() WHERE token_id = $1"#)
        .bind(token_id)
        .bind(new_status)
        .execute(pool)
        .await
        .map_err(|e| AppError::DatabaseError(format!("Failed to update asset status: {}", e)))?;

    Ok(())
}

/// Get asset by token_id from DB cache
pub async fn get_asset_by_token_id(pool: &PgPool, token_id: i64) -> Result<Option<AssetRow>, AppError> {
    let row = sqlx::query(
        r#"SELECT id, token_id, asset_type, schema_id, credential_hash, owner_did, issuer_did,
                  issuer_address, nft_owner_address, issued_at, expires_at, status,
                  is_transferable, metadata_uri, transaction_hash, block_number, created_at, updated_at
           FROM assets WHERE token_id = $1"#
    )
    .bind(token_id)
    .fetch_optional(pool)
    .await
    .map_err(|e| AppError::DatabaseError(format!("DB query failed: {}", e)))?;

    Ok(row.map(map_asset_row))
}

/// List assets with optional filters
pub async fn list_assets(
    pool: &PgPool,
    owner_did: Option<&str>,
    issuer_did: Option<&str>,
    schema_id: Option<&str>,
    limit: i64,
    offset: i64,
) -> Result<Vec<AssetRow>, AppError> {
    // Use separate queries based on filter combinations to avoid type issues with optional params
    let rows = sqlx::query(
        r#"SELECT id, token_id, asset_type, schema_id, credential_hash, owner_did, issuer_did,
                  issuer_address, nft_owner_address, issued_at, expires_at, status,
                  is_transferable, metadata_uri, transaction_hash, block_number, created_at, updated_at
           FROM assets
           WHERE ($1::text IS NULL OR owner_did = $1)
             AND ($2::text IS NULL OR issuer_did = $2)
             AND ($3::text IS NULL OR schema_id = $3)
           ORDER BY token_id ASC
           LIMIT $4 OFFSET $5"#
    )
    .bind(owner_did)
    .bind(issuer_did)
    .bind(schema_id)
    .bind(limit)
    .bind(offset)
    .fetch_all(pool)
    .await
    .map_err(|e| AppError::DatabaseError(format!("DB query failed: {}", e)))?;

    Ok(rows.into_iter().map(map_asset_row).collect())
}

/// Count total assets in DB
pub async fn count_assets(pool: &PgPool) -> Result<i64, AppError> {
    let row = sqlx::query(r#"SELECT COUNT(*) as count FROM assets"#)
        .fetch_one(pool)
        .await
        .map_err(|e| AppError::DatabaseError(format!("DB query failed: {}", e)))?;

    Ok(row.get::<i64, _>("count"))
}

/// List recently issued assets for audit dashboard
pub async fn list_recent_issuances(pool: &PgPool, limit: i64) -> Result<Vec<AssetRow>, AppError> {
    let rows = sqlx::query(
        r#"SELECT id, token_id, asset_type, schema_id, credential_hash, owner_did, issuer_did,
                  issuer_address, nft_owner_address, issued_at, expires_at, status,
                  is_transferable, metadata_uri, transaction_hash, block_number, created_at, updated_at
           FROM assets
           ORDER BY created_at DESC
           LIMIT $1"#
    )
    .bind(limit)
    .fetch_all(pool)
    .await
    .map_err(|e| AppError::DatabaseError(format!("DB query failed: {}", e)))?;

    Ok(rows.into_iter().map(map_asset_row).collect())
}

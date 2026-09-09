use sqlx::PgPool;
use chrono::{DateTime, Utc};
use uuid::Uuid;
use crate::error::AppError;
use crate::models::SchemaRecord;

#[derive(Debug)]
pub struct SchemaRow {
    pub id: Uuid,
    pub schema_id: String,
    pub name: String,
    pub schema_uri: String,
    pub schema_hash: String,
    pub version: String,
    pub author_address: String,
    pub is_active: bool,
    pub registered_at: DateTime<Utc>,
    pub transaction_hash: Option<String>,
    pub block_number: Option<i64>,
}

impl From<SchemaRow> for SchemaRecord {
    fn from(row: SchemaRow) -> Self {
        SchemaRecord {
            schema_id: row.schema_id,
            name: row.name,
            schema_uri: row.schema_uri,
            schema_hash: row.schema_hash,
            version: row.version,
            author: row.author_address,
            is_active: row.is_active,
        }
    }
}

fn map_schema_row(row: sqlx::postgres::PgRow) -> SchemaRow {
    use sqlx::Row;
    SchemaRow {
        id: row.get("id"),
        schema_id: row.get("schema_id"),
        name: row.get("name"),
        schema_uri: row.get("schema_uri"),
        schema_hash: row.get("schema_hash"),
        version: row.get("version"),
        author_address: row.get("author_address"),
        is_active: row.get("is_active"),
        registered_at: row.get("registered_at"),
        transaction_hash: row.get("transaction_hash"),
        block_number: row.get("block_number"),
    }
}

/// Upsert schema record from indexed blockchain event
pub async fn upsert_schema(
    pool: &PgPool,
    schema_id: &str,
    name: &str,
    schema_uri: &str,
    schema_hash: &str,
    version: &str,
    author_address: &str,
    is_active: bool,
    transaction_hash: Option<&str>,
    block_number: Option<i64>,
) -> Result<(), AppError> {
    sqlx::query(
        r#"
        INSERT INTO schemas (schema_id, name, schema_uri, schema_hash, version, author_address,
                             is_active, transaction_hash, block_number)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (schema_id) DO UPDATE SET
            name = CASE WHEN EXCLUDED.name != '' THEN EXCLUDED.name ELSE schemas.name END,
            schema_uri = CASE WHEN EXCLUDED.schema_uri != '' THEN EXCLUDED.schema_uri ELSE schemas.schema_uri END,
            schema_hash = CASE WHEN EXCLUDED.schema_hash != '' THEN EXCLUDED.schema_hash ELSE schemas.schema_hash END,
            version = CASE WHEN EXCLUDED.version != '' THEN EXCLUDED.version ELSE schemas.version END,
            author_address = CASE WHEN EXCLUDED.author_address != '' THEN EXCLUDED.author_address ELSE schemas.author_address END,
            is_active = EXCLUDED.is_active,
            transaction_hash = COALESCE(EXCLUDED.transaction_hash, schemas.transaction_hash),
            block_number = COALESCE(EXCLUDED.block_number, schemas.block_number)
        "#
    )
    .bind(schema_id)
    .bind(name)
    .bind(schema_uri)
    .bind(schema_hash)
    .bind(version)
    .bind(author_address)
    .bind(is_active)
    .bind(transaction_hash)
    .bind(block_number)
    .execute(pool)
    .await
    .map_err(|e| AppError::DatabaseError(format!("Failed to upsert schema: {}", e)))?;

    Ok(())
}

/// Update schema active status (from SchemaStatusChanged event)
pub async fn update_schema_status(
    pool: &PgPool,
    schema_id: &str,
    is_active: bool,
) -> Result<(), AppError> {
    sqlx::query(r#"UPDATE schemas SET is_active = $2 WHERE schema_id = $1"#)
        .bind(schema_id)
        .bind(is_active)
        .execute(pool)
        .await
        .map_err(|e| AppError::DatabaseError(format!("Failed to update schema status: {}", e)))?;

    Ok(())
}

/// Get a single schema by schema_id
pub async fn get_schema_by_id(pool: &PgPool, schema_id: &str) -> Result<Option<SchemaRow>, AppError> {
    let row = sqlx::query(
        r#"SELECT id, schema_id, name, schema_uri, schema_hash, version, author_address,
                  is_active, registered_at, transaction_hash, block_number
           FROM schemas WHERE schema_id = $1"#
    )
    .bind(schema_id)
    .fetch_optional(pool)
    .await
    .map_err(|e| AppError::DatabaseError(format!("DB query failed: {}", e)))?;

    Ok(row.map(map_schema_row))
}

/// List all schemas (optionally filter by active)
pub async fn list_schemas(pool: &PgPool, active_only: bool) -> Result<Vec<SchemaRow>, AppError> {
    let query = if active_only {
        r#"SELECT id, schema_id, name, schema_uri, schema_hash, version, author_address,
                  is_active, registered_at, transaction_hash, block_number
           FROM schemas WHERE is_active = true ORDER BY registered_at DESC"#
    } else {
        r#"SELECT id, schema_id, name, schema_uri, schema_hash, version, author_address,
                  is_active, registered_at, transaction_hash, block_number
           FROM schemas ORDER BY registered_at DESC"#
    };

    let rows = sqlx::query(query)
        .fetch_all(pool)
        .await
        .map_err(|e| AppError::DatabaseError(format!("DB query failed: {}", e)))?;

    Ok(rows.into_iter().map(map_schema_row).collect())
}

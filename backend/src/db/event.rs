use sqlx::{PgPool, Row};
use chrono::{DateTime, Utc};
use serde_json::Value;
use uuid::Uuid;
use crate::error::AppError;

/// Represents one raw indexed blockchain event
#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct BlockchainEventRow {
    pub id: Uuid,
    pub contract_address: String,
    pub event_name: String,
    pub block_number: i64,
    pub transaction_hash: String,
    pub log_index: i32,
    pub block_timestamp: Option<DateTime<Utc>>,
    pub event_data: Value,
    pub indexed_at: DateTime<Utc>,
}

fn map_event_row(row: sqlx::postgres::PgRow) -> BlockchainEventRow {
    use sqlx::Row;
    BlockchainEventRow {
        id: row.get("id"),
        contract_address: row.get("contract_address"),
        event_name: row.get("event_name"),
        block_number: row.get("block_number"),
        transaction_hash: row.get("transaction_hash"),
        log_index: row.get("log_index"),
        block_timestamp: row.get("block_timestamp"),
        event_data: row.get("event_data"),
        indexed_at: row.get("indexed_at"),
    }
}

/// Insert a new blockchain event, ignoring duplicates (idempotent)
pub async fn insert_event(
    pool: &PgPool,
    contract_address: &str,
    event_name: &str,
    block_number: i64,
    transaction_hash: &str,
    log_index: i32,
    block_timestamp: Option<DateTime<Utc>>,
    event_data: Value,
) -> Result<bool, AppError> {
    let result = sqlx::query(
        r#"
        INSERT INTO blockchain_events
            (contract_address, event_name, block_number, transaction_hash, log_index, block_timestamp, event_data)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (transaction_hash, log_index) DO NOTHING
        "#
    )
    .bind(contract_address)
    .bind(event_name)
    .bind(block_number)
    .bind(transaction_hash)
    .bind(log_index)
    .bind(block_timestamp)
    .bind(event_data)
    .execute(pool)
    .await
    .map_err(|e| AppError::DatabaseError(format!("Failed to insert event: {}", e)))?;

    Ok(result.rows_affected() == 1)
}

/// Get the last processed block number across all indexed events
pub async fn get_last_indexed_block(pool: &PgPool) -> Result<i64, AppError> {
    let row = sqlx::query(
        r#"SELECT COALESCE(MAX(block_number), 0)::bigint as last_block FROM blockchain_events"#
    )
    .fetch_one(pool)
    .await
    .map_err(|e| AppError::DatabaseError(format!("DB query failed: {}", e)))?;

    Ok(row.get::<i64, _>("last_block"))
}

/// Upsert the indexer checkpoint for a specific contract
pub async fn upsert_indexer_state(
    pool: &PgPool,
    contract_address: &str,
    contract_name: &str,
    last_processed_block: i64,
) -> Result<(), AppError> {
    sqlx::query(
        r#"
        INSERT INTO indexer_state (contract_address, contract_name, last_processed_block)
        VALUES ($1, $2, $3)
        ON CONFLICT (contract_address) DO UPDATE SET
            last_processed_block = EXCLUDED.last_processed_block,
            updated_at = NOW()
        "#
    )
    .bind(contract_address)
    .bind(contract_name)
    .bind(last_processed_block)
    .execute(pool)
    .await
    .map_err(|e| AppError::DatabaseError(format!("Failed to upsert indexer state: {}", e)))?;

    Ok(())
}

/// Get the last processed block for a specific contract address
pub async fn get_indexer_state(pool: &PgPool, contract_address: &str) -> Result<i64, AppError> {
    let row = sqlx::query(
        r#"SELECT last_processed_block FROM indexer_state WHERE contract_address = $1"#
    )
    .bind(contract_address)
    .fetch_optional(pool)
    .await
    .map_err(|e| AppError::DatabaseError(format!("DB query failed: {}", e)))?;

    Ok(row.map(|r| r.get::<i64, _>("last_processed_block")).unwrap_or(0))
}

/// List recent events for the audit dashboard
pub async fn list_recent_events(
    pool: &PgPool,
    event_name: Option<&str>,
    limit: i64,
) -> Result<Vec<BlockchainEventRow>, AppError> {
    let rows = sqlx::query(
        r#"SELECT id, contract_address, event_name, block_number, transaction_hash,
                  log_index, block_timestamp, event_data, indexed_at
           FROM blockchain_events
           WHERE ($1::text IS NULL OR event_name = $1)
           ORDER BY block_number DESC, log_index DESC
           LIMIT $2"#
    )
    .bind(event_name)
    .bind(limit)
    .fetch_all(pool)
    .await
    .map_err(|e| AppError::DatabaseError(format!("DB query failed: {}", e)))?;

    Ok(rows.into_iter().map(map_event_row).collect())
}

/// Count events by name for audit summary
pub async fn count_events_by_name(pool: &PgPool, event_name: &str) -> Result<i64, AppError> {
    let row = sqlx::query(
        r#"SELECT COUNT(*)::bigint as count FROM blockchain_events WHERE event_name = $1"#
    )
    .bind(event_name)
    .fetch_one(pool)
    .await
    .map_err(|e| AppError::DatabaseError(format!("DB query failed: {}", e)))?;

    Ok(row.get::<i64, _>("count"))
}

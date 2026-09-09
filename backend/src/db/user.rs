use sqlx::{PgPool, Row};
use chrono::{DateTime, Utc};
use uuid::Uuid;
use crate::error::AppError;

#[derive(Debug)]
pub struct UserRow {
    pub id: Uuid,
    pub wallet_address: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Upsert a user record when a wallet authenticates successfully
pub async fn upsert_user(pool: &PgPool, wallet_address: &str) -> Result<UserRow, AppError> {
    let row = sqlx::query(
        r#"
        INSERT INTO users (wallet_address)
        VALUES ($1)
        ON CONFLICT (wallet_address) DO UPDATE SET updated_at = NOW()
        RETURNING id, wallet_address, created_at, updated_at
        "#
    )
    .bind(wallet_address.to_lowercase())
    .fetch_one(pool)
    .await
    .map_err(|e| AppError::DatabaseError(format!("Failed to upsert user: {}", e)))?;

    Ok(UserRow {
        id: row.get("id"),
        wallet_address: row.get("wallet_address"),
        created_at: row.get("created_at"),
        updated_at: row.get("updated_at"),
    })
}

/// Get a user by wallet address
pub async fn get_user_by_wallet(pool: &PgPool, wallet_address: &str) -> Result<Option<UserRow>, AppError> {
    let row = sqlx::query(
        r#"SELECT id, wallet_address, created_at, updated_at
           FROM users WHERE LOWER(wallet_address) = LOWER($1)"#
    )
    .bind(wallet_address)
    .fetch_optional(pool)
    .await
    .map_err(|e| AppError::DatabaseError(format!("DB query failed: {}", e)))?;

    Ok(row.map(|r| UserRow {
        id: r.get("id"),
        wallet_address: r.get("wallet_address"),
        created_at: r.get("created_at"),
        updated_at: r.get("updated_at"),
    }))
}

use sqlx::{postgres::PgPoolOptions, PgPool};
use crate::error::AppError;

/// Type alias for the PostgreSQL connection pool
pub type DbPool = PgPool;

/// Create a connection pool from the DATABASE_URL environment variable
pub async fn create_pool(database_url: &str) -> Result<DbPool, AppError> {
    let pool = PgPoolOptions::new()
        .max_connections(10)
        .min_connections(2)
        .acquire_timeout(std::time::Duration::from_secs(5))
        .connect(database_url)
        .await
        .map_err(|e| AppError::DatabaseError(format!("Failed to connect to database: {}", e)))?;

    tracing::info!("Database connection pool established (max=10 connections)");
    Ok(pool)
}

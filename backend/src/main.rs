mod auth;
mod blockchain;
mod config;
mod db;
mod error;
mod indexer;
mod middleware;
mod models;
mod routes;

use std::net::SocketAddr;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use auth::AuthStore;
use blockchain::BlockchainClient;
use config::Config;
use db::DbPool;

#[derive(Clone)]
pub struct AppState {
    pub config: Config,
    pub client: BlockchainClient,
    pub auth_store: AuthStore,
    pub db: DbPool,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // 1. Initialize logging
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "backend=info,tower_http=info".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    tracing::info!("=================================================");
    tracing::info!("Starting TrustChain Axum Backend & Sepolia Node");
    tracing::info!("=================================================");

    // 2. Load configuration
    let config = Config::from_env();
    tracing::info!("Sepolia RPC URL: {}", config.sepolia_rpc_url);
    tracing::info!("RoleManager Address: {}", config.role_manager_address);
    tracing::info!("IdentityRegistry Address: {}", config.identity_registry_address);
    tracing::info!("AssetRegistry Address: {}", config.asset_registry_address);
    tracing::info!("Database URL: {}", config.database_url.split('@').last().unwrap_or("configured"));

    // 3. Connect to PostgreSQL
    let db_pool = db::pool::create_pool(&config.database_url).await?;
    tracing::info!("PostgreSQL connection pool established.");

    // 4. Connect to Sepolia contracts
    let client = BlockchainClient::new(&config)?;
    tracing::info!("Blockchain client connected successfully.");

    // 5. Initialize Auth Store
    let auth_store = AuthStore::new();

    // 6. Create App State (shared across all request handlers)
    let app_state = AppState {
        config: config.clone(),
        client,
        auth_store,
        db: db_pool.clone(),
    };

    // 7. Spawn blockchain event indexer (Phase 7) as a background task
    tracing::info!("Spawning blockchain event indexer...");
    indexer::spawn_indexer(config.clone(), db_pool);

    // 8. Build Router
    let app = routes::create_router(app_state);

    // 9. Bind Server
    let addr = SocketAddr::from(([0, 0, 0, 0], config.port));
    tracing::info!("Server listening on http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

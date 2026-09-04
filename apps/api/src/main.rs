mod indexer;
mod models;
mod routes;
mod storage;
mod verifier;

use axum::{
    routing::{get, post},
    Router,
};
use indexer::AppState;
use std::net::SocketAddr;
use tower_http::cors::{Any, CorsLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() {
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let state = AppState::new_with_demo_data();

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/api/health", get(routes::health_handler))
        .route("/api/identities", get(routes::list_identities))
        .route("/api/identities/:did", get(routes::get_identity))
        .route("/api/schemas", get(routes::list_schemas))
        .route("/api/schemas/:id", get(routes::get_schema))
        .route("/api/assets", get(routes::list_assets))
        .route("/api/assets/:id", get(routes::get_asset))
        .route("/api/assets/issue", post(routes::issue_asset_api))
        .route("/api/assets/revoke", post(routes::revoke_asset_api))
        .route("/api/verify", post(routes::verify_handler))
        .route("/api/simulate-tamper", post(routes::simulate_tamper_handler))
        .route("/api/audit-logs", get(routes::list_audit_logs))
        .layer(cors)
        .with_state(state);

    let port: u16 = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(3001);

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    tracing::info!("🚀 TrustChain Rust Backend & Indexer running on http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

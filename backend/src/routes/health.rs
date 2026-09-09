use axum::{extract::State, Json};
use crate::models::HealthResponse;
use crate::AppState;

pub async fn health_check(State(_state): State<AppState>) -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok".to_string(),
        service: "trustchain-backend".to_string(),
        network: "Ethereum Sepolia Testnet".to_string(),
        chain_id: 11155111,
        db: "ok".to_string(),
        rpc_latency_ms: 0,
    })
}

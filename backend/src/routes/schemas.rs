use axum::{
    extract::{Path, State},
    Json,
};
use crate::error::AppError;
use crate::models::SchemaRecord;
use crate::AppState;

pub async fn get_schema(
    State(state): State<AppState>,
    Path(schema_id): Path<String>,
) -> Result<Json<SchemaRecord>, AppError> {
    let schema = state.client.get_schema(&schema_id).await?;
    Ok(Json(schema))
}

pub async fn list_standard_schemas(
    State(state): State<AppState>,
) -> Result<Json<Vec<SchemaRecord>>, AppError> {
    let ids = state
        .client
        .get_all_schema_ids()
        .await
        .unwrap_or_else(|_| {
            vec![
                "DEFENSE_EQUIPMENT_V1".to_string(),
                "SECURITY_CLEARANCE_V1".to_string(),
                "CERTIFICATE_V1".to_string(),
                "SOFTWARE_LICENSE_V1".to_string(),
                "LAND_TITLE_V1".to_string(),
            ]
        });

    let mut list = Vec::new();
    for id in ids {
        if let Ok(record) = state.client.get_schema(&id).await {
            list.push(record);
        }
    }

    Ok(Json(list))
}

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum IdentityStatus {
    ACTIVE,
    SUSPENDED,
    REVOKED,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IdentityRecord {
    pub did: String,
    pub controller: String,
    pub public_key: String,
    pub status: IdentityStatus,
    pub created_at: String,
    pub updated_at: String,
    pub metadata_uri: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoleRecord {
    pub account: String,
    pub role: String,
    pub granted_by: String,
    pub granted_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SchemaRecord {
    pub schema_id: String,
    pub name: String,
    pub schema_uri: String,
    pub schema_hash: String,
    pub version: String,
    pub author: String,
    pub is_active: bool,
    pub registered_at: String,
    pub json_schema: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum AssetStatus {
    ACTIVE,
    SUSPENDED,
    REVOKED,
    EXPIRED,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AssetRecord {
    pub token_id: u64,
    pub asset_type: String,
    pub schema_id: String,
    pub credential_hash: String,
    pub owner_did: String,
    pub owner_address: String,
    pub issuer_did: String,
    pub issuer_address: String,
    pub issued_at: String,
    pub expires_at: Option<String>,
    pub status: AssetStatus,
    pub is_transferable: bool,
    pub metadata_uri: String,
    pub credential_data: Option<serde_json::Value>,
    pub signature: Option<String>,
    pub tx_hash: String,
    pub block_number: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuditEvent {
    pub id: String,
    pub event_type: String,
    pub actor: String,
    pub actor_role: String,
    pub target_did: Option<String>,
    pub token_id: Option<u64>,
    pub tx_hash: String,
    pub block_number: u64,
    pub timestamp: String,
    pub details: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VerifyRequest {
    pub token_id: Option<u64>,
    pub credential_json: Option<serde_json::Value>,
    pub expected_hash: Option<String>,
    pub signature: Option<String>,
    pub issuer_public_key: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProofCheckStep {
    pub name: String,
    pub passed: bool,
    pub message: String,
    pub details: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VerifyResponse {
    pub is_valid: bool,
    pub overall_status: String, // "VALID", "INVALID", "REVOKED", "EXPIRED", "SCHEMA_MISMATCH", "SIGNATURE_FAILED"
    pub token_id: Option<u64>,
    pub computed_hash: String,
    pub on_chain_hash: Option<String>,
    pub issuer_did: Option<String>,
    pub owner_did: Option<String>,
    pub checks: Vec<ProofCheckStep>,
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TamperCheckRequest {
    pub token_id: u64,
    pub modified_field: String,
    pub tampered_value: serde_json::Value,
}

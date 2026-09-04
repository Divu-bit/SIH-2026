use crate::models::{
    AssetRecord, AssetStatus, AuditEvent, IdentityRecord, IdentityStatus, RoleRecord, SchemaRecord,
};
use crate::storage::StorageManager;
use chrono::Utc;
use std::sync::{Arc, RwLock};

#[derive(Clone)]
pub struct AppState {
    pub identities: Arc<RwLock<Vec<IdentityRecord>>>,
    pub roles: Arc<RwLock<Vec<RoleRecord>>>,
    pub schemas: Arc<RwLock<Vec<SchemaRecord>>>,
    pub assets: Arc<RwLock<Vec<AssetRecord>>>,
    pub audit_logs: Arc<RwLock<Vec<AuditEvent>>>,
}

impl AppState {
    pub fn new_with_demo_data() -> Self {
        let now = Utc::now().to_rfc3339();

        // 1. Initial Identities
        let admin_did = "did:trustchain:0x2cb4f72907b1ec202a2f751da0286aa9ee2e3b33".to_string();
        let manager_did = "did:trustchain:0x70997970c51812dc3a010c7d01b50e0d17dc79c8".to_string();
        let user_did = "did:trustchain:0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc".to_string();
        let auditor_did = "did:trustchain:0x90f79bf6eb2c4f870365e785982e1f101e93b906".to_string();

        let identities = vec![
            IdentityRecord {
                did: admin_did.clone(),
                controller: "0x2cb4f72907B1EC202a2f751Da0286aa9Ee2E3b33".to_string(),
                public_key: "0x04a3f97ab35ea35a71c82a3b1a445ccc7cebc71cc0d00b6258a098d49186daf50aa7af1eda116abc524aca537bd59ec331ea3eda92bfd20c004fda3cd54a5ade93".to_string(),
                status: IdentityStatus::ACTIVE,
                created_at: now.clone(),
                updated_at: now.clone(),
                metadata_uri: "ipfs://QmAdminProfile".to_string(),
            },
            IdentityRecord {
                did: manager_did.clone(),
                controller: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8".to_string(),
                public_key: "0x042f4c9c1b97940e79ecb001a1c4b4d667c3b2f567b5e40e69b596e216e8b22cf8b0e6df2f42a198c767425121b6d19f6a19f2430268cf89634e068097d62095f9".to_string(),
                status: IdentityStatus::ACTIVE,
                created_at: now.clone(),
                updated_at: now.clone(),
                metadata_uri: "ipfs://QmManagerProfile".to_string(),
            },
            IdentityRecord {
                did: user_did.clone(),
                controller: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC".to_string(),
                public_key: "0x041b12b591fa7419f4a0c8b25f0e9f1a0b3c66872a0c66d2146f40b2f0a1205c0a3f651628dcbe3f07a9b6c1647fcf4b216f4618e7e238cb090b8f04265492d6e3".to_string(),
                status: IdentityStatus::ACTIVE,
                created_at: now.clone(),
                updated_at: now.clone(),
                metadata_uri: "ipfs://QmUserProfile".to_string(),
            },
            IdentityRecord {
                did: auditor_did.clone(),
                controller: "0x90F79bf6EB2c4f870365E785982E1f101E93b906".to_string(),
                public_key: "0x047c8f2b1d604e0e4c6bb09f123d90684bb5b2ca5f859ab0f0b704075871aa385b6b1b8e8c89c7c4f4d2f829f074d6c4493390c52eb8c823053bb09a25b1cb".to_string(),
                status: IdentityStatus::ACTIVE,
                created_at: now.clone(),
                updated_at: now.clone(),
                metadata_uri: "ipfs://QmAuditorProfile".to_string(),
            },
        ];

        // 2. Roles
        let roles = vec![
            RoleRecord {
                account: "0x2cb4f72907B1EC202a2f751Da0286aa9Ee2E3b33".to_string(),
                role: "ADMIN".to_string(),
                granted_by: "GENESIS".to_string(),
                granted_at: now.clone(),
            },
            RoleRecord {
                account: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8".to_string(),
                role: "MANAGER".to_string(),
                granted_by: "0x2cb4f72907B1EC202a2f751Da0286aa9Ee2E3b33".to_string(),
                granted_at: now.clone(),
            },
            RoleRecord {
                account: "0x90F79bf6EB2c4f870365E785982E1f101E93b906".to_string(),
                role: "AUDITOR".to_string(),
                granted_by: "0x2cb4f72907B1EC202a2f751Da0286aa9Ee2E3b33".to_string(),
                granted_at: now.clone(),
            },
            RoleRecord {
                account: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC".to_string(),
                role: "USER".to_string(),
                granted_by: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8".to_string(),
                granted_at: now.clone(),
            },
        ];

        // 3. Schemas
        let cert_schema_json: serde_json::Value = serde_json::from_str(include_str!(
            "../../../packages/schemas/certificate_v1.json"
        ))
        .unwrap_or(serde_json::json!({}));

        let license_schema_json: serde_json::Value = serde_json::from_str(include_str!(
            "../../../packages/schemas/software_license_v1.json"
        ))
        .unwrap_or(serde_json::json!({}));

        let land_schema_json: serde_json::Value = serde_json::from_str(include_str!(
            "../../../packages/schemas/land_title_v1.json"
        ))
        .unwrap_or(serde_json::json!({}));

        let schemas = vec![
            SchemaRecord {
                schema_id: "CERTIFICATE_V1".to_string(),
                name: "Academic & Professional Certification".to_string(),
                schema_uri: "ipfs://QmCertificateSchemaV1".to_string(),
                schema_hash: StorageManager::compute_canonical_hash(&cert_schema_json),
                version: "1.0.0".to_string(),
                author: "0x2cb4f72907B1EC202a2f751Da0286aa9Ee2E3b33".to_string(),
                is_active: true,
                registered_at: now.clone(),
                json_schema: cert_schema_json,
            },
            SchemaRecord {
                schema_id: "SOFTWARE_LICENSE_V1".to_string(),
                name: "Enterprise Software License".to_string(),
                schema_uri: "ipfs://QmSoftwareLicenseSchemaV1".to_string(),
                schema_hash: StorageManager::compute_canonical_hash(&license_schema_json),
                version: "1.0.0".to_string(),
                author: "0x2cb4f72907B1EC202a2f751Da0286aa9Ee2E3b33".to_string(),
                is_active: true,
                registered_at: now.clone(),
                json_schema: license_schema_json,
            },
            SchemaRecord {
                schema_id: "LAND_TITLE_V1".to_string(),
                name: "Real Estate Deed & Land Title".to_string(),
                schema_uri: "ipfs://QmLandTitleSchemaV1".to_string(),
                schema_hash: StorageManager::compute_canonical_hash(&land_schema_json),
                version: "1.0.0".to_string(),
                author: "0x2cb4f72907B1EC202a2f751Da0286aa9Ee2E3b33".to_string(),
                is_active: true,
                registered_at: now.clone(),
                json_schema: land_schema_json,
            },
        ];

        // 4. Sample Assets & Anchored Credentials
        let sample_cert_json: serde_json::Value = serde_json::from_str(include_str!(
            "../../../packages/schemas/samples/sample_certificate.json"
        ))
        .unwrap_or(serde_json::json!({}));

        let sample_lic_json: serde_json::Value = serde_json::from_str(include_str!(
            "../../../packages/schemas/samples/sample_license.json"
        ))
        .unwrap_or(serde_json::json!({}));

        let sample_land_json: serde_json::Value = serde_json::from_str(include_str!(
            "../../../packages/schemas/samples/sample_land_title.json"
        ))
        .unwrap_or(serde_json::json!({}));

        let cert_hash = StorageManager::compute_canonical_hash(&sample_cert_json);
        let lic_hash = StorageManager::compute_canonical_hash(&sample_lic_json);
        let land_hash = StorageManager::compute_canonical_hash(&sample_land_json);

        let assets = vec![
            AssetRecord {
                token_id: 1,
                asset_type: "CERTIFICATE".to_string(),
                schema_id: "CERTIFICATE_V1".to_string(),
                credential_hash: cert_hash,
                owner_did: user_did.clone(),
                owner_address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC".to_string(),
                issuer_did: manager_did.clone(),
                issuer_address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8".to_string(),
                issued_at: now.clone(),
                expires_at: Some("2031-09-02T10:00:00Z".to_string()),
                status: AssetStatus::ACTIVE,
                is_transferable: false, // Soulbound academic credential
                metadata_uri: "ipfs://QmSampleCertificateNFT1".to_string(),
                credential_data: Some(sample_cert_json),
                signature: Some("0x7e3a9c402e...b9231f".to_string()),
                tx_hash: "0x4a9e223bfb28795c6418de7998634e35dfc554a9380963cb5df560731f50a8c2".to_string(),
                block_number: 10421,
            },
            AssetRecord {
                token_id: 2,
                asset_type: "SOFTWARE_LICENSE".to_string(),
                schema_id: "SOFTWARE_LICENSE_V1".to_string(),
                credential_hash: lic_hash,
                owner_did: user_did.clone(),
                owner_address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC".to_string(),
                issuer_did: admin_did.clone(),
                issuer_address: "0x2cb4f72907B1EC202a2f751Da0286aa9Ee2E3b33".to_string(),
                issued_at: now.clone(),
                expires_at: Some("2028-09-01T08:30:00Z".to_string()),
                status: AssetStatus::ACTIVE,
                is_transferable: true,
                metadata_uri: "ipfs://QmSampleLicenseNFT2".to_string(),
                credential_data: Some(sample_lic_json),
                signature: Some("0x89b02a1ef...e834cc".to_string()),
                tx_hash: "0x892a01f7ccb839218e2049bf65d89304a9e223bfb28795c6418de7998634e35d".to_string(),
                block_number: 10450,
            },
            AssetRecord {
                token_id: 3,
                asset_type: "LAND_TITLE".to_string(),
                schema_id: "LAND_TITLE_V1".to_string(),
                credential_hash: land_hash,
                owner_did: "did:trustchain:0x70997970c51812dc3a010c7d01b50e0d17dc79c8".to_string(),
                owner_address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8".to_string(),
                issuer_did: admin_did.clone(),
                issuer_address: "0x2cb4f72907B1EC202a2f751Da0286aa9Ee2E3b33".to_string(),
                issued_at: now.clone(),
                expires_at: None,
                status: AssetStatus::ACTIVE,
                is_transferable: true,
                metadata_uri: "ipfs://QmSampleLandTitleNFT3".to_string(),
                credential_data: Some(sample_land_json),
                signature: Some("0x54afc901e...b192ea".to_string()),
                tx_hash: "0xc842189fb2049ea21798604921fb90492817ccba12984ea0194829fae10984ba".to_string(),
                block_number: 10488,
            },
        ];

        // 5. Audit Log Trail
        let audit_logs = vec![
            AuditEvent {
                id: "LOG-001".to_string(),
                event_type: "GenesisInitialized".to_string(),
                actor: "0x2cb4f72907B1EC202a2f751Da0286aa9Ee2E3b33".to_string(),
                actor_role: "ADMIN".to_string(),
                target_did: None,
                token_id: None,
                tx_hash: "0x011a8b3874620f4c91a0394857b29a8f4c938172948017420958172948172948".to_string(),
                block_number: 10000,
                timestamp: now.clone(),
                details: serde_json::json!({ "network": "Anvil / Testnet", "contracts": ["RoleManager", "IdentityRegistry", "SchemaRegistry", "AssetRegistry", "AssetNFT"] }),
            },
            AuditEvent {
                id: "LOG-002".to_string(),
                event_type: "RoleGranted".to_string(),
                actor: "0x2cb4f72907B1EC202a2f751Da0286aa9Ee2E3b33".to_string(),
                actor_role: "ADMIN".to_string(),
                target_did: Some(manager_did.clone()),
                token_id: None,
                tx_hash: "0x12a9bf8472948572948571938475839201948572948571928475839201948571".to_string(),
                block_number: 10100,
                timestamp: now.clone(),
                details: serde_json::json!({ "role": "MANAGER_ROLE", "grantee": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" }),
            },
            AuditEvent {
                id: "LOG-003".to_string(),
                event_type: "SchemaRegistered".to_string(),
                actor: "0x2cb4f72907B1EC202a2f751Da0286aa9Ee2E3b33".to_string(),
                actor_role: "ADMIN".to_string(),
                target_did: None,
                token_id: None,
                tx_hash: "0x23a0194857294857192847583920194857192847583920194857192847583920".to_string(),
                block_number: 10200,
                timestamp: now.clone(),
                details: serde_json::json!({ "schemaId": "CERTIFICATE_V1", "name": "Academic & Professional Certification" }),
            },
            AuditEvent {
                id: "LOG-004".to_string(),
                event_type: "AssetMinted".to_string(),
                actor: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8".to_string(),
                actor_role: "MANAGER".to_string(),
                target_did: Some(user_did.clone()),
                token_id: Some(1),
                tx_hash: "0x4a9e223bfb28795c6418de7998634e35dfc554a9380963cb5df560731f50a8c2".to_string(),
                block_number: 10421,
                timestamp: now.clone(),
                details: serde_json::json!({
                    "assetType": "CERTIFICATE",
                    "schemaId": "CERTIFICATE_V1",
                    "recipient": "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
                    "isSoulbound": true
                }),
            },
        ];

        Self {
            identities: Arc::new(RwLock::new(identities)),
            roles: Arc::new(RwLock::new(roles)),
            schemas: Arc::new(RwLock::new(schemas)),
            assets: Arc::new(RwLock::new(assets)),
            audit_logs: Arc::new(RwLock::new(audit_logs)),
        }
    }
}

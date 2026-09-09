use std::env;

#[derive(Debug, Clone)]
pub struct Config {
    pub port: u16,
    pub sepolia_rpc_url: String,
    pub database_url: String,
    // ── Phase 10: Auth ──────────────────────────────────────────────────────
    /// Backend signing wallet private key (hex, no 0x prefix). Used for
    /// issuing, revoking, and transferring assets on behalf of the platform.
    pub private_key: String,
    /// Secret used to sign + verify JWT tokens (min 32 bytes recommended)
    pub jwt_secret: String,
    /// JWT validity in seconds (default: 86400 = 24 hours)
    pub jwt_expiry_secs: u64,
    // ── Contract addresses ─────────────────────────────────────────────────
    pub role_manager_address: String,
    pub identity_registry_address: String,
    pub schema_registry_address: String,
    pub asset_nft_address: String,
    pub asset_registry_address: String,
    pub trust_paymaster_address: String,
}

impl Config {
    pub fn from_env() -> Self {
        // Load .env from root or current directory if available
        let _ = dotenvy::dotenv();
        let _ = dotenvy::from_filename("../.env");

        Self {
            port: env::var("PORT")
                .unwrap_or_else(|_| "3001".to_string())
                .parse()
                .expect("PORT must be a valid u16"),
            sepolia_rpc_url: env::var("SEPOLIA_RPC_URL")
                .unwrap_or_else(|_| "https://gateway.tenderly.co/public/sepolia".to_string()),
            database_url: env::var("DATABASE_URL")
                .unwrap_or_else(|_| "postgres://localhost/trustchain".to_string()),
            // Phase 10
            private_key: env::var("PRIVATE_KEY")
                .unwrap_or_else(|_| {
                    tracing::warn!("PRIVATE_KEY not set — write transactions will fail");
                    String::new()
                }),
            jwt_secret: env::var("JWT_SECRET")
                .unwrap_or_else(|_| "trustchain-dev-secret-change-in-production".to_string()),
            jwt_expiry_secs: env::var("JWT_EXPIRY_SECS")
                .unwrap_or_else(|_| "86400".to_string())
                .parse()
                .unwrap_or(86400),
            // Contracts
            role_manager_address: env::var("ROLE_MANAGER_ADDRESS")
                .unwrap_or_else(|_| "0xE1042c9Ba98BD841C363262b74F138545760F78D".to_string()),
            identity_registry_address: env::var("IDENTITY_REGISTRY_ADDRESS")
                .unwrap_or_else(|_| "0x1f7521c73fA6Ed8F1D062cC348995D780134b75D".to_string()),
            schema_registry_address: env::var("SCHEMA_REGISTRY_ADDRESS")
                .unwrap_or_else(|_| "0xE31Afcd77352eF8f8b6CE70E8FE9f5c5C5af46dF".to_string()),
            asset_nft_address: env::var("ASSET_NFT_ADDRESS")
                .unwrap_or_else(|_| "0x260B356FEC314f4EEF2e57734E2e468d90A7521E".to_string()),
            asset_registry_address: env::var("ASSET_REGISTRY_ADDRESS")
                .unwrap_or_else(|_| "0x6B1DA7720651B20C8Fc8BE5d845Ac8D645C9713A".to_string()),
            trust_paymaster_address: env::var("TRUST_PAYMASTER_ADDRESS")
                .unwrap_or_else(|_| "0xc5e88B4218069E95a22f41d09960f72e17618800".to_string()),
        }
    }
}

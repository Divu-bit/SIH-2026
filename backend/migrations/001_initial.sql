-- TrustChain Initial Database Migration
-- Phase 6: PostgreSQL Integration
-- These tables are indexed representations of blockchain state.
-- Blockchain is always the authoritative source of truth.

-- Users: wallet-to-application mapping
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address CHAR(42) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Identities: indexed copy of IdentityRegistry
CREATE TABLE IF NOT EXISTS identities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    did TEXT NOT NULL UNIQUE,
    controller_address CHAR(42) NOT NULL,
    status SMALLINT NOT NULL DEFAULT 0,   -- 0=ACTIVE,1=SUSPENDED,2=REVOKED
    metadata_uri TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- on-chain registration tx
    registration_tx TEXT
);

CREATE INDEX IF NOT EXISTS idx_identities_controller ON identities(controller_address);
CREATE INDEX IF NOT EXISTS idx_identities_did ON identities(did);

-- Schemas: indexed copy of SchemaRegistry
CREATE TABLE IF NOT EXISTS schemas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schema_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL DEFAULT '',
    schema_uri TEXT NOT NULL DEFAULT '',
    schema_hash TEXT NOT NULL DEFAULT '',
    version TEXT NOT NULL DEFAULT '',
    author_address CHAR(42) NOT NULL DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    transaction_hash TEXT,
    block_number BIGINT
);

CREATE INDEX IF NOT EXISTS idx_schemas_schema_id ON schemas(schema_id);
CREATE INDEX IF NOT EXISTS idx_schemas_is_active ON schemas(is_active);

-- Assets: indexed copy of AssetRegistry
CREATE TABLE IF NOT EXISTS assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_id BIGINT NOT NULL UNIQUE,
    asset_type TEXT NOT NULL DEFAULT '',
    schema_id TEXT NOT NULL DEFAULT '',
    credential_hash TEXT NOT NULL DEFAULT '',
    owner_did TEXT NOT NULL DEFAULT '',
    issuer_did TEXT NOT NULL DEFAULT '',
    issuer_address CHAR(42) NOT NULL DEFAULT '',
    nft_owner_address CHAR(42) NOT NULL DEFAULT '',
    issued_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    status SMALLINT NOT NULL DEFAULT 0, -- 0=ACTIVE,1=SUSPENDED,2=REVOKED,3=EXPIRED
    is_transferable BOOLEAN NOT NULL DEFAULT FALSE,
    metadata_uri TEXT NOT NULL DEFAULT '',
    transaction_hash TEXT,
    block_number BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assets_token_id ON assets(token_id);
CREATE INDEX IF NOT EXISTS idx_assets_owner_did ON assets(owner_did);
CREATE INDEX IF NOT EXISTS idx_assets_issuer_did ON assets(issuer_did);
CREATE INDEX IF NOT EXISTS idx_assets_schema_id ON assets(schema_id);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);

-- Blockchain Events: raw indexed events from all watched contracts
CREATE TABLE IF NOT EXISTS blockchain_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_address CHAR(42) NOT NULL,
    event_name TEXT NOT NULL,
    block_number BIGINT NOT NULL,
    transaction_hash TEXT NOT NULL,
    log_index INTEGER NOT NULL,
    block_timestamp TIMESTAMPTZ,
    event_data JSONB NOT NULL DEFAULT '{}',
    indexed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(transaction_hash, log_index)
);

CREATE INDEX IF NOT EXISTS idx_events_event_name ON blockchain_events(event_name);
CREATE INDEX IF NOT EXISTS idx_events_contract ON blockchain_events(contract_address);
CREATE INDEX IF NOT EXISTS idx_events_block_number ON blockchain_events(block_number);
CREATE INDEX IF NOT EXISTS idx_events_tx_hash ON blockchain_events(transaction_hash);

-- Auth Challenges: nonce store (mirrors in-memory AuthStore for persistence)
CREATE TABLE IF NOT EXISTS auth_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address CHAR(42) NOT NULL,
    nonce TEXT NOT NULL,
    message TEXT NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes')
);

CREATE INDEX IF NOT EXISTS idx_auth_challenges_wallet ON auth_challenges(wallet_address);

-- Transactions: audit log of backend-submitted or observed transactions
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_hash TEXT NOT NULL UNIQUE,
    from_address CHAR(42) NOT NULL,
    to_address CHAR(42),
    action TEXT NOT NULL, -- e.g. 'ISSUE_ASSET', 'TRANSFER_ASSET', 'REVOKE_ASSET'
    status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, CONFIRMED, FAILED
    block_number BIGINT,
    gas_used BIGINT,
    payload JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_hash ON transactions(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_transactions_from ON transactions(from_address);
CREATE INDEX IF NOT EXISTS idx_transactions_action ON transactions(action);

-- Indexer State: tracks last processed block for each watched contract
CREATE TABLE IF NOT EXISTS indexer_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_address CHAR(42) NOT NULL UNIQUE,
    contract_name TEXT NOT NULL,
    last_processed_block BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

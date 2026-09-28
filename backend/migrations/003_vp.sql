-- Phase VP: Verifiable Presentations
-- Holder pre-signs a presentation, verifier checks it anytime (no holder online required)

CREATE TABLE IF NOT EXISTS verifiable_presentations (
    vp_id           TEXT PRIMARY KEY,                        -- UUID v4
    token_id        BIGINT NOT NULL,
    credential_hash TEXT NOT NULL,                           -- 0x hex bytes32
    holder_address  TEXT NOT NULL,                           -- lowercase 0x...
    holder_did      TEXT NOT NULL,                           -- did:trustchain:0x...
    purpose         TEXT NOT NULL DEFAULT 'general',         -- job_application, etc.
    issued_at       BIGINT NOT NULL,                         -- unix seconds
    expires_at      BIGINT NOT NULL,                         -- unix seconds
    holder_signature TEXT NOT NULL,                          -- EIP-191 sig over the VP message
    vp_token        TEXT NOT NULL,                           -- backend-signed JWT (shareable)
    status          TEXT NOT NULL DEFAULT 'active',          -- active | revoked
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vp_holder_address ON verifiable_presentations(holder_address);
CREATE INDEX IF NOT EXISTS idx_vp_token_id       ON verifiable_presentations(token_id);
CREATE INDEX IF NOT EXISTS idx_vp_status         ON verifiable_presentations(status);

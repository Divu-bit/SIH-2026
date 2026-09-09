-- Phase 11: Mock IPFS metadata storage
CREATE TABLE IF NOT EXISTS metadata_store (
    id          TEXT PRIMARY KEY,
    uri         TEXT NOT NULL,                  -- "ipfs://mock/<uuid>"
    doc_type    TEXT NOT NULL DEFAULT 'generic',
    data        JSONB NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_metadata_store_doc_type ON metadata_store(doc_type);

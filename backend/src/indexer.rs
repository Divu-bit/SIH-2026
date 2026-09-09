/// Phase 7: Blockchain Event Indexer
///
/// Polls Sepolia for TrustChain contract events and writes them to PostgreSQL.
/// Event signatures are taken DIRECTLY from the deployed Solidity contracts.
///
/// Key rule: indexed string/bytes32 params become keccak256 hashes in topics
/// and CANNOT be decoded back to the original string. Only non-indexed params
/// are ABI-decodeable from the log data.

use alloy::{
    primitives::Address,
    providers::{Provider, ProviderBuilder, RootProvider},
    rpc::types::{Filter, Log},
    sol,
    sol_types::SolEvent,
    transports::http::Http,
};
use chrono::{DateTime, Utc};
use serde_json::json;
use std::{sync::Arc, time::Duration};
use sqlx::PgPool;

use crate::{
    config::Config,
    db::{asset, event as db_event, identity, schema as db_schema},
    error::AppError,
};

// ── Exact event definitions from deployed contracts ───────────────────────────
//
// IdentityRegistry.sol:
//   event IdentityCreated(string indexed did, address indexed controller, address indexed creator)
//   event ControllerProposed(string indexed did, address indexed currentController, address indexed proposedController)
//   event ControllerAccepted(string indexed did, address indexed oldController, address indexed newController)
//   event IdentityStatusChanged(string indexed did, IdentityStatus previousStatus, IdentityStatus newStatus, address indexed changedBy)
//
// SchemaRegistry.sol:
//   event SchemaRegistered(string indexed schemaId, bytes32 indexed schemaHash, string schemaUri, address indexed author)
//   event SchemaStatusChanged(string indexed schemaId, bool isActive, address indexed updatedBy)
//
// AssetRegistry.sol:
//   event AssetMinted(uint256 indexed tokenId, string indexed assetType, string indexed schemaId, address recipient, string ownerDID, bytes32 credentialHash, address issuer)
//   event AssetTransferred(uint256 indexed tokenId, address indexed from, address indexed to, string fromDID, string toDID)
//   event AssetRevoked(uint256 indexed tokenId, string reason, address indexed revokedBy)
//   event NFTOwnerSynced(uint256 indexed tokenId, address indexed oldOwner, address indexed newOwner)
//
// NOTE: Indexed strings become topic hashes. Non-indexed fields are decoded from data.
//       For AssetMinted: recipient, ownerDID, credentialHash, issuer are non-indexed → decodeable
//       For AssetTransferred: fromDID, toDID are non-indexed → decodeable
//       For SchemaStatusChanged: isActive is non-indexed → decodeable

sol! {
    // IdentityRegistry — all string fields are indexed (= topic hash, not decodeable)
    // We only get controller and creator addresses from topics
    event IdentityCreated(string indexed did, address indexed controller, address indexed creator);
    event ControllerProposed(string indexed did, address indexed currentController, address indexed proposedController);
    event ControllerAccepted(string indexed did, address indexed oldController, address indexed newController);
    event IdentityStatusChanged(string indexed did, uint8 previousStatus, uint8 newStatus, address indexed changedBy);

    // SchemaRegistry — schemaId and schemaHash are indexed, schemaUri is decodeable
    event SchemaRegistered(string indexed schemaId, bytes32 indexed schemaHash, string schemaUri, address indexed author);
    event SchemaStatusChanged(string indexed schemaId, bool isActive, address indexed updatedBy);

    // AssetRegistry — tokenId, assetType, schemaId indexed; recipient/ownerDID/credentialHash/issuer decodeable
    event AssetMinted(
        uint256 indexed tokenId,
        string  indexed assetType,
        string  indexed schemaId,
        address         recipient,
        string          ownerDID,
        bytes32         credentialHash,
        address         issuer
    );
    event AssetTransferred(
        uint256 indexed tokenId,
        address indexed from,
        address indexed to,
        string          fromDID,
        string          toDID
    );
    event AssetRevoked(uint256 indexed tokenId, string reason, address indexed revokedBy);
    event NFTOwnerSynced(uint256 indexed tokenId, address indexed oldOwner, address indexed newOwner);
}

/// Actual deployment block from contracts/broadcast/Deploy.s.sol/11155111/run-*.json (0xb18209)
const DEPLOYMENT_BLOCK: u64 = 11_633_161;

/// Max blocks per RPC batch (avoid timeouts on public RPC)
const BLOCKS_PER_BATCH: u64 = 500;

/// Polling interval in seconds (check for new blocks)
const POLL_INTERVAL_SECS: u64 = 30;

type SepoliaProvider = RootProvider<Http<reqwest::Client>>;

pub struct Indexer {
    provider: Arc<SepoliaProvider>,
    pool: PgPool,
    identity_registry_addr: Address,
    schema_registry_addr: Address,
    asset_registry_addr: Address,
}

impl Indexer {
    pub fn new(config: &Config, pool: PgPool) -> Result<Self, AppError> {
        let rpc_url = config
            .sepolia_rpc_url
            .parse()
            .map_err(|e| AppError::Internal(format!("Invalid RPC URL: {}", e)))?;

        let provider = Arc::new(ProviderBuilder::new().on_http(rpc_url));

        Ok(Self {
            provider,
            pool,
            identity_registry_addr: config
                .identity_registry_address
                .parse()
                .map_err(|e| AppError::Internal(format!("Bad identity registry addr: {}", e)))?,
            schema_registry_addr: config
                .schema_registry_address
                .parse()
                .map_err(|e| AppError::Internal(format!("Bad schema registry addr: {}", e)))?,
            asset_registry_addr: config
                .asset_registry_address
                .parse()
                .map_err(|e| AppError::Internal(format!("Bad asset registry addr: {}", e)))?,
        })
    }

    /// Main indexer loop — runs forever as a background Tokio task
    pub async fn run(self) {
        tracing::info!(
            "[Indexer] Starting. Deployment block={}, polling every {}s, batch={}",
            DEPLOYMENT_BLOCK, POLL_INTERVAL_SECS, BLOCKS_PER_BATCH
        );

        loop {
            if let Err(e) = self.poll_once().await {
                tracing::error!("[Indexer] Poll error: {}", e);
            }
            tokio::time::sleep(Duration::from_secs(POLL_INTERVAL_SECS)).await;
        }
    }

    async fn poll_once(&self) -> Result<(), AppError> {
        let latest_block = self
            .provider
            .get_block_number()
            .await
            .map_err(|e| AppError::BlockchainError(format!("get_block_number: {}", e)))?;

        let last_indexed = db_event::get_last_indexed_block(&self.pool).await?;
        let from_block = (last_indexed as u64 + 1).max(DEPLOYMENT_BLOCK);

        if from_block > latest_block {
            tracing::debug!("[Indexer] Up to date at block {}", latest_block);
            return Ok(());
        }

        let mut batch_from = from_block;
        while batch_from <= latest_block {
            let batch_to = (batch_from + BLOCKS_PER_BATCH - 1).min(latest_block);
            self.process_block_range(batch_from, batch_to).await?;
            batch_from = batch_to + 1;
        }

        Ok(())
    }

    async fn process_block_range(&self, from_block: u64, to_block: u64) -> Result<(), AppError> {
        let filter = Filter::new()
            .address(vec![
                self.identity_registry_addr,
                self.schema_registry_addr,
                self.asset_registry_addr,
            ])
            .from_block(from_block)
            .to_block(to_block);

        let logs = self
            .provider
            .get_logs(&filter)
            .await
            .map_err(|e| AppError::BlockchainError(format!("get_logs: {}", e)))?;

        if !logs.is_empty() {
            tracing::info!(
                "[Indexer] {} events in blocks {}..{}", logs.len(), from_block, to_block
            );
        } else {
            tracing::debug!("[Indexer] No events in blocks {}..{}", from_block, to_block);
        }

        for log in &logs {
            if let Err(e) = self.process_log(log).await {
                tracing::warn!("[Indexer] Skipped log: {}", e);
            }
        }

        Ok(())
    }

    async fn process_log(&self, log: &Log) -> Result<(), AppError> {
        let topics = log.topics();
        if topics.is_empty() {
            return Ok(());
        }

        let contract_address = format!("{:#x}", log.address());
        let block_number = log.block_number.unwrap_or(0) as i64;
        let tx_hash = log
            .transaction_hash
            .map(|h| format!("{:?}", h))
            .unwrap_or_default();
        let log_index = log.log_index.unwrap_or(0) as i32;
        let ts: Option<DateTime<Utc>> = None;

        let sig = topics[0];

        // ── IdentityRegistry events ──────────────────────────────────────────

        if sig == IdentityCreated::SIGNATURE_HASH {
            if let Ok(decoded) = IdentityCreated::decode_log(log.as_ref(), true) {
                // controller is indexed address → decodeable
                let controller = format!("{:#x}", decoded.controller);
                // creator is indexed address → decodeable
                let creator = format!("{:#x}", decoded.creator);
                // did is indexed string → topic[1] is keccak(did), NOT the original string
                // We cannot recover the did from the log alone.
                // We store what we know; the API always confirms from chain.
                let did_topic = format!("{:?}", topics.get(1).copied().unwrap_or_default());

                tracing::info!(
                    "[Indexer] IdentityCreated: controller={} creator={} did_hash={}",
                    controller, creator, &did_topic[..10]
                );

                // Store controller → we'll resolve DID from chain on next identity API call
                // For now, record the raw event with topic info
                db_event::insert_event(
                    &self.pool,
                    &contract_address,
                    "IdentityCreated",
                    block_number,
                    &tx_hash,
                    log_index,
                    ts,
                    json!({
                        "didHash": did_topic,
                        "controller": controller,
                        "creator": creator
                    }),
                ).await?;
            }
        } else if sig == ControllerAccepted::SIGNATURE_HASH {
            if let Ok(decoded) = ControllerAccepted::decode_log(log.as_ref(), true) {
                let old_controller = format!("{:#x}", decoded.oldController);
                let new_controller = format!("{:#x}", decoded.newController);
                let did_topic = format!("{:?}", topics.get(1).copied().unwrap_or_default());

                tracing::info!(
                    "[Indexer] ControllerAccepted: old={} new={}", old_controller, new_controller
                );

                db_event::insert_event(
                    &self.pool,
                    &contract_address,
                    "ControllerAccepted",
                    block_number,
                    &tx_hash,
                    log_index,
                    ts,
                    json!({
                        "didHash": did_topic,
                        "oldController": old_controller,
                        "newController": new_controller
                    }),
                ).await?;
            }
        } else if sig == IdentityStatusChanged::SIGNATURE_HASH {
            if let Ok(decoded) = IdentityStatusChanged::decode_log(log.as_ref(), true) {
                let changed_by = format!("{:#x}", decoded.changedBy);
                let prev_status = decoded.previousStatus;
                let new_status = decoded.newStatus;
                let did_topic = format!("{:?}", topics.get(1).copied().unwrap_or_default());

                tracing::info!(
                    "[Indexer] IdentityStatusChanged: status {}→{} by={}", prev_status, new_status, changed_by
                );

                db_event::insert_event(
                    &self.pool,
                    &contract_address,
                    "IdentityStatusChanged",
                    block_number,
                    &tx_hash,
                    log_index,
                    ts,
                    json!({
                        "didHash": did_topic,
                        "previousStatus": prev_status,
                        "newStatus": new_status,
                        "changedBy": changed_by
                    }),
                ).await?;
            }
        }

        // ── SchemaRegistry events ────────────────────────────────────────────

        else if sig == SchemaRegistered::SIGNATURE_HASH {
            if let Ok(decoded) = SchemaRegistered::decode_log(log.as_ref(), true) {
                // schemaId and schemaHash are indexed → hashes only
                // schemaUri is non-indexed → decodeable
                // author is indexed address → decodeable
                let schema_uri = decoded.schemaUri.clone();
                let author = format!("{:#x}", decoded.author);
                let schema_id_hash = format!("{:?}", topics.get(1).copied().unwrap_or_default());
                let schema_hash_bytes = decoded.schemaHash; // This is the actual hash from topic[2]? No — schemaHash is indexed bytes32, so it IS the value
                let schema_hash_hex = format!("0x{}", hex::encode(schema_hash_bytes));

                tracing::info!(
                    "[Indexer] SchemaRegistered: author={} uri={}", author, schema_uri
                );

                // We can upsert with schemaUri (decodeable) and author
                // schemaId is not recoverable from the log — use placeholder
                db_schema::upsert_schema(
                    &self.pool,
                    &schema_id_hash, // use the keccak hash as key until we hydrate from chain
                    "",
                    &schema_uri,
                    &schema_hash_hex,
                    "",
                    &author,
                    true,
                    Some(&tx_hash),
                    Some(block_number),
                ).await?;

                db_event::insert_event(
                    &self.pool,
                    &contract_address,
                    "SchemaRegistered",
                    block_number,
                    &tx_hash,
                    log_index,
                    ts,
                    json!({
                        "schemaIdHash": schema_id_hash,
                        "schemaHash": schema_hash_hex,
                        "schemaUri": schema_uri,
                        "author": author
                    }),
                ).await?;
            }
        } else if sig == SchemaStatusChanged::SIGNATURE_HASH {
            if let Ok(decoded) = SchemaStatusChanged::decode_log(log.as_ref(), true) {
                let is_active = decoded.isActive;
                let updated_by = format!("{:#x}", decoded.updatedBy);
                let schema_id_hash = format!("{:?}", topics.get(1).copied().unwrap_or_default());

                tracing::info!(
                    "[Indexer] SchemaStatusChanged: active={} by={}", is_active, updated_by
                );

                db_event::insert_event(
                    &self.pool,
                    &contract_address,
                    "SchemaStatusChanged",
                    block_number,
                    &tx_hash,
                    log_index,
                    ts,
                    json!({
                        "schemaIdHash": schema_id_hash,
                        "isActive": is_active,
                        "updatedBy": updated_by
                    }),
                ).await?;
            }
        }

        // ── AssetRegistry events ─────────────────────────────────────────────

        else if sig == AssetMinted::SIGNATURE_HASH {
            if let Ok(decoded) = AssetMinted::decode_log(log.as_ref(), true) {
                // tokenId is indexed uint256 → decodeable from topic
                let token_id = decoded.tokenId.to::<u64>() as i64;
                // assetType and schemaId are indexed strings → hashes only, not recoverable
                // recipient, ownerDID, credentialHash, issuer are non-indexed → decodeable
                let recipient = format!("{:#x}", decoded.recipient);
                let owner_did = decoded.ownerDID.clone();
                let credential_hash = format!("0x{}", hex::encode(decoded.credentialHash));
                let issuer = format!("{:#x}", decoded.issuer);
                let asset_type_hash = format!("{:?}", topics.get(2).copied().unwrap_or_default());
                let schema_id_hash = format!("{:?}", topics.get(3).copied().unwrap_or_default());

                tracing::info!(
                    "[Indexer] AssetMinted: tokenId={} owner={} issuer={}", token_id, owner_did, issuer
                );

                // Upsert asset — we have ownerDID, issuerAddress, recipient, credentialHash
                // assetType and schemaId are not recoverable from the event alone
                asset::upsert_asset(
                    &self.pool,
                    token_id,
                    "", // assetType hash only — hydrate from chain on API call
                    "", // schemaId hash only — hydrate from chain on API call
                    &credential_hash,
                    &owner_did,
                    "", // issuerDID not in event — resolve via chain
                    &issuer,
                    &recipient, // NFT owner at mint = recipient
                    None,
                    None,
                    0,     // ACTIVE
                    false, // isTransferable — not in this event, defaults to false until sync
                    "",
                    Some(&tx_hash),
                    Some(block_number),
                ).await?;

                db_event::insert_event(
                    &self.pool,
                    &contract_address,
                    "AssetMinted",
                    block_number,
                    &tx_hash,
                    log_index,
                    ts,
                    json!({
                        "tokenId": token_id,
                        "assetTypeHash": asset_type_hash,
                        "schemaIdHash": schema_id_hash,
                        "recipient": recipient,
                        "ownerDID": owner_did,
                        "credentialHash": credential_hash,
                        "issuer": issuer
                    }),
                ).await?;
            }
        } else if sig == AssetTransferred::SIGNATURE_HASH {
            if let Ok(decoded) = AssetTransferred::decode_log(log.as_ref(), true) {
                let token_id = decoded.tokenId.to::<u64>() as i64;
                let from_addr = format!("{:#x}", decoded.from);
                let to_addr = format!("{:#x}", decoded.to);
                // fromDID and toDID are non-indexed → decodeable
                let from_did = decoded.fromDID.clone();
                let to_did = decoded.toDID.clone();

                tracing::info!(
                    "[Indexer] AssetTransferred: tokenId={} from={} to={}", token_id, from_did, to_did
                );

                // Update NFT owner and ownerDID
                asset::upsert_asset(
                    &self.pool,
                    token_id,
                    "", "", "", &to_did, "", "", &to_addr,
                    None, None, 0, false, "",
                    Some(&tx_hash), Some(block_number),
                ).await?;

                db_event::insert_event(
                    &self.pool,
                    &contract_address,
                    "AssetTransferred",
                    block_number,
                    &tx_hash,
                    log_index,
                    ts,
                    json!({
                        "tokenId": token_id,
                        "from": from_addr,
                        "to": to_addr,
                        "fromDID": from_did,
                        "toDID": to_did
                    }),
                ).await?;
            }
        } else if sig == AssetRevoked::SIGNATURE_HASH {
            if let Ok(decoded) = AssetRevoked::decode_log(log.as_ref(), true) {
                let token_id = decoded.tokenId.to::<u64>() as i64;
                // reason is non-indexed → decodeable
                let reason = decoded.reason.clone();
                let revoked_by = format!("{:#x}", decoded.revokedBy);

                tracing::info!(
                    "[Indexer] AssetRevoked: tokenId={} by={}", token_id, revoked_by
                );

                asset::update_asset_status(&self.pool, token_id, 2).await?; // 2 = REVOKED

                db_event::insert_event(
                    &self.pool,
                    &contract_address,
                    "AssetRevoked",
                    block_number,
                    &tx_hash,
                    log_index,
                    ts,
                    json!({
                        "tokenId": token_id,
                        "reason": reason,
                        "revokedBy": revoked_by
                    }),
                ).await?;
            }
        } else if sig == NFTOwnerSynced::SIGNATURE_HASH {
            if let Ok(decoded) = NFTOwnerSynced::decode_log(log.as_ref(), true) {
                let token_id = decoded.tokenId.to::<u64>() as i64;
                let old_owner = format!("{:#x}", decoded.oldOwner);
                let new_owner = format!("{:#x}", decoded.newOwner);

                tracing::info!(
                    "[Indexer] NFTOwnerSynced: tokenId={} old={} new={}", token_id, old_owner, new_owner
                );

                asset::update_nft_owner(&self.pool, token_id, &new_owner).await?;

                db_event::insert_event(
                    &self.pool,
                    &contract_address,
                    "NFTOwnerSynced",
                    block_number,
                    &tx_hash,
                    log_index,
                    ts,
                    json!({
                        "tokenId": token_id,
                        "oldOwner": old_owner,
                        "newOwner": new_owner
                    }),
                ).await?;
            }
        }
        // ControllerProposed — track but no DB update needed
        else if sig == ControllerProposed::SIGNATURE_HASH {
            if let Ok(decoded) = ControllerProposed::decode_log(log.as_ref(), true) {
                let proposed = format!("{:#x}", decoded.proposedController);
                tracing::info!("[Indexer] ControllerProposed: proposed={}", proposed);

                db_event::insert_event(
                    &self.pool,
                    &contract_address,
                    "ControllerProposed",
                    block_number,
                    &tx_hash,
                    log_index,
                    ts,
                    json!({ "proposedController": proposed }),
                ).await?;
            }
        }
        // Unknown events — silently skip

        Ok(())
    }
}

/// Spawn the indexer as a background Tokio task
pub fn spawn_indexer(config: Config, pool: PgPool) {
    tokio::spawn(async move {
        match Indexer::new(&config, pool) {
            Ok(indexer) => indexer.run().await,
            Err(e) => tracing::error!("[Indexer] Failed to create: {}", e),
        }
    });
}

use k256::ecdsa::{RecoveryId, Signature, VerifyingKey};
use sha3::{Digest, Keccak256};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::{SystemTime, UNIX_EPOCH};

use crate::error::AppError;

#[derive(Clone, Default)]
pub struct AuthStore {
    // Nonce store: address (lowercase) -> nonce
    nonces: Arc<Mutex<HashMap<String, String>>>,
}

impl AuthStore {
    pub fn new() -> Self {
        Self {
            nonces: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn generate_challenge(&self, address: &str) -> (String, String) {
        let nonce_val: u128 = rand::random();
        let nonce = format!("{:x}", nonce_val);
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();

        let message = format!(
            "Sign this message to authenticate with TrustChain:\nWallet: {}\nNonce: {}\nTimestamp: {}",
            address.to_lowercase(),
            nonce,
            timestamp
        );

        let mut map = self.nonces.lock().unwrap();
        map.insert(address.to_lowercase(), message.clone());

        (nonce, message)
    }

    pub fn verify_signature(
        &self,
        address: &str,
        signature_hex: &str,
    ) -> Result<bool, AppError> {
        let addr_clean = address.to_lowercase();
        let expected_message = {
            let map = self.nonces.lock().unwrap();
            map.get(&addr_clean)
                .cloned()
                .ok_or_else(|| AppError::Unauthorized("No active challenge found for address. Request challenge first.".to_string()))?
        };

        // Construct Ethereum prefix
        let eth_prefix = format!("\x19Ethereum Signed Message:\n{}", expected_message.len());
        let mut hasher = Keccak256::new();
        hasher.update(eth_prefix.as_bytes());
        hasher.update(expected_message.as_bytes());
        let msg_hash = hasher.finalize();

        // Parse hex signature
        let sig_bytes = hex::decode(signature_hex.trim_start_matches("0x"))
            .map_err(|e| AppError::BadRequest(format!("Invalid signature hex: {}", e)))?;

        if sig_bytes.len() != 65 {
            return Err(AppError::BadRequest("Signature must be 65 bytes".to_string()));
        }

        let mut r_s = [0u8; 64];
        r_s.copy_from_slice(&sig_bytes[..64]);

        let v = sig_bytes[64];
        let recovery_byte = if v >= 27 { v - 27 } else { v };

        let signature = Signature::from_bytes(&r_s.into())
            .map_err(|e| AppError::BadRequest(format!("Invalid signature format: {}", e)))?;

        let recovery_id = RecoveryId::from_byte(recovery_byte)
            .ok_or_else(|| AppError::BadRequest("Invalid v value in signature".to_string()))?;

        let verifying_key = VerifyingKey::recover_from_prehash(&msg_hash, &signature, recovery_id)
            .map_err(|e| AppError::Unauthorized(format!("Signature verification failed: {}", e)))?;

        let uncompressed_pub = verifying_key.to_encoded_point(false);
        let pub_bytes = &uncompressed_pub.as_bytes()[1..]; // Remove 0x04 prefix

        let mut keccak = Keccak256::new();
        keccak.update(pub_bytes);
        let recovered_hash = keccak.finalize();
        let recovered_addr_bytes = &recovered_hash[12..];
        let recovered_addr = format!("0x{}", hex::encode(recovered_addr_bytes));

        if recovered_addr.to_lowercase() == addr_clean {
            // Remove used nonce to prevent replay
            let mut map = self.nonces.lock().unwrap();
            map.remove(&addr_clean);
            Ok(true)
        } else {
            Err(AppError::Unauthorized(format!(
                "Signature signer mismatch. Recovered: {}, Expected: {}",
                recovered_addr, addr_clean
            )))
        }
    }
}

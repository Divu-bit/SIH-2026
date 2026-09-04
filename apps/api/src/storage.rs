use sha3::{Digest, Keccak256};
use serde_json::Value;

pub struct StorageManager;

impl StorageManager {
    /// Computes deterministic canonical Keccak256 hash of JSON payload
    pub fn compute_canonical_hash(json_val: &Value) -> String {
        let canonical_str = Self::canonicalize_json(json_val);
        let mut hasher = Keccak256::new();
        hasher.update(canonical_str.as_bytes());
        let result = hasher.finalize();
        format!("0x{}", hex::encode(result))
    }

    /// Sorts JSON keys deterministically
    pub fn canonicalize_json(json_val: &Value) -> String {
        match json_val {
            Value::Object(map) => {
                let mut entries: Vec<_> = map.iter().collect();
                entries.sort_by_key(|(k, _)| *k);
                let inner = entries
                    .into_iter()
                    .map(|(k, v)| format!("\"{}\":{}", k, Self::canonicalize_json(v)))
                    .collect::<Vec<_>>()
                    .join(",");
                format!("{{{}}}", inner)
            }
            Value::Array(arr) => {
                let inner = arr
                    .iter()
                    .map(|v| Self::canonicalize_json(v))
                    .collect::<Vec<_>>()
                    .join(",");
                format!("[{}]", inner)
            }
            Value::String(s) => serde_json::to_string(s).unwrap_or_else(|_| format!("\"{}\"", s)),
            Value::Number(n) => n.to_string(),
            Value::Bool(b) => b.to_string(),
            Value::Null => "null".to_string(),
        }
    }

    /// Simulates client-side encryption of sensitive PII before decentralized storage
    pub fn encrypt_credential_mock(raw_json: &Value) -> (String, String) {
        let serialized = raw_json.to_string();
        let enc_bytes: Vec<u8> = serialized.bytes().map(|b| b ^ 0x5A).collect();
        let cid = format!("Qm{}", hex::encode(&enc_bytes[..16.min(enc_bytes.len())]));
        let ciphertext = hex::encode(enc_bytes);
        (cid, ciphertext)
    }
}

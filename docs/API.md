# TrustChain SIH26125 - Backend API Reference

Base URL: `http://localhost:3001`

### Endpoints

#### 1. System Health
- **`GET /api/health`**
- Returns server status, features, and network configuration.

#### 2. Identity Management
- **`GET /api/identities`**: List all indexed DIDs and controllers.
- **`GET /api/identities/:did`**: Get specific DID document and public key.

#### 3. Schema Registry
- **`GET /api/schemas`**: List all registered W3C schemas (`CERTIFICATE_V1`, `SOFTWARE_LICENSE_V1`, `LAND_TITLE_V1`).
- **`GET /api/schemas/:id`**: Get JSON schema definition and hash.

#### 4. Asset Management
- **`GET /api/assets`**: List all minted digital asset records.
- **`GET /api/assets/:id`**: Get asset record and on-chain anchor details.
- **`POST /api/assets/issue`**: Issue and index a new digital asset NFT.
- **`POST /api/assets/revoke`**: Revoke an asset with justification.

#### 5. Cryptographic Proof Verification
- **`POST /api/verify`**
  - Payload: `{ "token_id": 1, "credential_json": { ... } }`
  - Returns: 6-layer cryptographic proof breakdown with validity status.

#### 6. Tamper Simulation
- **`POST /api/simulate-tamper`**
  - Payload: `{ "token_id": 1, "modified_field": "grade", "tampered_value": "Forged A+" }`
  - Returns: Diagnostic breakdown showing the exact hash mismatch.

#### 7. Audit Trail
- **`GET /api/audit-logs`**: Chronological queryable stream of smart contract state changes.

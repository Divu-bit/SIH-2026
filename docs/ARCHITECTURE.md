# TrustChain SIH26125 - Architecture & Technical Design

## 1. System Overview
The **TrustChain Decentralized Identity & Digital Asset Trust Platform** is a unified blockchain architecture designed for SIH 2026. It integrates **W3C-compliant Decentralized Identifiers (DIDs)**, **On-Chain Role-Based Access Control (RBAC)**, **ERC-721 Digital Asset NFTs**, **Cryptographic Credential Schemas**, **Rust/Axum Event Indexing**, and **ERC-4337 Account Abstraction (AA)** with **Zero-Auth Public Verification**.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           REACT + TYPESCRIPT WEB APP                            │
│  👑 Admin Portal  │  💼 Manager Portal  │  👤 User Vault  │  🛡️ Auditor Trail   │
│                 🔍 Public QR & Credential Proof Verifier                        │
└────────────────────────────────────────┬────────────────────────────────────────┘
                                         │
                    ┌────────────────────┴───────────────────┐
                    ▼                                        ▼
    ┌───────────────────────────────┐        ┌───────────────────────────────┐
    │     ERC-4337 SMART ACCOUNT    │        │      RUST AXUM API / INDEXER  │
    │  • UserOperation Builder      │        │  • Event Indexer & Log Stream │
    │  • TrustPaymaster Gas Sponsor │        │  • Cryptographic Proof Engine │
    │  • EOA Wallet Fallback        │        │  • Schema Registry Cache      │
    └───────────────┬───────────────┘        └───────────────▲───────────────┘
                    │                                        │ Events
                    ▼                                        │
┌────────────────────────────────────────────────────────────┴────────────────────┐
│                    SOLIDITY CORE SMART CONTRACTS (EVM / ANVIL)                  │
│                                                                                 │
│   ┌─────────────────────┐   ┌─────────────────────┐   ┌─────────────────────┐   │
│   │ IdentityRegistry.sol│   │   RoleManager.sol   │   │  SchemaRegistry.sol │   │
│   │ • DID ↔ Controller  │   │ • RBAC Permissions │   │ • Schema CIDs & Hash│   │
│   │ • Key Lifecycle     │   │ • Admin / Manager   │   │ • W3C Conformity    │   │
│   └──────────┬──────────┘   └──────────┬──────────┘   └──────────┬──────────┘   │
│              │                         │                         │              │
│              └─────────────────────────┼─────────────────────────┘              │
│                                        ▼                                        │
│                        ┌───────────────────────────────┐                        │
│                        │       AssetRegistry.sol       │                        │
│                        │  • Anchors Credential Hashes  │                        │
│                        │  • Binds Token ID to DID      │                        │
│                        │  • Enforces Revocation Policy │                        │
│                        └───────────────┬───────────────┘                        │
│                                        ▼                                        │
│                        ┌───────────────────────────────┐                        │
│                        │         AssetNFT.sol          │                        │
│                        │  • ERC-721 Unique Digital NFT │                        │
│                        │  • Soulbound / Transferable   │                        │
│                        └───────────────────────────────┘                        │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Architecture Pillars

### 2.1 Decentralized Identity (DID) Layer
- **Format**: `did:trustchain:0x<controllerAddress>` or `did:ethr:0x<controllerAddress>`
- **Decoupling**: Identity is distinct from wallet address. A user's DID is controlled by an EOA or an ERC-4337 Smart Account.
- **Key Rotation**: The DID controller can rotate verification keys without invalidating issued credentials.

### 2.2 On-Chain Role-Based Access Control (RBAC)
- **Roles**:
  - `DEFAULT_ADMIN_ROLE` (`ADMIN`): Authorizes identities, delegates roles, registers schemas.
  - `MANAGER_ROLE` (`MANAGER`): Issues verified digital assets, mints ERC-721 NFTs, revokes invalid credentials.
  - `AUDITOR_ROLE` (`AUDITOR`): Monitors real-time contract events and security alerts.
  - `USER_ROLE` (`USER`): Holds assets, presents credentials, executes transfers.
- **Enforcement**: Enforced strictly inside Solidity modifiers (`onlyManagerOrAdmin`, `onlyRole(ADMIN_ROLE)`).

### 2.3 Credential Schema & Cryptographic Anchoring
- **Universal Contract Rules**: Solidity enforces ownership, status, and permissions.
- **Asset-Specific Schemas**: JSON Schemas (`packages/schemas/`) define asset payload structures (`CERTIFICATE_V1`, `SOFTWARE_LICENSE_V1`, `LAND_TITLE_V1`).
- **Mathematical Anchor**: Canonical deterministic JSON -> Keccak-256 hash -> Anchored immutably on-chain in `AssetRegistry.sol`.

### 2.4 Cryptographic Verification Pipeline (Section 10)
```
1. Read Blockchain Asset (AssetRegistry.sol)
   ↓
2. Read Canonical Schema (SchemaRegistry.sol)
   ↓
3. Fetch Off-Chain Credential Payload
   ↓
4. Structural Schema Validation (JSONSchema)
   ↓
5. Deterministic Hash Recalculation (Keccak-256)
   ↓
6. Compare with On-Chain Anchor (Computed == OnChain ?)
   ↓
7. Verify Issuer Signature (ECDSA secp256k1)
   ↓
8. Check DID Controller Binding & NFT Ownership
   ↓
9. Check Lifecycle Status (ACTIVE vs REVOKED / EXPIRED)
   ↓
Result: [VALID / INVALID / REVOKED / EXPIRED]
```

### 2.5 Hybrid Account Abstraction (ERC-4337)
- **Phase A**: EOA fallback (MetaMask or private key).
- **Phase B**: `TrustSmartAccount.sol` provisioned with custom access policies and key rotation.
- **Phase C**: `TrustPaymaster.sol` sponsors gas fees for active DID holders.

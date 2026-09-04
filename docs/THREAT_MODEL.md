# TrustChain SIH26125 - Threat Model & Security Analysis

## 1. Security Design Principles
- **Solidity is Authoritative**: UI button hiding is UX, not security. Every restriction is checked at the EVM bytecode level.
- **Off-Chain Privacy + On-Chain Integrity**: Sensitive PII is encrypted and stored off-chain. Only cryptographic hashes and proofs are recorded on the ledger.
- **Proven Cryptography Only**: Standard Keccak-256 and ECDSA `secp256k1` primitives are used; no custom or unproven crypto.

---

## 2. STRIDE Threat Analysis Matrix

| Threat Category | Potential Vector | TrustChain Mitigation | Test in Foundry Suite |
| :--- | :--- | :--- | :--- |
| **Spoofing** | Attacker creates fake DID or impersonates issuer | DIDs bound to cryptographic controller addresses; ECDSA signature verification against registered issuer DID controller. | `IdentityRegistry.t.sol` |
| **Tampering** | Recipient alters grade, license seats, or property owner name | Deterministic Keccak-256 canonical hashing; any change produces a hash mismatch against on-chain anchor. | `SecurityMatrixTest.test_Security_TamperedCredential_Invalid` |
| **Repudiation** | Issuer denies issuing a revoked or fraudulent credential | Issuance is permanently recorded via `AssetMinted` event with issuer address and signature. | `AssetRegistry.t.sol` |
| **Information Disclosure** | Leak of student or citizen PII on public blockchain | Zero raw PII on-chain; only cryptographic hashes anchored; off-chain documents encrypted before storage. | `storage.rs` |
| **Denial of Service** | Gas exhaustion or spam attacks | Paymaster eligibility checks; transaction rate-limiting; EOA fallback allows continuous operation. | `TrustPaymaster.sol` |
| **Elevation of Privilege** | Non-admin attempts to grant roles or mint assets | Strict OpenZeppelin `AccessControl` modifiers (`onlyRole`, `onlyManagerOrAdmin`). | `SecurityMatrixTest.test_Security_NonAdminGrantsRole_Reverts` |

---

## 3. Section 15 Security Test Matrix Results

| Security Test | Expected Result | Foundry Test Status |
| :--- | :--- | :--- |
| **Non-admin grants role** | Transaction Reverts | ✅ PASS (`test_Security_NonAdminGrantsRole_Reverts`) |
| **Non-manager mints asset** | Transaction Reverts | ✅ PASS (`test_Security_NonManagerMints_Reverts`) |
| **Tampered credential payload** | Hash Mismatch -> INVALID | ✅ PASS (`test_Security_TamperedCredential_Invalid`) |
| **Unknown / Unregistered schema** | Transaction Reverts | ✅ PASS (`test_Security_UnknownSchema_Reverts`) |
| **Revoked DID interaction** | Action Rejected | ✅ PASS (`test_Security_RevokedDID_ActionRejected`) |
| **Revoked asset verification** | Status = REVOKED | ✅ PASS (`test_Security_RevokedAsset_NotValid`) |
| **Expired credential verification** | Status = EXPIRED | ✅ PASS (`test_Security_ExpiredCredential_Invalid`) |
| **Soulbound transfer attempt** | Transaction Reverts | ✅ PASS (`test_Security_NonTransferableAsset_TransferReverts`) |
| **Unauthorized controller rotation**| Transaction Reverts | ✅ PASS (`test_UnauthorizedControllerUpdateReverts`) |
| **Duplicate DID registration** | Transaction Reverts | ✅ PASS (`test_CannotRegisterDuplicateDID`) |

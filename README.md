# TrustChain (SIH26125) 🛡️
### Decentralized Identity, RBAC & Digital Asset Trust Platform
**Smart India Hackathon (SIH 2026)**

[![Solidity](https://img.shields.io/badge/Solidity-0.8.24-363636?logo=solidity)](https://soliditylang.org/)
[![Foundry](https://img.shields.io/badge/Foundry-passing-blue)](https://getfoundry.sh/)
[![Rust](https://img.shields.io/badge/Rust-Axum%20Tokio-orange?logo=rust)](https://www.rust-lang.org/)
[![React](https://img.shields.io/badge/React-18%20%2B%20Vite-61dafb?logo=react)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![ERC-4337](https://img.shields.io/badge/ERC--4337-Account%20Abstraction-8b5cf6)](https://eips.ethereum.org/EIPS/eip-4337)

---

## 📌 Problem Statement Overview
Organizations today rely heavily on centralized identity and access management systems, creating critical vulnerabilities like single points of failure, data breaches, identity theft, and untraceable digital asset ownership.

**TrustChain** solves this by delivering a unified, tamper-proof blockchain architecture integrating:
1. **Self-Sovereign Decentralized Identifiers (W3C DIDs)**
2. **On-Chain Role-Based Access Control (RBAC)** enforced in Solidity
3. **ERC-721 Verifiable Digital Asset NFTs** with anchored Keccak-256 hashes
4. **Rust + Axum Event Indexer & Cryptographic Proof Engine**
5. **ERC-4337 Account Abstraction** with Gasless Paymaster Sponsorship
6. **Zero-Authentication Public QR & Credential Proof Verification**

---

## 🚀 Quick Start (1-Click Run)

### Prerequisites
- Node.js (v18+)
- Foundry (`forge`, `anvil`)
- Rust / Cargo

### 1. Launch Web Application
```bash
cd apps/web
npm install
npm run dev
```
Open **http://localhost:5173** in your browser to experience the full platform with interactive Role Switcher, SIH Judge Demo Script, and Tamper Simulator!

### 2. Run Smart Contract Tests (Foundry)
```bash
cd contracts
forge test -vvv
```
*All 21/21 tests pass, including the complete 10-point Security Test Matrix!*

### 3. Run Rust Backend & Indexer
```bash
cd apps/api
cargo test
cargo run
```
*Server starts on http://localhost:3001 with live REST endpoints.*

---

## 🏛️ Repository Structure

```
SIH2026/
├── contracts/                     # Solidity smart contracts & Foundry suite
│   ├── src/
│   │   ├── IdentityRegistry.sol   # DID to Controller & Smart Account registry
│   │   ├── RoleManager.sol        # Admin, Manager, Auditor, User on-chain RBAC
│   │   ├── SchemaRegistry.sol     # W3C schema definitions & hash anchoring
│   │   ├── AssetNFT.sol           # ERC-721 Unique Digital Asset NFT
│   │   ├── AssetRegistry.sol      # Core asset lifecycle, status & revocation
│   │   └── AccountAbstraction/
│   │       ├── TrustSmartAccount.sol # ERC-4337 Smart Account
│   │       └── TrustPaymaster.sol    # Gas-sponsorship Paymaster
│   └── test/                      # 100% Passing Foundry security test matrix
│
├── packages/schemas/              # Canonical JSON schemas & test vectors
│   ├── certificate_v1.json        # Academic Certification Schema
│   ├── software_license_v1.json   # Enterprise Software License Schema
│   └── land_title_v1.json         # Real Estate Deed Schema
│
├── apps/
│   ├── api/                       # High-Performance Rust Axum backend & indexer
│   └── web/                       # Cyberpunk React + TypeScript Web Application
│
├── infra/                         # Docker Compose & startup scripts
└── docs/                          # Architecture, Threat Model, Judge Demo Script, API docs
```

---

## 🔒 Security Test Matrix (Page 6 of SIH Specification)

| Security Test Case | Expected Behavior | Status |
| :--- | :--- | :--- |
| Non-admin attempts to grant role | Transaction Reverts | ✅ PASS |
| Non-manager attempts to mint asset | Transaction Reverts | ✅ PASS |
| Tampered credential JSON payload | Hash mismatch -> INVALID | ✅ PASS |
| Unknown / Unregistered schema | Transaction Reverts | ✅ PASS |
| Action against revoked DID | Action Rejected | ✅ PASS |
| Verifying revoked asset | Status = REVOKED | ✅ PASS |
| Verifying expired credential | Status = EXPIRED | ✅ PASS |
| Transferring non-transferable soulbound | Transaction Reverts | ✅ PASS |
| Unauthorized controller rotation | Transaction Reverts | ✅ PASS |
| Duplicate DID registration attempt | Transaction Reverts | ✅ PASS |

---

## 🏆 What Makes It More Than an NFT Project?
- **Identity**: Who controls the identity? (*Self-Sovereign W3C DID*)
- **RBAC**: What is that identity authorized to do? (*Solidity RoleManager*)
- **Schema**: What structure does the credential follow? (*W3C Schema Registry*)
- **Signature**: Who issued and cryptographically authorized it? (*ECDSA secp256k1*)
- **Hash**: Has the content changed since issuance? (*Deterministic Keccak-256*)
- **NFT**: What unique on-chain token represents ownership? (*ERC-721*)
- **Audit**: What happened, when, and by whom? (*Immutable blockchain event stream*)
- **Verifier**: Can an independent party verify the proof chain without login? (*Public QR Verifier*)

---

## 👥 Team
- **Blockchain / Web3**: Smart Contracts, ERC-721, RBAC, DID Registry, AA
- **Backend / Systems**: Rust Axum, Alloy, Indexer, PostgreSQL, Cryptographic Verifier
- **Frontend / UX**: React, TypeScript, Vite, Tailwind CSS, QR Verification
- **Security / Architecture**: Threat Modeling, STRIDE analysis, Test Matrix

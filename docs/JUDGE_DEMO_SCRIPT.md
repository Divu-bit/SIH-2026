# SIH 2026 Judge Demo Script & Presentation Guide

## 1. Executive Pitch (60 Seconds)
> "Good morning, respected judges. Today, enterprises and governments rely on fragile centralized identity systems that suffer from data breaches, unauthorized access, and single points of failure.
> 
> We present **TrustChain (SIH26125)** — a unified decentralized trust platform combining:
> 1. **Self-Sovereign Decentralized Identifiers (W3C DIDs)**
> 2. **Solidity On-Chain Role-Based Access Control (RBAC)**
> 3. **ERC-721 Digital Asset NFTs with Anchored Cryptographic Hashes**
> 4. **Rust + Axum Event Indexing & Real-Time Verification Engine**
> 5. **ERC-4337 Account Abstraction with Gas-Sponsored Paymaster**
> 6. **Zero-Authentication Public QR Verification**
>
> Let's demonstrate the end-to-end lifecycle live!"

---

## 2. Step-by-Step Live Demo Execution

### Step 1: Admin Onboarding & Role Assignment
- **Action**: In the **Admin Portal**, create a new DID (`did:trustchain:0x7099...`) and assign `MANAGER_ROLE`.
- **Judge Talking Point**: *"Notice how RBAC is not just a UI check — it's recorded on-chain in `RoleManager.sol`."*

### Step 2: Manager Selects Schema & Issues Digital Asset
- **Action**: Switch to **Manager Portal**. Select the `CERTIFICATE_V1` schema template.
- **Action**: Enter student credentials (e.g. Rahul Kumar, Distinction with Honours). Click **Mint ERC-721 NFT**.
- **Judge Talking Point**: *"The system computes the deterministic Keccak-256 hash of the JSON payload, generates an ECDSA issuer signature, and mints an ERC-721 NFT directly bound to the student's DID."*

### Step 3: User Vault & Verifiable QR Code
- **Action**: Switch to **User Portal**. Inspect the newly minted digital certificate.
- **Action**: Show the dynamic Verifiable QR Code and export the W3C Verifiable Credential JSON.
- **Judge Talking Point**: *"The student holds true sovereign ownership of their academic credential on-chain, protected from unauthorized tampering."*

### Step 4: Public Verifier (100% Cryptographic Verification)
- **Action**: Open the **Public Verifier** tab.
- **Action**: Input Token #1 or scan the QR payload.
- **Result**: Visual 6-layer verification tree shows **VALID** with green checks on schema conformity, Keccak-256 hash match, ECDSA signature validity, and active lifecycle.

### Step 5: Security Failure Demo #1 — Payload Tampering
- **Action**: Switch to the **Security Simulator**.
- **Action**: Modify the grade from `Grade A+` to `Grade A+++ (Forged)`.
- **Action**: Click **Run Cryptographic Verification**.
- **Result**: Immediate **TAMPER DETECTED / INVALID** alert.
- **Judge Talking Point**: *"Because the on-chain anchor is mathematically immutable, any forgery in off-chain JSON produces an instant hash mismatch."*

### Step 6: Security Failure Demo #2 — On-Chain Revocation
- **Action**: Switch to **Manager Portal** and click **Revoke Asset** on Token #1 with reason *"Degree revoked for academic misconduct"*.
- **Action**: Re-verify in Public Verifier.
- **Result**: Status changes immediately to **REVOKED ON-CHAIN**.

### Step 7: Account Abstraction (ERC-4337)
- **Action**: Toggle **ERC-4337 Smart Account** mode.
- **Action**: Execute a transaction — show the UserOperation bundled and sponsored by `TrustPaymaster.sol` with **0.00 ETH gas fee paid by user**.

---

## 3. Answers to Tough Judge Questions

**Q1: What makes this more than just a standard NFT project?**
> *"A regular NFT only tracks an image URL and a wallet address. TrustChain is a complete trust protocol: it binds the NFT to a W3C DID, enforces on-chain RBAC roles, validates structural JSON schemas, and enables independent third parties to verify mathematical provenance without relying on our servers."*

**Q2: How do you handle private citizen data on a public blockchain?**
> *"We strictly adhere to zero on-chain PII. Sensitive documents are encrypted client-side before off-chain storage; only the cryptographic Keccak-256 hash and issuer signature are anchored on-chain."*

**Q3: What if the blockchain or Account Abstraction service goes down?**
> *"We implemented a hybrid architecture with an EOA fallback: if smart accounts or paymasters are unreachable, users can immediately interact via standard MetaMask/EOA transactions with zero downtime."*

# Web3 Wallet & Testnet Guide: Connecting & Generating Real Wallets

This guide explains how to connect **Real Web3 Wallets (MetaMask)**, switch to testnets (**Sepolia / Polygon Amoy**), generate **In-Browser Burner Wallets**, and deploy smart contracts without Docker.

---

## 🦊 Method 1: Connect Real MetaMask Wallet

1. **Install MetaMask**: Ensure MetaMask extension is installed in Chrome / Brave / Edge.
2. **Open the Web App**: Navigate to `http://localhost:5173`.
3. **Click the Wallet Button** in the top right navbar (displays your current address and network pill).
4. **Click "Connect" under Browser Wallet (MetaMask)**:
   - MetaMask will open a prompt asking you to connect your account.
   - Accept the connection.
5. **Switch Network**:
   - In the modal, select **Ethereum Sepolia** (Chain ID: 11155111) or **Polygon Amoy** (Chain ID: 80002).
   - MetaMask will automatically prompt to switch or add the network.

### Getting Free Testnet Tokens (Faucets):
- **Ethereum Sepolia ETH**:
  - [Google Cloud Sepolia Faucet](https://cloud.google.com/application/web3/faucet/ethereum/sepolia)
  - [Sepolia PoW Faucet](https://sepolia-faucet.pk910.de/)
  - [Infura Sepolia Faucet](https://www.infura.io/faucet/sepolia)
- **Polygon Amoy MATIC**:
  - [Polygon Faucet](https://faucet.polygon.technology/)

---

## ⚡ Method 2: In-Browser Cryptographic Keypair Generator (Zero Extension Required)

If judges or evaluators do not have MetaMask installed:
1. Click the **Wallet Button** in the top navbar.
2. Under **"In-Browser Cryptographic Test Wallet"**, click **"Generate New"**.
3. The platform generates a real, cryptographically valid **secp256k1 keypair**:
   - Computes your EVM address: `0x...`
   - Binds your W3C DID: `did:trustchain:0x...`
   - Provides your **Private Key** (with one-click copy button).
4. Every asset minting or revocation will sign real ECDSA cryptographic proofs using this key!

---

## 🚀 Deploying Smart Contracts to Sepolia / Amoy (No Docker Required)

You do **not** need Docker to deploy to testnets. Foundry runs natively:

### Deploy to Sepolia:
```bash
cd contracts

# Set your private key and Sepolia RPC
export PRIVATE_KEY="<your_private_key_with_0.1_sepolia_eth>"
export RPC_URL="https://rpc.sepolia.org"

# Run Foundry Deployment Script
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url $RPC_URL \
  --broadcast \
  --verify \
  -vvvv
```

### Deploy to Local Anvil Node:
```bash
# Terminal 1: Start Anvil local chain
anvil

# Terminal 2: Deploy in 1 second
cd contracts
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url http://127.0.0.1:8545 \
  --broadcast
```

---

## 🛠️ Architecture Summary (7-Day Compressed Plan)

| Component | Technology | Local Dev Command |
| :--- | :--- | :--- |
| **Local EVM Chain** | Foundry Anvil | `anvil` |
| **Smart Contracts** | Solidity + Foundry | `cd contracts && forge test` |
| **Backend & Indexer** | Rust + Tokio + Axum | `cd apps/api && cargo run` |
| **Frontend Web App** | React + Vite + Viem | `cd apps/web && npm run dev` |
| **Wallet Connector** | MetaMask / Viem | Injected EIP-1193 + In-Browser Burner |
| **Containerization** | **None Required** | Runs 100% natively on your machine |

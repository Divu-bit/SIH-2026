#!/usr/bin/env bash
set -e

echo "================================================================="
echo "  🚀 Starting TrustChain SIH26125 Full-Stack Demo Environment   "
echo "================================================================="

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "[1/4] Running Smart Contract Foundry Tests..."
cd "$ROOT_DIR/contracts"
forge test

echo "[2/4] Running Rust Axum Backend & Verifier Unit Tests..."
cd "$ROOT_DIR/apps/api"
cargo test

echo "[3/4] Building Frontend Production Asset Bundle..."
cd "$ROOT_DIR/apps/web"
npm run build

echo "[4/4] Starting Web App Dev Server on http://localhost:5173 ..."
npm run dev

#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if [ -f .env ]; then
  set -a
  source .env
  set +a
else
  echo "Error: .env file not found in $SCRIPT_DIR"
  exit 1
fi

RPC_URL="${SEPOLIA_RPC_URL:-https://ethereum-sepolia-rpc.publicnode.com}"
PRIVATE_KEY="${PRIVATE_KEY:-527e07820cab1011f326fa8f6dbdad69ece987c872b06e610842bd45a39dca0f}"
ADMIN_ADDR=$(cast wallet address --private-key "0x${PRIVATE_KEY#0x}")

echo "======================================================="
echo "  Testing TrustChain On-Chain Interactions on Sepolia  "
echo "======================================================="
echo "RPC URL:        $RPC_URL"
echo "Admin Address:  $ADMIN_ADDR"
echo "RoleManager:    $ROLE_MANAGER_ADDRESS"
echo "AssetRegistry:  $ASSET_REGISTRY_ADDRESS"

if [ -z "$ASSET_REGISTRY_ADDRESS" ]; then
  echo "Error: ASSET_REGISTRY_ADDRESS not set in .env. Please deploy first using ./deploy_sepolia.sh"
  exit 1
fi

forge script script/InteractSepolia.s.sol:InteractSepoliaScript \
  --rpc-url "$RPC_URL" \
  --broadcast \
  -vvv

echo "======================================================="
echo "Sepolia test completed."

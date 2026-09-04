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
echo "  Deploying TrustChain Contracts to Ethereum Sepolia   "
echo "======================================================="
echo "RPC URL:        $RPC_URL"
echo "Admin Address:  $ADMIN_ADDR"

BAL=$(cast balance "$ADMIN_ADDR" --rpc-url "$RPC_URL" 2>/dev/null || echo "0")
echo "Balance (wei):  $BAL"

if [ "$BAL" = "0" ]; then
  echo "WARNING: Balance is 0. Ensure $ADMIN_ADDR has Sepolia ETH."
fi

echo "Running forge deployment script with broadcast..."
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url "$RPC_URL" \
  --broadcast \
  -vvv

echo ""
echo "======================================================="
echo "Extracting Deployed Addresses from Broadcast Log..."
echo "======================================================="

BROADCAST_FILE=$(ls -t broadcast/Deploy.s.sol/11155111/run-latest.json 2>/dev/null || true)

if [ -n "$BROADCAST_FILE" ] && [ -f "$BROADCAST_FILE" ]; then
  echo "Latest broadcast log: $BROADCAST_FILE"
  
  ROLE_MGR=$(grep -A 2 '"RoleManager"' "$BROADCAST_FILE" | grep '"contractAddress"' | head -n 1 | awk -F'"' '{print $4}' || true)
  ID_REG=$(grep -A 2 '"IdentityRegistry"' "$BROADCAST_FILE" | grep '"contractAddress"' | head -n 1 | awk -F'"' '{print $4}' || true)
  SCHEMA_REG=$(grep -A 2 '"SchemaRegistry"' "$BROADCAST_FILE" | grep '"contractAddress"' | head -n 1 | awk -F'"' '{print $4}' || true)
  ASSET_NFT=$(grep -A 2 '"AssetNFT"' "$BROADCAST_FILE" | grep '"contractAddress"' | head -n 1 | awk -F'"' '{print $4}' || true)
  ASSET_REG=$(grep -A 2 '"AssetRegistry"' "$BROADCAST_FILE" | grep '"contractAddress"' | head -n 1 | awk -F'"' '{print $4}' || true)
  PAYMASTER=$(grep -A 2 '"TrustPaymaster"' "$BROADCAST_FILE" | grep '"contractAddress"' | head -n 1 | awk -F'"' '{print $4}' || true)

  echo "RoleManager:       $ROLE_MGR"
  echo "IdentityRegistry:  $ID_REG"
  echo "SchemaRegistry:    $SCHEMA_REG"
  echo "AssetNFT:          $ASSET_NFT"
  echo "AssetRegistry:     $ASSET_REG"
  echo "TrustPaymaster:    $PAYMASTER"

  # Update contracts/.env
  if [ -n "$ROLE_MGR" ]; then
    sed -i '' "s|^ROLE_MANAGER_ADDRESS=.*|ROLE_MANAGER_ADDRESS=$ROLE_MGR|" .env 2>/dev/null || sed -i "s|^ROLE_MANAGER_ADDRESS=.*|ROLE_MANAGER_ADDRESS=$ROLE_MGR|" .env
    sed -i '' "s|^IDENTITY_REGISTRY_ADDRESS=.*|IDENTITY_REGISTRY_ADDRESS=$ID_REG|" .env 2>/dev/null || sed -i "s|^IDENTITY_REGISTRY_ADDRESS=.*|IDENTITY_REGISTRY_ADDRESS=$ID_REG|" .env
    sed -i '' "s|^SCHEMA_REGISTRY_ADDRESS=.*|SCHEMA_REGISTRY_ADDRESS=$SCHEMA_REG|" .env 2>/dev/null || sed -i "s|^SCHEMA_REGISTRY_ADDRESS=.*|SCHEMA_REGISTRY_ADDRESS=$SCHEMA_REG|" .env
    sed -i '' "s|^ASSET_NFT_ADDRESS=.*|ASSET_NFT_ADDRESS=$ASSET_NFT|" .env 2>/dev/null || sed -i "s|^ASSET_NFT_ADDRESS=.*|ASSET_NFT_ADDRESS=$ASSET_NFT|" .env
    sed -i '' "s|^ASSET_REGISTRY_ADDRESS=.*|ASSET_REGISTRY_ADDRESS=$ASSET_REG|" .env 2>/dev/null || sed -i "s|^ASSET_REGISTRY_ADDRESS=.*|ASSET_REGISTRY_ADDRESS=$ASSET_REG|" .env
    sed -i '' "s|^TRUST_PAYMASTER_ADDRESS=.*|TRUST_PAYMASTER_ADDRESS=$PAYMASTER|" .env 2>/dev/null || sed -i "s|^TRUST_PAYMASTER_ADDRESS=.*|TRUST_PAYMASTER_ADDRESS=$PAYMASTER|" .env
    cp .env ../.env
    echo ".env files updated successfully."
  fi
fi

echo "======================================================="
echo "Deployment Finished."

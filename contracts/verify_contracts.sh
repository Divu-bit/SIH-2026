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

if [ -z "$ETHERSCAN_API_KEY" ]; then
  echo "Error: ETHERSCAN_API_KEY is not set in .env"
  exit 1
fi

echo "======================================================="
echo "   Verifying All TrustChain Contracts on Etherscan     "
echo "======================================================="
echo "RoleManager:       $ROLE_MANAGER_ADDRESS"
echo "IdentityRegistry:  $IDENTITY_REGISTRY_ADDRESS"
echo "SchemaRegistry:    $SCHEMA_REGISTRY_ADDRESS"
echo "AssetNFT:          $ASSET_NFT_ADDRESS"
echo "AssetRegistry:     $ASSET_REGISTRY_ADDRESS"
echo "TrustPaymaster:    $TRUST_PAYMASTER_ADDRESS"
echo "======================================================="

# 1. RoleManager
echo "Verifying RoleManager..."
forge verify-contract "$ROLE_MANAGER_ADDRESS" src/RoleManager.sol:RoleManager \
  --chain sepolia \
  --verifier etherscan \
  --etherscan-api-key "$ETHERSCAN_API_KEY" \
  --constructor-args $(cast abi-encode "constructor(address)" "$ADMIN_ADDRESS") \
  --watch || true

# 2. IdentityRegistry
echo "Verifying IdentityRegistry..."
forge verify-contract "$IDENTITY_REGISTRY_ADDRESS" src/IdentityRegistry.sol:IdentityRegistry \
  --chain sepolia \
  --verifier etherscan \
  --etherscan-api-key "$ETHERSCAN_API_KEY" \
  --constructor-args $(cast abi-encode "constructor(address)" "$ROLE_MANAGER_ADDRESS") \
  --watch || true

# 3. SchemaRegistry
echo "Verifying SchemaRegistry..."
forge verify-contract "$SCHEMA_REGISTRY_ADDRESS" src/SchemaRegistry.sol:SchemaRegistry \
  --chain sepolia \
  --verifier etherscan \
  --etherscan-api-key "$ETHERSCAN_API_KEY" \
  --constructor-args $(cast abi-encode "constructor(address)" "$ROLE_MANAGER_ADDRESS") \
  --watch || true

# 4. AssetNFT
echo "Verifying AssetNFT..."
forge verify-contract "$ASSET_NFT_ADDRESS" src/AssetNFT.sol:AssetNFT \
  --chain sepolia \
  --verifier etherscan \
  --etherscan-api-key "$ETHERSCAN_API_KEY" \
  --constructor-args $(cast abi-encode "constructor(address)" "$ADMIN_ADDRESS") \
  --watch || true

# 5. AssetRegistry
echo "Verifying AssetRegistry..."
forge verify-contract "$ASSET_REGISTRY_ADDRESS" src/AssetRegistry.sol:AssetRegistry \
  --chain sepolia \
  --verifier etherscan \
  --etherscan-api-key "$ETHERSCAN_API_KEY" \
  --constructor-args $(cast abi-encode "constructor(address,address,address,address)" "$ROLE_MANAGER_ADDRESS" "$IDENTITY_REGISTRY_ADDRESS" "$SCHEMA_REGISTRY_ADDRESS" "$ASSET_NFT_ADDRESS") \
  --watch || true

# 6. TrustPaymaster
echo "Verifying TrustPaymaster..."
forge verify-contract "$TRUST_PAYMASTER_ADDRESS" src/AccountAbstraction/TrustPaymaster.sol:TrustPaymaster \
  --chain sepolia \
  --verifier etherscan \
  --etherscan-api-key "$ETHERSCAN_API_KEY" \
  --constructor-args $(cast abi-encode "constructor(address,address)" "$IDENTITY_REGISTRY_ADDRESS" "$ADMIN_ADDRESS") \
  --watch || true

echo "======================================================="
echo "Verification process complete!"

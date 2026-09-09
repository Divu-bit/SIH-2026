// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/RoleManager.sol";
import "../src/IdentityRegistry.sol";
import "../src/SchemaRegistry.sol";
import "../src/AssetNFT.sol";
import "../src/AssetRegistry.sol";

contract InteractSepoliaScript is Script {
    function run() external {
        // SECURITY: Never hardcode private keys. Set PRIVATE_KEY in your environment:
        //   export PRIVATE_KEY=0x<your_key>   (or use a .env file listed in .gitignore)
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        address roleManagerAddr = vm.envAddress("ROLE_MANAGER_ADDRESS");
        address identityRegistryAddr = vm.envAddress("IDENTITY_REGISTRY_ADDRESS");
        address assetRegistryAddr = vm.envAddress("ASSET_REGISTRY_ADDRESS");

        console.log("=================================================");
        console.log("Interacting with TrustChain on Sepolia Testnet");
        console.log("Caller Address:", deployer);
        console.log("AssetRegistry:", assetRegistryAddr);
        console.log("=================================================");

        RoleManager roleManager = RoleManager(roleManagerAddr);
        IdentityRegistry identityRegistry = IdentityRegistry(identityRegistryAddr);
        AssetRegistry assetRegistry = AssetRegistry(assetRegistryAddr);

        // 1. Verify Roles
        bool isAdmin = roleManager.isAdmin(deployer);
        bool isManager = roleManager.isManager(deployer);
        console.log("Is Admin:", isAdmin);
        console.log("Is Manager:", isManager);
        require(isManager, "Deployer is not a manager on Sepolia!");

        // 2. Verify Identity
        string memory adminDID = string.concat("did:trustchain:", vm.toString(deployer));
        bool isValidCtrl = identityRegistry.isValidController(adminDID, deployer);
        console.log("Admin DID Active & Valid Controller:", isValidCtrl);
        require(isValidCtrl, "Admin DID is not active or valid on Sepolia!");

        // 3. Issue a Test Asset on Sepolia
        vm.startBroadcast(deployerPrivateKey);

        bytes32 testCredentialHash = keccak256(
            abi.encodePacked("SEPOLIA_TEST_ASSET_DEFENSE_RADAR_", block.timestamp)
        );

        AssetRegistry.IssueAssetParams memory params = AssetRegistry.IssueAssetParams({
            recipient: deployer,
            ownerDID: adminDID,
            issuerDID: adminDID,
            assetType: "DEFENSE_EQUIPMENT",
            schemaId: "DEFENSE_EQUIPMENT_V1",
            credentialHash: testCredentialHash,
            metadataUri: "ipfs://QmSepoliaTestAssetRadar001",
            expiresAt: block.timestamp + 365 days,
            isTransferable: true
        });

        uint256 tokenId = assetRegistry.issueAssetWithParams(params);
        console.log("SUCCESS! Test Asset Issued on Sepolia. Token ID:", tokenId);

        vm.stopBroadcast();

        // 4. Verify the asset on-chain
        (
            bool isValid,
            bool isHashMatch,
            bool isStatusActive,
            bool isNotExpired,
            bool isOwnerVerified,
            ,
        ) = assetRegistry.verifyAsset(tokenId, testCredentialHash);

        console.log("On-chain Asset Valid:", isValid);
        console.log("Hash Matches:", isHashMatch);
        console.log("Status Active:", isStatusActive);
        console.log("Not Expired:", isNotExpired);
        console.log("Owner Verified:", isOwnerVerified);
        require(isValid, "Asset verification failed on Sepolia!");

        console.log("=================================================");
        console.log("SEPOLIA TESTNET VERIFICATION COMPLETED SUCCESSFULLY!");
        console.log("=================================================");
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/RoleManager.sol";
import "../src/IdentityRegistry.sol";
import "../src/SchemaRegistry.sol";
import "../src/AssetNFT.sol";
import "../src/AssetRegistry.sol";
import "../src/AccountAbstraction/TrustSmartAccount.sol";
import "../src/AccountAbstraction/TrustPaymaster.sol";

contract DeployScript is Script {
    function run() external {
        // Load admin private key from environment or fallback to user's provided admin key
        uint256 deployerPrivateKey = vm.envOr(
            "PRIVATE_KEY",
            uint256(0x527e07820cab1011f326fa8f6dbdad69ece987c872b06e610842bd45a39dca0f)
        );
        address deployer = vm.addr(deployerPrivateKey);

        console.log("=================================================");
        console.log("Deploying TrustChain Contracts to Sepolia Testnet");
        console.log("Deployer Address:", deployer);
        console.log("Deployer Balance:", deployer.balance);
        console.log("=================================================");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy RoleManager
        RoleManager roleManager = new RoleManager(deployer);
        console.log("RoleManager:", address(roleManager));

        // Ensure deployer has manager privileges explicitly as well
        if (!roleManager.isManager(deployer)) {
            roleManager.assignRole(roleManager.MANAGER_ROLE(), deployer);
        }

        // 2. Deploy IdentityRegistry
        IdentityRegistry identityRegistry = new IdentityRegistry(address(roleManager));
        console.log("IdentityRegistry:", address(identityRegistry));

        // 3. Register Admin DID in IdentityRegistry
        string memory adminDID = string.concat("did:trustchain:", vm.toString(deployer));
        bytes memory adminPubKey = hex"04a3f97ab35ea35a71c82a3b1a445ccc7cebc71cc0d00b6258a098d49186daf50aa7af1eda116abc524aca537bd59ec331ea3eda92bfd20c004fda3cd54a5ade93";
        identityRegistry.registerIdentity(
            adminDID,
            deployer,
            adminPubKey,
            "ipfs://QmBELAdminDirectorateIdentity"
        );
        console.log("Admin Identity Registered with DID:", adminDID);

        // 4. Deploy SchemaRegistry
        SchemaRegistry schemaRegistry = new SchemaRegistry(address(roleManager));
        console.log("SchemaRegistry:", address(schemaRegistry));

        // 5. Deploy AssetNFT
        AssetNFT assetNFT = new AssetNFT(deployer);
        console.log("AssetNFT:", address(assetNFT));

        // 6. Deploy AssetRegistry
        AssetRegistry assetRegistry = new AssetRegistry(
            address(roleManager),
            address(identityRegistry),
            address(schemaRegistry),
            address(assetNFT)
        );
        console.log("AssetRegistry:", address(assetRegistry));

        // 7. Connect AssetNFT to AssetRegistry
        assetNFT.setAssetRegistry(address(assetRegistry));
        console.log("AssetNFT registry wired successfully.");

        // 8. Deploy Paymaster
        TrustPaymaster paymaster = new TrustPaymaster(address(identityRegistry), deployer);
        console.log("TrustPaymaster:", address(paymaster));

        // 9. Register standard schemas
        schemaRegistry.registerSchema(
            "DEFENSE_EQUIPMENT_V1",
            "Military Hardware & Tactical Radar Systems",
            "ipfs://QmBELDefenseEquipmentSchemaV1",
            keccak256("DEFENSE_EQUIPMENT_V1_SCHEMA_DEFINITION"),
            "1.0.0"
        );

        schemaRegistry.registerSchema(
            "SECURITY_CLEARANCE_V1",
            "Personnel Security Clearance & Defense Access Pass",
            "ipfs://QmMODSecurityClearanceSchemaV1",
            keccak256("SECURITY_CLEARANCE_V1_SCHEMA_DEFINITION"),
            "1.0.0"
        );

        schemaRegistry.registerSchema(
            "CERTIFICATE_V1",
            "Academic & Professional Certification",
            "ipfs://QmAcademicCertificateV1Schema",
            keccak256("CERTIFICATE_V1_SCHEMA_DEFINITION"),
            "1.0.0"
        );

        schemaRegistry.registerSchema(
            "SOFTWARE_LICENSE_V1",
            "Enterprise Software License",
            "ipfs://QmSoftwareLicenseV1Schema",
            keccak256("SOFTWARE_LICENSE_V1_SCHEMA_DEFINITION"),
            "1.0.0"
        );

        schemaRegistry.registerSchema(
            "LAND_TITLE_V1",
            "Real Estate Deed & Land Registry",
            "ipfs://QmLandTitleV1Schema",
            keccak256("LAND_TITLE_V1_SCHEMA_DEFINITION"),
            "1.0.0"
        );

        console.log("Standard schemas registered on-chain.");

        vm.stopBroadcast();

        console.log("=================================================");
        console.log("DEPLOYMENT COMPLETE! CONTRACT ADDRESSES:");
        console.log("ROLE_MANAGER_ADDRESS=", address(roleManager));
        console.log("IDENTITY_REGISTRY_ADDRESS=", address(identityRegistry));
        console.log("SCHEMA_REGISTRY_ADDRESS=", address(schemaRegistry));
        console.log("ASSET_NFT_ADDRESS=", address(assetNFT));
        console.log("ASSET_REGISTRY_ADDRESS=", address(assetRegistry));
        console.log("TRUST_PAYMASTER_ADDRESS=", address(paymaster));
        console.log("=================================================");
    }
}

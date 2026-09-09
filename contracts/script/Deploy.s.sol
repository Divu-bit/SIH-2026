// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/RoleManager.sol";
import "../src/IdentityRegistry.sol";
import "../src/SchemaRegistry.sol";
import "../src/AssetNFT.sol";
import "../src/AssetRegistry.sol";
import "../src/AccountAbstraction/TrustPaymaster.sol";

/**
 * @title DeployScript
 * @notice Deploys the full TrustChain core contract suite in dependency order.
 *
 * Deployment order:
 *   1. RoleManager
 *   2. IdentityRegistry
 *   3. SchemaRegistry
 *   4. AssetNFT
 *   5. AssetRegistry
 *   6. Wire AssetNFT ↔ AssetRegistry (two-step: propose → bootstrapAcceptNFT)
 *   7. TrustPaymaster
 *   8. Register admin DID
 *   9. Register standard schemas
 */
contract DeployScript is Script {
    function run() external {
        // SECURITY: Never hardcode private keys. Set PRIVATE_KEY in your environment:
        //   export PRIVATE_KEY=0x<your_key>   (or use a .env file listed in .gitignore)
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("=================================================");
        console.log("Deploying TrustChain Contracts");
        console.log("Deployer:", deployer);
        console.log("=================================================");

        vm.startBroadcast(deployerPrivateKey);

        // ── 1. RoleManager ──────────────────────────────────────────────────
        RoleManager roleManager = new RoleManager(deployer);
        console.log("RoleManager:", address(roleManager));

        // ── 2. IdentityRegistry ─────────────────────────────────────────────
        IdentityRegistry identityRegistry = new IdentityRegistry(address(roleManager));
        console.log("IdentityRegistry:", address(identityRegistry));

        // ── 3. SchemaRegistry ───────────────────────────────────────────────
        SchemaRegistry schemaRegistry = new SchemaRegistry(address(roleManager));
        console.log("SchemaRegistry:", address(schemaRegistry));

        // ── 4. AssetNFT ─────────────────────────────────────────────────────
        AssetNFT assetNFT = new AssetNFT(deployer);
        console.log("AssetNFT:", address(assetNFT));

        // ── 5. AssetRegistry ────────────────────────────────────────────────
        AssetRegistry assetRegistry = new AssetRegistry(
            address(roleManager),
            address(identityRegistry),
            address(schemaRegistry),
            address(assetNFT)
        );
        console.log("AssetRegistry:", address(assetRegistry));

        // ── 6. Two-step AssetNFT binding ────────────────────────────────────
        // Step 1: owner proposes the AssetRegistry as the binding contract.
        assetNFT.proposeAssetRegistry(address(assetRegistry));
        // Step 2: AssetRegistry calls acceptAssetRegistry() on the NFT,
        //         proving it is the intended contract at that address.
        assetRegistry.bootstrapAcceptNFT(address(assetNFT));
        console.log("AssetNFT <-> AssetRegistry wired (two-step accept complete).");

        // ── 7. TrustPaymaster ────────────────────────────────────────────────
        TrustPaymaster paymaster = new TrustPaymaster(address(identityRegistry), deployer);
        console.log("TrustPaymaster:", address(paymaster));

        // ── 8. Register Admin DID ─────────────────────────────────────────
        string memory adminDID = string.concat("did:trustchain:", vm.toString(deployer));
        bytes memory adminPubKey = hex"04a3f97ab35ea35a71c82a3b1a445ccc7cebc71cc0d00b6258a098d49186daf50aa7af1eda116abc524aca537bd59ec331ea3eda92bfd20c004fda3cd54a5ade93";
        identityRegistry.registerIdentity(
            adminDID,
            deployer,
            adminPubKey,
            "ipfs://QmBELAdminDirectorateIdentity"
        );
        console.log("Admin DID registered:", adminDID);

        // ── 9. Register standard schemas ─────────────────────────────────
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
        console.log("Standard schemas registered.");

        vm.stopBroadcast();

        console.log("=================================================");
        console.log("DEPLOYMENT COMPLETE:");
        console.log("ROLE_MANAGER_ADDRESS=",        address(roleManager));
        console.log("IDENTITY_REGISTRY_ADDRESS=",   address(identityRegistry));
        console.log("SCHEMA_REGISTRY_ADDRESS=",     address(schemaRegistry));
        console.log("ASSET_NFT_ADDRESS=",           address(assetNFT));
        console.log("ASSET_REGISTRY_ADDRESS=",      address(assetRegistry));
        console.log("TRUST_PAYMASTER_ADDRESS=",     address(paymaster));
        console.log("=================================================");
    }
}

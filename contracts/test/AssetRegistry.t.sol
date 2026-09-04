// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/RoleManager.sol";
import "../src/IdentityRegistry.sol";
import "../src/SchemaRegistry.sol";
import "../src/AssetNFT.sol";
import "../src/AssetRegistry.sol";

contract AssetRegistryTest is Test {
    RoleManager public roleManager;
    IdentityRegistry public identityRegistry;
    SchemaRegistry public schemaRegistry;
    AssetNFT public assetNFT;
    AssetRegistry public assetRegistry;

    address public admin = address(0x1);
    address public manager = address(0x2);
    address public user = address(0x3);
    address public user2 = address(0x4);
    address public attacker = address(0x99);

    string public userDID = "did:trustchain:0x0000000000000000000000000000000000000003";
    string public user2DID = "did:trustchain:0x0000000000000000000000000000000000000004";
    string public issuerDID = "did:trustchain:0x0000000000000000000000000000000000000002";

    bytes32 public sampleHash = keccak256("CERTIFICATE_PAYLOAD_123");

    function setUp() public {
        vm.startPrank(admin);
        roleManager = new RoleManager(admin);
        roleManager.assignRole(roleManager.MANAGER_ROLE(), manager);

        identityRegistry = new IdentityRegistry(address(roleManager));
        schemaRegistry = new SchemaRegistry(address(roleManager));
        assetNFT = new AssetNFT(admin);

        assetRegistry = new AssetRegistry(
            address(roleManager),
            address(identityRegistry),
            address(schemaRegistry),
            address(assetNFT)
        );

        assetNFT.setAssetRegistry(address(assetRegistry));

        // Register schema
        schemaRegistry.registerSchema(
            "CERTIFICATE_V1",
            "Academic Certificate",
            "ipfs://schema-cert",
            keccak256("schema-json"),
            "1.0.0"
        );

        // Register DIDs
        identityRegistry.registerIdentity(userDID, user, "pubkey-user", "");
        identityRegistry.registerIdentity(user2DID, user2, "pubkey-user2", "");
        identityRegistry.registerIdentity(issuerDID, manager, "pubkey-manager", "");

        vm.stopPrank();
    }

    function test_IssueAndVerifyAsset() public {
        vm.prank(manager);
        uint256 tokenId = assetRegistry.issueAsset(
            user,
            userDID,
            issuerDID,
            "CERTIFICATE",
            "CERTIFICATE_V1",
            sampleHash,
            "ipfs://meta-cert-1",
            0,
            true
        );

        assertEq(tokenId, 1);
        assertEq(assetNFT.ownerOf(1), user);

        (
            bool isValid,
            bool isHashMatch,
            bool isStatusActive,
            bool isNotExpired,
            bool isOwnerVerified,
            AssetRegistry.AssetRecord memory asset,
            address currentOwner
        ) = assetRegistry.verifyAsset(1, sampleHash);

        assertTrue(isValid);
        assertTrue(isHashMatch);
        assertTrue(isStatusActive);
        assertTrue(isNotExpired);
        assertTrue(isOwnerVerified);
        assertEq(currentOwner, user);
        assertEq(asset.ownerDID, userDID);
    }

    function test_NonManagerCannotMint() public {
        vm.expectRevert("AssetRegistry: caller is not Manager or Admin");
        vm.prank(attacker);
        assetRegistry.issueAsset(
            user,
            userDID,
            issuerDID,
            "CERTIFICATE",
            "CERTIFICATE_V1",
            sampleHash,
            "ipfs://meta-1",
            0,
            true
        );
    }

    function test_TamperedHashFailsVerification() public {
        vm.prank(manager);
        uint256 tokenId = assetRegistry.issueAsset(
            user,
            userDID,
            issuerDID,
            "CERTIFICATE",
            "CERTIFICATE_V1",
            sampleHash,
            "ipfs://meta-1",
            0,
            true
        );

        bytes32 tamperedHash = keccak256("TAMPERED_PAYLOAD");
        (bool isValid, bool isHashMatch, , , , , ) = assetRegistry.verifyAsset(tokenId, tamperedHash);

        assertFalse(isValid);
        assertFalse(isHashMatch);
    }

    function test_RevokeAsset() public {
        vm.prank(manager);
        uint256 tokenId = assetRegistry.issueAsset(
            user,
            userDID,
            issuerDID,
            "CERTIFICATE",
            "CERTIFICATE_V1",
            sampleHash,
            "ipfs://meta-1",
            0,
            true
        );

        vm.prank(manager);
        assetRegistry.revokeAsset(tokenId, "Course credential recalled due to fraudulent prerequisites");

        (bool isValid, , bool isStatusActive, , , AssetRegistry.AssetRecord memory asset, ) = assetRegistry.verifyAsset(tokenId, sampleHash);

        assertFalse(isValid);
        assertFalse(isStatusActive);
        assertEq(uint256(asset.status), uint256(AssetRegistry.AssetStatus.REVOKED));
    }

    function test_TransferAsset() public {
        vm.prank(manager);
        uint256 tokenId = assetRegistry.issueAsset(
            user,
            userDID,
            issuerDID,
            "LICENSE",
            "",
            sampleHash,
            "ipfs://meta-lic",
            0,
            true // transferable
        );

        vm.prank(user);
        assetRegistry.transferAsset(tokenId, user2, user2DID);

        assertEq(assetNFT.ownerOf(tokenId), user2);

        (
            bool isValid,
            ,
            ,
            ,
            bool isOwnerVerified,
            AssetRegistry.AssetRecord memory asset,
            address currentOwner
        ) = assetRegistry.verifyAsset(tokenId, sampleHash);

        assertTrue(isValid);
        assertTrue(isOwnerVerified);
        assertEq(currentOwner, user2);
        assertEq(asset.ownerDID, user2DID);
    }
}

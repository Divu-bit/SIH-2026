// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/RoleManager.sol";
import "../src/IdentityRegistry.sol";
import "../src/SchemaRegistry.sol";
import "../src/AssetNFT.sol";
import "../src/AssetRegistry.sol";

contract AssetRegistryHarness is AssetRegistry {
    constructor(
        address _roleManager,
        address _identityRegistry,
        address _schemaRegistry,
        address _assetNFT
    ) AssetRegistry(_roleManager, _identityRegistry, _schemaRegistry, _assetNFT) {}

    function exposeRemoveDIDToken(string memory did, uint256 tokenId) external {
        _removeDIDToken(did, tokenId);
    }
}

contract AssetRegistryTest is Test {
    RoleManager public roleManager;
    IdentityRegistry public identityRegistry;
    SchemaRegistry public schemaRegistry;
    AssetNFT public assetNFT;
    AssetRegistry public assetRegistry;

    address public admin = address(0x1);
    address public manager = address(0x2);
    address public user1 = address(0x10);
    address public user2 = address(0x20);
    address public attacker = address(0x99);

    string public constant ADMIN_DID = "did:trustchain:admin_identity_0000";
    string public constant USER1_DID = "did:trustchain:user1_identity_1111";
    string public constant USER2_DID = "did:trustchain:user2_identity_2222";

    bytes32 public constant HASH1 = keccak256("CREDENTIAL_1");
    bytes32 public constant HASH2 = keccak256("CREDENTIAL_2");
    bytes32 public constant HASH3 = keccak256("CREDENTIAL_3");

    AssetRegistryHarness public harness;

    function setUp() public {
        vm.startPrank(admin);

        roleManager = new RoleManager(admin);
        roleManager.assignRole(roleManager.MANAGER_ROLE(), manager);

        identityRegistry = new IdentityRegistry(address(roleManager));
        schemaRegistry   = new SchemaRegistry(address(roleManager));
        assetNFT         = new AssetNFT(admin);

        assetRegistry = new AssetRegistry(
            address(roleManager),
            address(identityRegistry),
            address(schemaRegistry),
            address(assetNFT)
        );

        harness = new AssetRegistryHarness(
            address(roleManager),
            address(identityRegistry),
            address(schemaRegistry),
            address(assetNFT)
        );

        // Bind AssetNFT ↔ AssetRegistry
        assetNFT.proposeAssetRegistry(address(assetRegistry));
        assetRegistry.bootstrapAcceptNFT(address(assetNFT));

        // Register DIDs
        identityRegistry.registerIdentity(ADMIN_DID, admin, hex"11", "ipfs://admin");
        identityRegistry.registerIdentity(USER1_DID, user1, hex"22", "ipfs://user1");
        identityRegistry.registerIdentity(USER2_DID, user2, hex"33", "ipfs://user2");

        // Register schema
        schemaRegistry.registerSchema(
            "CERT_V1",
            "Certificate Schema V1",
            "ipfs://schema1",
            keccak256("SCHEMA_DEF_1"),
            "1.0.0"
        );

        vm.stopPrank();
    }

    function test_RemoveDIDToken_NotPresent_NoOp() public {
        harness.exposeRemoveDIDToken(USER1_DID, 999);
    }

    function test_Constructor_ZeroAddressGuards() public {
        vm.expectRevert("AssetRegistry: zero RoleManager");
        new AssetRegistry(address(0), address(identityRegistry), address(schemaRegistry), address(assetNFT));

        vm.expectRevert("AssetRegistry: zero IdentityRegistry");
        new AssetRegistry(address(roleManager), address(0), address(schemaRegistry), address(assetNFT));

        vm.expectRevert("AssetRegistry: zero SchemaRegistry");
        new AssetRegistry(address(roleManager), address(identityRegistry), address(0), address(assetNFT));

        vm.expectRevert("AssetRegistry: zero AssetNFT");
        new AssetRegistry(address(roleManager), address(identityRegistry), address(schemaRegistry), address(0));
    }

    function test_BootstrapAcceptNFT_ZeroAddress_Reverts() public {
        vm.prank(admin);
        vm.expectRevert("AssetRegistry: zero assetNFT");
        assetRegistry.bootstrapAcceptNFT(address(0));
    }

    function test_BootstrapAcceptNFT_NonAdmin_Reverts() public {
        vm.prank(attacker);
        vm.expectRevert("AssetRegistry: caller is not Admin");
        assetRegistry.bootstrapAcceptNFT(address(assetNFT));
    }

    function test_PauseAndUnpause_AccessControl() public {
        vm.prank(attacker);
        vm.expectRevert("AssetRegistry: caller is not Admin");
        assetRegistry.pause();

        vm.prank(admin);
        assetRegistry.pause();

        vm.prank(attacker);
        vm.expectRevert("AssetRegistry: caller is not Admin");
        assetRegistry.unpause();

        vm.prank(admin);
        assetRegistry.unpause();
    }

    function test_IssueAsset_ValidationErrors() public {
        // Zero recipient
        vm.prank(admin);
        vm.expectRevert("AssetRegistry: zero recipient address");
        assetRegistry.issueAsset(address(0), USER1_DID, ADMIN_DID, "CERT", "CERT_V1", HASH1, "ipfs://m", 0, true);

        // Empty ownerDID
        vm.prank(admin);
        vm.expectRevert("AssetRegistry: empty ownerDID");
        assetRegistry.issueAsset(user1, "", ADMIN_DID, "CERT", "CERT_V1", HASH1, "ipfs://m", 0, true);

        // Empty issuerDID
        vm.prank(admin);
        vm.expectRevert("AssetRegistry: empty issuerDID");
        assetRegistry.issueAsset(user1, USER1_DID, "", "CERT", "CERT_V1", HASH1, "ipfs://m", 0, true);

        // Zero credential hash
        vm.prank(admin);
        vm.expectRevert("AssetRegistry: zero credentialHash");
        assetRegistry.issueAsset(user1, USER1_DID, ADMIN_DID, "CERT", "CERT_V1", bytes32(0), "ipfs://m", 0, true);

        // Recipient not active controller of ownerDID
        vm.prank(admin);
        vm.expectRevert("AssetRegistry: recipient is not active controller of ownerDID");
        assetRegistry.issueAsset(user2, USER1_DID, ADMIN_DID, "CERT", "CERT_V1", HASH1, "ipfs://m", 0, true);

        // Issuer not active controller of issuerDID
        vm.prank(manager);
        vm.expectRevert("AssetRegistry: issuer is not active controller of issuerDID");
        assetRegistry.issueAsset(user1, USER1_DID, ADMIN_DID, "CERT", "CERT_V1", HASH1, "ipfs://m", 0, true);

        // Inactive/Invalid Schema
        vm.prank(admin);
        vm.expectRevert("AssetRegistry: schema is not active or valid");
        assetRegistry.issueAsset(user1, USER1_DID, ADMIN_DID, "CERT", "INVALID_SCHEMA", HASH1, "ipfs://m", 0, true);

        // Non-manager/non-admin caller
        vm.prank(user1);
        vm.expectRevert("AssetRegistry: caller is not Manager or Admin");
        assetRegistry.issueAsset(user1, USER1_DID, ADMIN_DID, "CERT", "CERT_V1", HASH1, "ipfs://m", 0, true);
    }

    function test_IssueAsset_Success_And_IssueAssetWithParams() public {
        // Standard issuance (without schemaId)
        vm.prank(admin);
        uint256 id1 = assetRegistry.issueAsset(user1, USER1_DID, ADMIN_DID, "CERT", "", HASH1, "ipfs://meta1", 0, true);
        assertEq(id1, 1);
        assertTrue(assetRegistry.isHashAnchored(HASH1));
        assertEq(assetRegistry.getTokenIdByHash(HASH1), 1);
        assertEq(assetRegistry.totalAssets(), 1);

        uint256[] memory user1Tokens = assetRegistry.getTokensByDID(USER1_DID);
        assertEq(user1Tokens.length, 1);
        assertEq(user1Tokens[0], 1);

        // Duplicate credential hash revert
        vm.prank(admin);
        vm.expectRevert("AssetRegistry: credential hash already anchored");
        assetRegistry.issueAsset(user1, USER1_DID, ADMIN_DID, "CERT", "", HASH1, "ipfs://meta1", 0, true);

        // issueAssetWithParams (with schemaId and expiry)
        AssetRegistry.IssueAssetParams memory p;
        p.recipient      = user2;
        p.ownerDID       = USER2_DID;
        p.issuerDID      = ADMIN_DID;
        p.assetType      = "LICENSE";
        p.schemaId       = "CERT_V1";
        p.credentialHash = HASH2;
        p.metadataUri    = "ipfs://meta2";
        p.expiresAt      = block.timestamp + 1000;
        p.isTransferable = false;

        vm.prank(admin);
        uint256 id2 = assetRegistry.issueAssetWithParams(p);
        assertEq(id2, 2);
        assertEq(assetRegistry.totalAssets(), 2);
    }

    function test_TransferAsset_Scenarios() public {
        vm.prank(admin);
        uint256 id1 = assetRegistry.issueAsset(user1, USER1_DID, ADMIN_DID, "CERT", "CERT_V1", HASH1, "ipfs://m1", 0, true);

        // Soulbound non-transferable asset
        AssetRegistry.IssueAssetParams memory p;
        p.recipient = user1;
        p.ownerDID = USER1_DID;
        p.issuerDID = ADMIN_DID;
        p.assetType = "ID";
        p.schemaId = "CERT_V1";
        p.credentialHash = HASH2;
        p.metadataUri = "ipfs://m2";
        p.expiresAt = 0;
        p.isTransferable = false;

        vm.prank(admin);
        uint256 id2 = assetRegistry.issueAssetWithParams(p);

        // Non-existent asset transfer -> reverts
        vm.prank(user1);
        vm.expectRevert("AssetRegistry: asset does not exist");
        assetRegistry.transferAsset(999, user2, USER2_DID);

        // Unauthorized caller -> reverts
        vm.prank(attacker);
        vm.expectRevert("AssetRegistry: unauthorized token action");
        assetRegistry.transferAsset(id1, user2, USER2_DID);

        // Soulbound asset transfer -> reverts
        vm.prank(user1);
        vm.expectRevert("AssetRegistry: asset is non-transferable soulbound credential");
        assetRegistry.transferAsset(id2, user2, USER2_DID);

        // Zero destination address -> reverts
        vm.prank(user1);
        vm.expectRevert("AssetRegistry: zero destination address");
        assetRegistry.transferAsset(id1, address(0), USER2_DID);

        // Destination not controller of new DID -> reverts
        vm.prank(user1);
        vm.expectRevert("AssetRegistry: destination is not active controller of new DID");
        assetRegistry.transferAsset(id1, user1, USER2_DID);

        // Successful transfer by token owner
        vm.prank(user1);
        assetRegistry.transferAsset(id1, user2, USER2_DID);

        assertEq(assetNFT.ownerOf(id1), user2);
        assertEq(assetRegistry.getTokensByDID(USER1_DID).length, 1);
        assertEq(assetRegistry.getTokensByDID(USER1_DID)[0], id2);
        assertEq(assetRegistry.getTokensByDID(USER2_DID)[0], id1);
    }

    function test_TransferAsset_ByManagerAndAdmin() public {
        vm.prank(admin);
        uint256 id1 = assetRegistry.issueAsset(user1, USER1_DID, ADMIN_DID, "CERT", "CERT_V1", HASH1, "ipfs://m1", 0, true);

        vm.prank(admin);
        uint256 id2 = assetRegistry.issueAsset(user1, USER1_DID, ADMIN_DID, "CERT", "CERT_V1", HASH2, "ipfs://m2", 0, true);

        // Transfer by Manager (on behalf of user1)
        vm.prank(manager);
        assetRegistry.transferAsset(id1, user2, USER2_DID);
        assertEq(assetNFT.ownerOf(id1), user2);

        // Transfer by Admin (on behalf of user1)
        vm.prank(admin);
        assetRegistry.transferAsset(id2, user2, USER2_DID);
        assertEq(assetNFT.ownerOf(id2), user2);
    }

    function test_RevokeAsset_And_UpdateStatus() public {
        vm.prank(admin);
        uint256 id = assetRegistry.issueAsset(user1, USER1_DID, ADMIN_DID, "CERT", "CERT_V1", HASH1, "ipfs://m1", 0, true);

        // Non-existent asset -> reverts
        vm.prank(admin);
        vm.expectRevert("AssetRegistry: asset does not exist");
        assetRegistry.revokeAsset(999, "reason");

        // Non-manager/non-admin -> reverts
        vm.prank(user1);
        vm.expectRevert("AssetRegistry: caller is not Manager or Admin");
        assetRegistry.revokeAsset(id, "reason");

        // Update status to SUSPENDED by manager
        vm.prank(manager);
        assetRegistry.updateAssetStatus(id, AssetRegistry.AssetStatus.SUSPENDED, "investigating");

        (AssetRegistry.AssetRecord memory rec, address ownerAddr) = assetRegistry.getAsset(id);
        assertTrue(rec.status == AssetRegistry.AssetStatus.SUSPENDED);
        assertEq(ownerAddr, user1);

        // Cannot set REVOKED via updateAssetStatus
        vm.prank(admin);
        vm.expectRevert("AssetRegistry: use revokeAsset() to revoke an asset");
        assetRegistry.updateAssetStatus(id, AssetRegistry.AssetStatus.REVOKED, "reason");

        // Revoke asset via revokeAsset()
        vm.prank(admin);
        assetRegistry.revokeAsset(id, "fraudulent");

        (rec, ) = assetRegistry.getAsset(id);
        assertTrue(rec.status == AssetRegistry.AssetStatus.REVOKED);

        // Double revoke -> reverts
        vm.prank(admin);
        vm.expectRevert("AssetRegistry: asset already revoked");
        assetRegistry.revokeAsset(id, "again");

        // Update status of revoked asset -> reverts
        vm.prank(admin);
        vm.expectRevert("AssetRegistry: asset is already permanently revoked");
        assetRegistry.updateAssetStatus(id, AssetRegistry.AssetStatus.ACTIVE, "restore");
    }

    function test_VerifyAsset_AllPaths() public {
        // Non-existent asset
        (bool isValid,,,,,, address holder) = assetRegistry.verifyAsset(999, bytes32(0));
        assertFalse(isValid);
        assertEq(holder, address(0));

        // Issue valid asset with expiry
        vm.prank(admin);
        uint256 id = assetRegistry.issueAsset(user1, USER1_DID, ADMIN_DID, "CERT", "CERT_V1", HASH1, "ipfs://m1", block.timestamp + 100, true);

        // Fully valid
        bool hashMatch;
        bool statusActive;
        bool notExpired;
        bool ownerVerified;
        (isValid, hashMatch, statusActive, notExpired, ownerVerified,,) = assetRegistry.verifyAsset(id, HASH1);
        assertTrue(isValid);
        assertTrue(hashMatch);
        assertTrue(statusActive);
        assertTrue(notExpired);
        assertTrue(ownerVerified);

        // Hash mismatch
        (isValid, hashMatch,,,,,) = assetRegistry.verifyAsset(id, HASH2);
        assertFalse(isValid);
        assertFalse(hashMatch);

        // Expired asset
        vm.warp(block.timestamp + 200);
        (isValid,,, notExpired,,,) = assetRegistry.verifyAsset(id, HASH1);
        assertFalse(isValid);
        assertFalse(notExpired);

        // Revoked status
        vm.prank(admin);
        assetRegistry.revokeAsset(id, "expired & revoked");
        (isValid,, statusActive,,,,) = assetRegistry.verifyAsset(id, HASH1);
        assertFalse(isValid);
        assertFalse(statusActive);
    }

    function test_GetAsset_NonExistent_Reverts() public {
        vm.expectRevert("AssetRegistry: asset does not exist");
        assetRegistry.getAsset(999);
    }

    function test_Pause_BlocksStateChangingFunctions() public {
        vm.prank(admin);
        uint256 id = assetRegistry.issueAsset(user1, USER1_DID, ADMIN_DID, "CERT", "CERT_V1", HASH1, "ipfs://m1", 0, true);

        vm.prank(admin);
        assetRegistry.pause();

        vm.prank(admin);
        vm.expectRevert(bytes4(keccak256("EnforcedPause()")));
        assetRegistry.issueAsset(user1, USER1_DID, ADMIN_DID, "CERT", "CERT_V1", HASH2, "ipfs://m2", 0, true);

        vm.prank(user1);
        vm.expectRevert(bytes4(keccak256("EnforcedPause()")));
        assetRegistry.transferAsset(id, user2, USER2_DID);

        vm.prank(admin);
        vm.expectRevert(bytes4(keccak256("EnforcedPause()")));
        assetRegistry.revokeAsset(id, "reason");

        vm.prank(admin);
        vm.expectRevert(bytes4(keccak256("EnforcedPause()")));
        assetRegistry.updateAssetStatus(id, AssetRegistry.AssetStatus.SUSPENDED, "reason");

        // Read operations work during pause
        (bool isValid,,,,,,) = assetRegistry.verifyAsset(id, HASH1);
        assertTrue(isValid);
    }

    // ── Sync NFT Owner Tests ──────────────────────────────────────────────────

    function test_SyncNFTOwner_Success() public {
        vm.prank(admin);
        uint256 id = assetRegistry.issueAsset(user1, USER1_DID, ADMIN_DID, "CERT", "CERT_V1", HASH1, "ipfs://m1", 0, true);

        // Rotate controller of USER1_DID: user1 -> user2
        vm.prank(user1);
        identityRegistry.proposeController(USER1_DID, user2);
        vm.prank(user2);
        identityRegistry.acceptController(USER1_DID);

        // NFT owner before sync is still user1
        assertEq(assetNFT.ownerOf(id), user1);

        // Active controller (user2) syncs NFT
        vm.prank(user2);
        assetRegistry.syncNFTOwner(id);

        // NFT owner after sync is user2
        assertEq(assetNFT.ownerOf(id), user2);
    }

    function test_SyncNFTOwner_AlreadySynced_NoOp() public {
        vm.prank(admin);
        uint256 id = assetRegistry.issueAsset(user1, USER1_DID, ADMIN_DID, "CERT", "CERT_V1", HASH1, "ipfs://m1", 0, true);

        // Owner is already user1 (current controller)
        assertEq(assetNFT.ownerOf(id), user1);

        vm.prank(user1);
        assetRegistry.syncNFTOwner(id);

        assertEq(assetNFT.ownerOf(id), user1);
    }

    function test_SyncNFTOwner_Unauthorized_Reverts() public {
        vm.prank(admin);
        uint256 id = assetRegistry.issueAsset(user1, USER1_DID, ADMIN_DID, "CERT", "CERT_V1", HASH1, "ipfs://m1", 0, true);

        // Rotate controller to user2
        vm.prank(user1);
        identityRegistry.proposeController(USER1_DID, user2);
        vm.prank(user2);
        identityRegistry.acceptController(USER1_DID);

        // Old controller (user1) tries to sync -> unauthorized
        vm.prank(user1);
        vm.expectRevert("AssetRegistry: unauthorized token action");
        assetRegistry.syncNFTOwner(id);
    }

    function test_SyncNFTOwner_InactiveDID_Reverts() public {
        vm.prank(admin);
        uint256 id = assetRegistry.issueAsset(user1, USER1_DID, ADMIN_DID, "CERT", "CERT_V1", HASH1, "ipfs://m1", 0, true);

        // Suspend user1's DID
        vm.prank(admin);
        identityRegistry.setIdentityStatus(USER1_DID, IdentityRegistry.IdentityStatus.SUSPENDED);

        // Attempting to sync NFT owner on an inactive DID reverts
        vm.prank(admin); // admin role allows bypass of onlyTokenOwnerOrManager
        vm.expectRevert("AssetRegistry: owner DID is not active");
        assetRegistry.syncNFTOwner(id);
    }

    function test_SyncNFTOwner_Paused_Reverts() public {
        vm.prank(admin);
        uint256 id = assetRegistry.issueAsset(user1, USER1_DID, ADMIN_DID, "CERT", "CERT_V1", HASH1, "ipfs://m1", 0, true);

        vm.prank(admin);
        assetRegistry.pause();

        vm.prank(user1);
        vm.expectRevert(bytes4(keccak256("EnforcedPause()")));
        assetRegistry.syncNFTOwner(id);
    }
}

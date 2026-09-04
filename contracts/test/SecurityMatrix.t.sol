// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/RoleManager.sol";
import "../src/IdentityRegistry.sol";
import "../src/SchemaRegistry.sol";
import "../src/AssetNFT.sol";
import "../src/AssetRegistry.sol";

/**
 * @title SecurityMatrixTest
 * @dev Direct implementation of Section 15 "Security Test Matrix" from the SIH26125 specification.
 */
contract SecurityMatrixTest is Test {
    RoleManager public roleManager;
    IdentityRegistry public identityRegistry;
    SchemaRegistry public schemaRegistry;
    AssetNFT public assetNFT;
    AssetRegistry public assetRegistry;

    address public admin = address(0x100);
    address public manager = address(0x200);
    address public auditor = address(0x300);
    address public user = address(0x400);
    address public attacker = address(0x999);

    string public userDID = "did:trustchain:0x0000000000000000000000000000000000000400";
    string public managerDID = "did:trustchain:0x0000000000000000000000000000000000000200";
    bytes32 public validHash = keccak256("CANONICAL_JSON_CREDENTIAL_HASH");

    function setUp() public {
        vm.startPrank(admin);
        roleManager = new RoleManager(admin);
        roleManager.assignRole(roleManager.MANAGER_ROLE(), manager);
        roleManager.assignRole(roleManager.AUDITOR_ROLE(), auditor);

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

        schemaRegistry.registerSchema(
            "CERTIFICATE_V1",
            "Academic Certificate",
            "ipfs://schema-uri",
            keccak256("schema-def"),
            "1.0.0"
        );

        identityRegistry.registerIdentity(userDID, user, "pubkey-user", "");
        identityRegistry.registerIdentity(managerDID, manager, "pubkey-manager", "");
        vm.stopPrank();
    }

    // 1. Non-admin grants role -> Transaction reverts
    function test_Security_NonAdminGrantsRole_Reverts() public {
        bytes32 managerRole = roleManager.MANAGER_ROLE();
        vm.expectRevert();
        vm.prank(attacker);
        roleManager.assignRole(managerRole, attacker);
    }

    // 2. Non-manager mints -> Transaction reverts
    function test_Security_NonManagerMints_Reverts() public {
        vm.expectRevert("AssetRegistry: caller is not Manager or Admin");
        vm.prank(attacker);
        assetRegistry.issueAsset(
            user,
            userDID,
            managerDID,
            "CERTIFICATE",
            "CERTIFICATE_V1",
            validHash,
            "ipfs://meta",
            0,
            true
        );
    }

    // 3. Tampered credential -> Hash mismatch -> INVALID
    function test_Security_TamperedCredential_Invalid() public {
        vm.prank(manager);
        uint256 tokenId = assetRegistry.issueAsset(
            user,
            userDID,
            managerDID,
            "CERTIFICATE",
            "CERTIFICATE_V1",
            validHash,
            "ipfs://meta",
            0,
            true
        );

        bytes32 tamperedHash = keccak256("TAMPERED_JSON_CREDENTIAL");
        (bool isValid, bool isHashMatch, , , , , ) = assetRegistry.verifyAsset(tokenId, tamperedHash);

        assertFalse(isValid);
        assertFalse(isHashMatch);
    }

    // 4. Unknown schema -> Credential rejected
    function test_Security_UnknownSchema_Reverts() public {
        vm.expectRevert("AssetRegistry: schema is not active or valid");
        vm.prank(manager);
        assetRegistry.issueAsset(
            user,
            userDID,
            managerDID,
            "UNKNOWN_TYPE",
            "NON_EXISTENT_SCHEMA_V99",
            validHash,
            "ipfs://meta",
            0,
            true
        );
    }

    // 5. Revoked DID -> Action rejected by policy
    function test_Security_RevokedDID_ActionRejected() public {
        // Revoke user's DID
        vm.prank(user);
        identityRegistry.setIdentityStatus(userDID, IdentityRegistry.IdentityStatus.REVOKED);

        // Attempting to issue asset to revoked DID should fail
        vm.expectRevert("AssetRegistry: recipient is not active controller of ownerDID");
        vm.prank(manager);
        assetRegistry.issueAsset(
            user,
            userDID,
            managerDID,
            "CERTIFICATE",
            "CERTIFICATE_V1",
            validHash,
            "ipfs://meta",
            0,
            true
        );
    }

    // 6. Revoked asset -> REVOKED, not VALID
    function test_Security_RevokedAsset_NotValid() public {
        vm.prank(manager);
        uint256 tokenId = assetRegistry.issueAsset(
            user,
            userDID,
            managerDID,
            "CERTIFICATE",
            "CERTIFICATE_V1",
            validHash,
            "ipfs://meta",
            0,
            true
        );

        vm.prank(manager);
        assetRegistry.revokeAsset(tokenId, "Degree revoked for plagiarism");

        (bool isValid, , bool isStatusActive, , , AssetRegistry.AssetRecord memory asset, ) = assetRegistry.verifyAsset(tokenId, validHash);
        assertFalse(isValid);
        assertFalse(isStatusActive);
        assertEq(uint256(asset.status), uint256(AssetRegistry.AssetStatus.REVOKED));
    }

    // 7. Expired credential -> Expired/invalid according to policy
    function test_Security_ExpiredCredential_Invalid() public {
        uint256 expiresAt = block.timestamp + 100;

        vm.prank(manager);
        uint256 tokenId = assetRegistry.issueAsset(
            user,
            userDID,
            managerDID,
            "CERTIFICATE",
            "CERTIFICATE_V1",
            validHash,
            "ipfs://meta",
            expiresAt,
            true
        );

        // Warp time into future past expiry
        vm.warp(block.timestamp + 200);

        (bool isValid, , , bool isNotExpired, , , ) = assetRegistry.verifyAsset(tokenId, validHash);
        assertFalse(isValid);
        assertFalse(isNotExpired);
    }

    // 8. Non-transferable soulbound credential transfer attempt -> Reverts
    function test_Security_NonTransferableAsset_TransferReverts() public {
        vm.prank(manager);
        uint256 tokenId = assetRegistry.issueAsset(
            user,
            userDID,
            managerDID,
            "CERTIFICATE",
            "CERTIFICATE_V1",
            validHash,
            "ipfs://meta",
            0,
            false // Non-transferable soulbound
        );

        address recipient = address(0x500);
        string memory recipientDID = "did:trustchain:0x0000000000000000000000000000000000000500";
        vm.prank(admin);
        identityRegistry.registerIdentity(recipientDID, recipient, "pubkey-rec", "");

        vm.expectRevert("AssetRegistry: asset is non-transferable soulbound credential");
        vm.prank(user);
        assetRegistry.transferAsset(tokenId, recipient, recipientDID);
    }
}

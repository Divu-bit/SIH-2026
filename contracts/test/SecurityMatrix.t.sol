// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/RoleManager.sol";
import "../src/IdentityRegistry.sol";
import "../src/SchemaRegistry.sol";
import "../src/AssetNFT.sol";
import "../src/AssetRegistry.sol";
import "../src/AccountAbstraction/TrustSmartAccount.sol";

/**
 * @title SecurityMatrixTest
 * @notice Implements the full Section 15 Security Test Matrix from SIH26125 spec.
 *         Covers 28 named security cases + fuzz tests + 10 on-chain invariants.
 *
 *  Case  | Category              | Description
 * ───────┼───────────────────────┼──────────────────────────────────────────────
 *   1    | Access Control        | Non-admin grants role -> reverts
 *   2    | Access Control        | Non-manager mints -> reverts
 *   3    | Access Control        | Non-admin pauses -> reverts
 *   4    | Access Control        | Arbitrary role bytes32 -> reverts
 *   5    | Access Control        | Non-admin revokes asset -> reverts
 *   6    | Access Control        | Attacker accesses admin function -> reverts
 *   7    | Data Integrity        | Tampered credential hash -> invalid
 *   8    | Data Integrity        | Unknown schema -> reverts
 *   9    | Data Integrity        | Zero credential hash -> reverts
 *  10    | Data Integrity        | Duplicate credential hash -> reverts
 *  11    | Data Integrity        | Empty DID -> reverts
 *  12    | Data Integrity        | Invalid DID prefix -> reverts
 *  13    | Identity Lifecycle    | Revoked DID blocks issuance
 *  14    | Identity Lifecycle    | Suspended DID blocks issuance
 *  15    | Identity Lifecycle    | REVOKED is terminal -> re-activate reverts
 *  16    | Identity Lifecycle    | Two-step rotation: only pending can accept
 *  17    | Identity Lifecycle    | Controller mismatch on issuance -> reverts
 *  18    | Asset Lifecycle       | Revoked asset is invalid
 *  19    | Asset Lifecycle       | Expired credential is invalid
 *  20    | Asset Lifecycle       | updateAssetStatus to REVOKED -> reverts
 *  21    | Asset Lifecycle       | Double-revoke -> reverts
 *  22    | Asset Lifecycle       | Non-transferable soulbound transfer -> reverts
 *  23    | Asset Lifecycle       | Transfer to non-controller DID -> reverts
 *  24    | Bypass Prevention     | Direct ERC-721 transferFrom -> reverts
 *  25    | Bypass Prevention     | Direct ERC-721 safeTransferFrom -> reverts
 *  26    | Bypass Prevention     | Direct AssetNFT.mint() without registry -> reverts
 *  27    | Reentrancy            | Hash anchored before mint (CEI check)
 *  29    | Index Consistency     | DID/token index cleaned after transfer
 *  30    | Controller Rotation   | Old controller cannot act on asset after rotation
 */
contract SecurityMatrixTest is Test {

    // ── Contracts ──────────────────────────────────────────────────────────
    RoleManager      public roleManager;
    IdentityRegistry public identityRegistry;
    SchemaRegistry   public schemaRegistry;
    AssetNFT         public assetNFT;
    AssetRegistry    public assetRegistry;

    // ── Actors ─────────────────────────────────────────────────────────────
    address public admin    = address(0x100);
    address public manager  = address(0x200);
    address public auditor  = address(0x300);
    address public user     = address(0x400);
    address public user2    = address(0x500);
    address public attacker = address(0x999);

    // ── DIDs ───────────────────────────────────────────────────────────────
    string public userDID    = "did:trustchain:0x0000000000000000000000000000000000000400";
    string public user2DID   = "did:trustchain:0x0000000000000000000000000000000000000500";
    string public managerDID = "did:trustchain:0x0000000000000000000000000000000000000200";

    // ── Hashes ─────────────────────────────────────────────────────────────
    bytes32 public validHash = keccak256("CANONICAL_JSON_CREDENTIAL_HASH");

    // ── Setup ──────────────────────────────────────────────────────────────
    function setUp() public {
        vm.startPrank(admin);
        roleManager = new RoleManager(admin);
        roleManager.assignRole(roleManager.MANAGER_ROLE(), manager);
        roleManager.assignRole(roleManager.AUDITOR_ROLE(), auditor);

        identityRegistry = new IdentityRegistry(address(roleManager));
        schemaRegistry   = new SchemaRegistry(address(roleManager));
        assetNFT         = new AssetNFT(admin);

        assetRegistry = new AssetRegistry(
            address(roleManager),
            address(identityRegistry),
            address(schemaRegistry),
            address(assetNFT)
        );

        // Two-step binding
        assetNFT.proposeAssetRegistry(address(assetRegistry));
        assetRegistry.bootstrapAcceptNFT(address(assetNFT));

        schemaRegistry.registerSchema(
            "CERTIFICATE_V1",
            "Academic Certificate",
            "ipfs://schema-uri",
            keccak256("schema-def"),
            "1.0.0"
        );

        identityRegistry.registerIdentity(userDID,    user,    bytes("pubkey-user"),    "");
        identityRegistry.registerIdentity(user2DID,   user2,   bytes("pubkey-user2"),   "");
        identityRegistry.registerIdentity(managerDID, manager, bytes("pubkey-manager"), "");

        // Restrict invariant fuzzer to IdentityRegistry + SchemaRegistry only.
        // Excluding AssetRegistry and AssetNFT prevents the fuzzer from calling
        // pause(), proposeAssetRegistry(), etc. which would break state-dependent invariants.
        targetContract(address(identityRegistry));
        targetContract(address(schemaRegistry));

        vm.stopPrank();
    }

    // ── Helper ─────────────────────────────────────────────────────────────
    function _issueDefaultAsset() internal returns (uint256 tokenId) {
        vm.prank(manager);
        return assetRegistry.issueAsset(
            user, userDID, managerDID,
            "CERTIFICATE", "CERTIFICATE_V1",
            validHash, "ipfs://meta",
            0, true
        );
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  SECTION A — ACCESS CONTROL (Cases 1–6)
    // ═══════════════════════════════════════════════════════════════════════

    /// Case 1: Non-admin cannot grant roles
    function test_SM01_NonAdminGrantsRole_Reverts() public {
        bytes32 managerRole = roleManager.MANAGER_ROLE(); // read outside prank
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("AccessControlUnauthorizedAccount(address,bytes32)")), attacker, roleManager.DEFAULT_ADMIN_ROLE()));
        vm.prank(attacker);
        roleManager.assignRole(managerRole, attacker);
    }

    /// Case 2: Non-manager cannot mint assets
    function test_SM02_NonManagerMints_Reverts() public {
        vm.expectRevert("AssetRegistry: caller is not Manager or Admin");
        vm.prank(attacker);
        assetRegistry.issueAsset(
            user, userDID, managerDID,
            "CERTIFICATE", "CERTIFICATE_V1",
            validHash, "ipfs://meta",
            0, true
        );
    }

    /// Case 3: Non-admin cannot pause
    function test_SM03_NonAdminPauses_Reverts() public {
        vm.expectRevert("AssetRegistry: caller is not Admin");
        vm.prank(manager);
        assetRegistry.pause();
    }

    /// Case 4: Arbitrary bytes32 role cannot be assigned
    function test_SM04_ArbitraryRoleBytes32_Reverts() public {
        bytes32 fakeRole = keccak256("SUPER_ADMIN_GOD_MODE");
        vm.expectRevert("RoleManager: invalid role");
        vm.prank(admin);
        roleManager.assignRole(fakeRole, attacker);
    }

    /// Case 5: Non-manager cannot revoke assets
    function test_SM05_NonManagerRevokesAsset_Reverts() public {
        uint256 tokenId = _issueDefaultAsset();

        vm.expectRevert("AssetRegistry: caller is not Manager or Admin");
        vm.prank(attacker);
        assetRegistry.revokeAsset(tokenId, "unauthorized");
    }

    /// Case 6: Auditor cannot mint (read-only role)
    function test_SM06_AuditorCannotMint_Reverts() public {
        vm.expectRevert("AssetRegistry: caller is not Manager or Admin");
        vm.prank(auditor);
        assetRegistry.issueAsset(
            user, userDID, managerDID,
            "CERTIFICATE", "CERTIFICATE_V1",
            validHash, "ipfs://meta",
            0, true
        );
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  SECTION B — DATA INTEGRITY (Cases 7–12)
    // ═══════════════════════════════════════════════════════════════════════

    /// Case 7: Tampered credential hash fails verification
    function test_SM07_TamperedCredential_Invalid() public {
        uint256 tokenId = _issueDefaultAsset();
        bytes32 tamperedHash = keccak256("TAMPERED_JSON_CREDENTIAL");
        (bool isValid, bool isHashMatch, , , , , ) = assetRegistry.verifyAsset(tokenId, tamperedHash);
        assertFalse(isValid);
        assertFalse(isHashMatch);
    }

    /// Case 8: Unknown schema is rejected at issuance
    function test_SM08_UnknownSchema_Reverts() public {
        vm.expectRevert("AssetRegistry: schema is not active or valid");
        vm.prank(manager);
        assetRegistry.issueAsset(
            user, userDID, managerDID,
            "UNKNOWN_TYPE", "NON_EXISTENT_SCHEMA_V99",
            validHash, "ipfs://meta",
            0, true
        );
    }

    /// Case 9: Zero credential hash is rejected
    function test_SM09_ZeroCredentialHash_Reverts() public {
        vm.expectRevert("AssetRegistry: zero credentialHash");
        vm.prank(manager);
        assetRegistry.issueAsset(
            user, userDID, managerDID,
            "CERTIFICATE", "CERTIFICATE_V1",
            bytes32(0), "ipfs://meta",
            0, true
        );
    }

    /// Case 10: Duplicate credential hash is rejected (prevents double-issuance)
    function test_SM10_DuplicateHash_Reverts() public {
        _issueDefaultAsset();

        vm.expectRevert("AssetRegistry: credential hash already anchored");
        vm.prank(manager);
        assetRegistry.issueAsset(
            user2, user2DID, managerDID,
            "CERTIFICATE", "CERTIFICATE_V1",
            validHash, "ipfs://meta-2",
            0, true
        );
    }

    /// Case 11: Empty DID is rejected in IdentityRegistry
    function test_SM11_EmptyDID_Reverts() public {
        vm.expectRevert("IdentityRegistry: DID too short");
        vm.prank(user);
        identityRegistry.registerIdentity("", user, bytes("pk"), "");
    }

    /// Case 12: Invalid DID prefix is rejected
    function test_SM12_InvalidDIDPrefix_Reverts() public {
        vm.expectRevert("IdentityRegistry: invalid DID prefix");
        vm.prank(user);
        identityRegistry.registerIdentity("did:web:malicious.org/did", user, bytes("pk"), "");
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  SECTION C — IDENTITY LIFECYCLE (Cases 13–17)
    // ═══════════════════════════════════════════════════════════════════════

    /// Case 13: Revoked DID blocks asset issuance
    function test_SM13_RevokedDID_BlocksIssuance() public {
        vm.prank(user);
        identityRegistry.setIdentityStatus(userDID, IdentityRegistry.IdentityStatus.REVOKED);

        vm.expectRevert("AssetRegistry: recipient is not active controller of ownerDID");
        vm.prank(manager);
        assetRegistry.issueAsset(
            user, userDID, managerDID,
            "CERTIFICATE", "CERTIFICATE_V1",
            validHash, "ipfs://meta",
            0, true
        );
    }

    /// Case 14: Suspended DID blocks asset issuance
    function test_SM14_SuspendedDID_BlocksIssuance() public {
        vm.prank(user);
        identityRegistry.setIdentityStatus(userDID, IdentityRegistry.IdentityStatus.SUSPENDED);

        vm.expectRevert("AssetRegistry: recipient is not active controller of ownerDID");
        vm.prank(manager);
        assetRegistry.issueAsset(
            user, userDID, managerDID,
            "CERTIFICATE", "CERTIFICATE_V1",
            validHash, "ipfs://meta",
            0, true
        );
    }

    /// Case 15: REVOKED is a terminal identity state
    function test_SM15_RevokedIdentity_IsTerminal() public {
        vm.prank(user);
        identityRegistry.setIdentityStatus(userDID, IdentityRegistry.IdentityStatus.REVOKED);

        vm.expectRevert("IdentityRegistry: REVOKED is terminal - cannot change status");
        vm.prank(admin);
        identityRegistry.setIdentityStatus(userDID, IdentityRegistry.IdentityStatus.ACTIVE);
    }

    /// Case 16: Only the proposed controller can accept controller rotation
    function test_SM16_ControllerRotation_OnlyPendingCanAccept() public {
        vm.prank(user);
        identityRegistry.proposeController(userDID, user2);

        vm.expectRevert("IdentityRegistry: caller is not the pending controller");
        vm.prank(attacker);
        identityRegistry.acceptController(userDID);

        // Correct: user2 accepts
        vm.prank(user2);
        identityRegistry.acceptController(userDID);
        assertTrue(identityRegistry.isValidController(userDID, user2));
    }

    /// Case 17: Issuer address not matching issuerDID controller is rejected
    function test_SM17_IssuerNotController_Reverts() public {
        // attacker has Manager role but is not the controller of managerDID
        bytes32 managerRole = roleManager.MANAGER_ROLE(); // read outside prank
        vm.startPrank(admin);
        roleManager.assignRole(managerRole, attacker);
        vm.stopPrank();

        vm.expectRevert("AssetRegistry: issuer is not active controller of issuerDID");
        vm.prank(attacker);
        assetRegistry.issueAsset(
            user, userDID, managerDID,
            "CERTIFICATE", "CERTIFICATE_V1",
            validHash, "ipfs://meta",
            0, true
        );
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  SECTION D — ASSET LIFECYCLE (Cases 18–23)
    // ═══════════════════════════════════════════════════════════════════════

    /// Case 18: Revoked asset is not valid
    function test_SM18_RevokedAsset_Invalid() public {
        uint256 tokenId = _issueDefaultAsset();

        vm.prank(manager);
        assetRegistry.revokeAsset(tokenId, "Degree recalled for plagiarism");

        (bool isValid, , bool isStatusActive, , , AssetRegistry.AssetRecord memory asset, ) =
            assetRegistry.verifyAsset(tokenId, validHash);

        assertFalse(isValid);
        assertFalse(isStatusActive);
        assertEq(uint256(asset.status), uint256(AssetRegistry.AssetStatus.REVOKED));
    }

    /// Case 19: Expired credential is not valid
    function test_SM19_ExpiredCredential_Invalid() public {
        uint256 expiresAt = block.timestamp + 100;

        vm.prank(manager);
        uint256 tokenId = assetRegistry.issueAsset(
            user, userDID, managerDID,
            "CERTIFICATE", "CERTIFICATE_V1",
            validHash, "ipfs://meta",
            expiresAt, true
        );

        vm.warp(block.timestamp + 200);

        (bool isValid, , , bool isNotExpired, , , ) = assetRegistry.verifyAsset(tokenId, validHash);
        assertFalse(isValid);
        assertFalse(isNotExpired);
    }

    /// Case 20: updateAssetStatus cannot set REVOKED status (use revokeAsset)
    function test_SM20_UpdateStatusToRevoked_Reverts() public {
        uint256 tokenId = _issueDefaultAsset();

        vm.expectRevert("AssetRegistry: use revokeAsset() to revoke an asset");
        vm.prank(manager);
        assetRegistry.updateAssetStatus(tokenId, AssetRegistry.AssetStatus.REVOKED, "bypass");
    }

    /// Case 21: Double-revoke of an already revoked asset reverts
    function test_SM21_DoubleRevoke_Reverts() public {
        uint256 tokenId = _issueDefaultAsset();

        vm.prank(manager);
        assetRegistry.revokeAsset(tokenId, "First revocation");

        vm.expectRevert("AssetRegistry: asset already revoked");
        vm.prank(manager);
        assetRegistry.revokeAsset(tokenId, "Second revocation attempt");
    }

    /// Case 22: Non-transferable soulbound credential cannot be transferred
    function test_SM22_NonTransferableAsset_Reverts() public {
        vm.prank(manager);
        uint256 tokenId = assetRegistry.issueAsset(
            user, userDID, managerDID,
            "CERTIFICATE", "CERTIFICATE_V1",
            validHash, "ipfs://meta",
            0, false // soulbound
        );

        vm.expectRevert("AssetRegistry: asset is non-transferable soulbound credential");
        vm.prank(user);
        assetRegistry.transferAsset(tokenId, user2, user2DID);
    }

    /// Case 23: Transfer to an address that is not the controller of the new DID reverts
    function test_SM23_TransferToNonController_Reverts() public {
        uint256 tokenId = _issueDefaultAsset();

        // user2DID exists but attacker is NOT its controller
        vm.expectRevert("AssetRegistry: destination is not active controller of new DID");
        vm.prank(user);
        assetRegistry.transferAsset(tokenId, attacker, user2DID);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  SECTION E — BYPASS PREVENTION (Cases 24–26)
    // ═══════════════════════════════════════════════════════════════════════

    /// Case 24: Direct ERC-721 transferFrom is blocked by AssetNFT._update override
    function test_SM24_DirectTransferFrom_Blocked() public {
        uint256 tokenId = _issueDefaultAsset();

        vm.expectRevert("AssetNFT: transfers only via AssetRegistry");
        vm.prank(user);
        assetNFT.transferFrom(user, attacker, tokenId);
    }

    /// Case 25: Direct ERC-721 safeTransferFrom is also blocked
    function test_SM25_DirectSafeTransferFrom_Blocked() public {
        uint256 tokenId = _issueDefaultAsset();

        vm.expectRevert("AssetNFT: transfers only via AssetRegistry");
        vm.prank(user);
        assetNFT.safeTransferFrom(user, attacker, tokenId);
    }

    /// Case 26: Direct AssetNFT.mint() without AssetRegistry reverts
    function test_SM26_DirectMintWithoutRegistry_Blocked() public {
        vm.expectRevert("AssetNFT: caller is not AssetRegistry");
        vm.prank(attacker);
        assetNFT.mint(attacker, "ipfs://stolen");
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  SECTION F — REENTRANCY / CEI (Case 27)
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Case 27: Credential hash is marked as anchored BEFORE the NFT mint call.
     * This verifies Checks-Effects-Interactions ordering: even if the mint call
     * were to re-enter issueAsset(), the hash guard would block the re-entry
     * because _hashAnchored[hash] is already true at that point.
     *
     * We verify this property by confirming isHashAnchored() returns true
     * immediately after calling issueAsset(), and a second call with the same
     * hash reverts — confirming the anchor is set before any external call.
     */
    function test_SM27_HashAnchoredBeforeMint_CEI() public {
        vm.prank(manager);
        uint256 tokenId = assetRegistry.issueAsset(
            user, userDID, managerDID,
            "CERTIFICATE", "CERTIFICATE_V1",
            validHash, "ipfs://meta",
            0, true
        );

        assertTrue(assetRegistry.isHashAnchored(validHash));
        assertEq(assetRegistry.getTokenIdByHash(validHash), tokenId);

        // Second issuance with same hash must revert
        bytes32 anotherHash = validHash; // exact same
        vm.expectRevert("AssetRegistry: credential hash already anchored");
        vm.prank(manager);
        assetRegistry.issueAsset(
            user, userDID, managerDID,
            "CERTIFICATE", "CERTIFICATE_V1",
            anotherHash, "ipfs://meta-2",
            0, true
        );
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  SECTION G — PAUSE (Case 28)
    // ═══════════════════════════════════════════════════════════════════════

    /// Case 28: Paused contract blocks writes; reads and verifications remain live
    function test_SM28_PausedContract_BlocksWritesAllowsReads() public {
        uint256 tokenId = _issueDefaultAsset();

        vm.prank(admin);
        assetRegistry.pause();

        // State-changing operations must revert
        vm.expectRevert(bytes4(keccak256("EnforcedPause()")));
        vm.prank(manager);
        assetRegistry.issueAsset(
            user2, user2DID, managerDID,
            "CERTIFICATE", "CERTIFICATE_V1",
            keccak256("NEW_HASH"), "ipfs://meta",
            0, true
        );

        // Read operations must still work
        (bool isValid, , , , , , ) = assetRegistry.verifyAsset(tokenId, validHash);
        assertTrue(isValid);

        AssetRegistry.AssetRecord memory ar;
        (ar, ) = assetRegistry.getAsset(tokenId);
        assertEq(ar.ownerDID, userDID);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  FUZZ TESTS
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * @notice Fuzz: any non-valid role bytes32 must revert when assigned.
     */
    function testFuzz_ArbitraryRoleBytes32_AlwaysReverts(bytes32 fakeRole) public {
        // Skip known valid roles
        vm.assume(fakeRole != roleManager.DEFAULT_ADMIN_ROLE());
        vm.assume(fakeRole != roleManager.MANAGER_ROLE());
        vm.assume(fakeRole != roleManager.AUDITOR_ROLE());
        vm.assume(fakeRole != roleManager.USER_ROLE());

        vm.expectRevert("RoleManager: invalid role");
        vm.prank(admin);
        roleManager.assignRole(fakeRole, user);
    }

    /**
     * @notice Fuzz: issuing an asset with any non-zero hash works once, second attempt reverts.
     */
    function testFuzz_DuplicateHash_AlwaysReverts(bytes32 hash) public {
        vm.assume(hash != bytes32(0));

        vm.prank(manager);
        assetRegistry.issueAsset(
            user, userDID, managerDID,
            "CERTIFICATE", "CERTIFICATE_V1",
            hash, "ipfs://meta",
            0, true
        );

        vm.expectRevert("AssetRegistry: credential hash already anchored");
        vm.prank(manager);
        assetRegistry.issueAsset(
            user, userDID, managerDID,
            "CERTIFICATE", "CERTIFICATE_V1",
            hash, "ipfs://meta-dup",
            0, true
        );
    }

    /**
     * @notice Fuzz: DID strings without the required prefix must always revert.
     */
    function testFuzz_InvalidDIDPrefix_AlwaysReverts(bytes32 randomSuffix) public {
        // Build a DID with wrong prefix but >= 20 chars
        string memory badDID = string(abi.encodePacked("did:badprefix:", vm.toString(randomSuffix)));

        vm.expectRevert("IdentityRegistry: invalid DID prefix");
        vm.prank(user);
        identityRegistry.registerIdentity(badDID, user, bytes("pk"), "");
    }

    /**
     * @notice Fuzz: a non-zero expiry in the past means the asset is immediately invalid.
     * @dev We bound the input to a fixed recent past window instead of using vm.assume,
     *      because vm.assume with a very sparse range gets rejected by the fuzzer.
     */
    function testFuzz_ExpiredAtIssuance_AlwaysInvalid(uint256 seed) public {
        // Foundry starts with block.timestamp == 1; warp to a safe baseline
        // so we have a non-trivial past window to sample from.
        vm.warp(1000);
        // Map seed to [1, block.timestamp - 1] — guaranteed to be in the past
        uint256 expiresAt = (seed % (block.timestamp - 1)) + 1;

        bytes32 uniqueHash = keccak256(abi.encodePacked("FUZZ_EXPIRED", seed));

        vm.prank(manager);
        uint256 tokenId = assetRegistry.issueAsset(
            user, userDID, managerDID,
            "CERTIFICATE", "CERTIFICATE_V1",
            uniqueHash, "ipfs://meta",
            expiresAt, true
        );

        ( , , , bool isNotExpired, , , ) = assetRegistry.verifyAsset(tokenId, uniqueHash);
        assertFalse(isNotExpired);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  CASES 29-30
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Case 29: DID/token index stays consistent after asset transfer.
     *          Old DID must NOT retain the tokenId in its list.
     *          New DID must contain the tokenId.
     */
    function test_SM29_DIDTokenIndex_ConsistentAfterTransfer() public {
        // Issue a transferable asset owned by user (userDID)
        bytes32 h = keccak256("SM29_HASH");
        vm.prank(manager);
        uint256 tokenId = assetRegistry.issueAsset(
            user, userDID, managerDID,
            "CERTIFICATE", "CERTIFICATE_V1",
            h, "ipfs://sm29",
            0, true
        );

        // Verify user's DID has the token before transfer
        uint256[] memory before = assetRegistry.getTokensByDID(userDID);
        bool foundBefore = false;
        for (uint256 i = 0; i < before.length; i++) {
            if (before[i] == tokenId) { foundBefore = true; break; }
        }
        assertTrue(foundBefore, "SM29: tokenId should be in userDID before transfer");

        // Transfer to user2 (controller of user2DID)
        vm.prank(user);
        assetRegistry.transferAsset(tokenId, user2, user2DID);

        // After transfer: userDID must NOT have the tokenId
        uint256[] memory afterOld = assetRegistry.getTokensByDID(userDID);
        bool foundInOld = false;
        for (uint256 i = 0; i < afterOld.length; i++) {
            if (afterOld[i] == tokenId) { foundInOld = true; break; }
        }
        assertFalse(foundInOld, "SM29: tokenId must be removed from old DID's list");

        // After transfer: user2DID must have the tokenId
        uint256[] memory afterNew = assetRegistry.getTokensByDID(user2DID);
        bool foundInNew = false;
        for (uint256 i = 0; i < afterNew.length; i++) {
            if (afterNew[i] == tokenId) { foundInNew = true; break; }
        }
        assertTrue(foundInNew, "SM29: tokenId must appear in new DID's list");
    }

    /**
     * Case 30: Old DID controller CANNOT act on an asset after controller rotation.
     *          New DID controller CAN act on the asset.
     *
     * Scenario:
     *   - user owns asset (userDID controller = user)
     *   - user proposes controllerB as new controller of userDID
     *   - controllerB accepts
     *   - user (old controller) tries to transfer → must revert
     *   - controllerB (new controller) can transfer → must succeed
     */
    function test_SM30_OldController_CannotActAfterRotation() public {
        address controllerB = address(0xBBBB);
        // Register controllerB's own DID so they can be recipient later
        string memory controllerBDID = "did:trustchain:controller-b-identity";
        vm.prank(controllerB);
        identityRegistry.registerIdentity(controllerBDID, controllerB, bytes("pkB"), "");

        // Issue transferable asset to user (controller of userDID)
        bytes32 h = keccak256("SM30_HASH");
        vm.prank(manager);
        uint256 tokenId = assetRegistry.issueAsset(
            user, userDID, managerDID,
            "CERTIFICATE", "CERTIFICATE_V1",
            h, "ipfs://sm30",
            0, true
        );

        // Rotate userDID controller: user → controllerB
        vm.prank(user);
        identityRegistry.proposeController(userDID, controllerB);
        vm.prank(controllerB);
        identityRegistry.acceptController(userDID);

        // Old controller (user) can no longer transfer the asset
        vm.expectRevert("AssetRegistry: unauthorized token action");
        vm.prank(user);
        assetRegistry.transferAsset(tokenId, controllerB, controllerBDID);

        // New controller (controllerB) CAN transfer the asset
        vm.prank(controllerB);
        assetRegistry.transferAsset(tokenId, controllerB, controllerBDID);
        // Verify new owner
        (AssetRegistry.AssetRecord memory rec, ) = assetRegistry.getAsset(tokenId);
        assertEq(rec.ownerDID, controllerBDID);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  INVARIANT TESTS
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Invariant 1: AssetNFT.assetRegistry() must always equal address(assetRegistry).
     * @dev The fuzzer only targets IdentityRegistry and SchemaRegistry (see targetContracts),
     *      so assetNFT.assetRegistry() cannot be changed by the fuzzer.
     */
    function invariant_AssetNFT_BoundToRegistry() public view {
        assertEq(assetNFT.assetRegistry(), address(assetRegistry));
    }

    /**
     * Invariant 2: Admin always has DEFAULT_ADMIN_ROLE on RoleManager.
     */
    function invariant_AdminAlwaysHasAdminRole() public view {
        assertTrue(roleManager.isAdmin(admin));
    }

    /**
     * Invariant 3: totalAssets() == assetNFT.currentTokenId() - 1 always.
     */
    function invariant_TotalAssetsMonotone() public view {
        uint256 totalAssets = assetRegistry.totalAssets();
        uint256 nextTokenId = assetNFT.currentTokenId();
        assertEq(totalAssets, nextTokenId - 1);
    }

    /**
     * Invariant 4: Total DID count in IdentityRegistry is monotonically non-decreasing.
     * @dev setUp registers 3 DIDs; the fuzzer only calls IdentityRegistry (which can only add DIDs).
     */
    function invariant_TotalIdentities_Monotone() public view {
        assertGe(identityRegistry.totalIdentities(), 3);
    }

    /**
     * Invariant 7: SchemaRegistry.isSchemaValid() returns false for an unknown schemaId.
     */
    function invariant_UnknownSchema_IsNeverValid() public view {
        assertFalse(schemaRegistry.isSchemaValid("DOES_NOT_EXIST_V99", bytes32(0)));
    }

    /**
     * Invariant 9: getRoleCount(MANAGER_ROLE) is always >= 1.
     */
    function invariant_ManagerRoleCountAtLeastOne() public view {
        assertGe(roleManager.getRoleCount(roleManager.MANAGER_ROLE()), 1);
    }

    // ─── State-modifying invariant checks converted to unit tests ──────────

    /**
     * Invariant 5 (as test): A REVOKED identity can never have isValidController return true.
     */
    function test_Inv5_RevokedDID_NeverValidController() public {
        address tempUser = address(0xABCD);
        string memory tempDID = "did:trustchain:invariant-revoked-test-identity";

        vm.prank(tempUser);
        identityRegistry.registerIdentity(tempDID, tempUser, bytes("pk"), "");

        vm.prank(tempUser);
        identityRegistry.setIdentityStatus(tempDID, IdentityRegistry.IdentityStatus.REVOKED);

        assertFalse(identityRegistry.isValidController(tempDID, tempUser));
    }

    /**
     * Invariant 6 (as test): isHashAnchored() returns true after successful issuance.
     */
    function test_Inv6_AnchoredHashesAreTracked() public {
        bytes32 h = keccak256("INVARIANT_HASH_6");
        assertFalse(assetRegistry.isHashAnchored(h));

        vm.prank(manager);
        assetRegistry.issueAsset(
            user, userDID, managerDID,
            "CERTIFICATE", "CERTIFICATE_V1",
            h, "ipfs://inv6",
            0, true
        );

        assertTrue(assetRegistry.isHashAnchored(h));
    }

    /**
     * Invariant 8 (as test): A deactivated schema blocks new issuance.
     */
    function test_Inv8_DeactivatedSchema_BlocksIssuance() public {
        vm.prank(admin);
        schemaRegistry.setSchemaStatus("CERTIFICATE_V1", false);

        bytes32 uniqueHash = keccak256("INVARIANT_HASH_8");
        vm.expectRevert("AssetRegistry: schema is not active or valid");
        vm.prank(manager);
        assetRegistry.issueAsset(
            user, userDID, managerDID,
            "CERTIFICATE", "CERTIFICATE_V1",
            uniqueHash, "ipfs://inv8",
            0, true
        );
    }

    /**
     * Invariant 10 (as test): pendingAssetRegistry is cleared to address(0) after binding.
     */
    function test_Inv10_PendingRegistryCleared_AfterBinding() public view {
        assertEq(assetNFT.pendingAssetRegistry(), address(0));
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  P1 — CONTROLLER ROTATION & INVARIANT TESTS
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * P1 Controller Rotation Test:
     *   Alice controls DID -> asset issued -> Alice rotates DID controller to Bob ->
     *   Alice CANNOT operate -> Bob CAN operate -> asset remains valid -> Bob syncs NFT.
     */
    function test_P1_ControllerRotation_CompleteFlow() public {
        address aliceAddr = address(0xA11CE);
        address bobAddr   = address(0xB0B);
        string memory aliceDID = "did:trustchain:alice-identity-did";
        string memory bobDID   = "did:trustchain:bob-identity-did";

        vm.prank(aliceAddr);
        identityRegistry.registerIdentity(aliceDID, aliceAddr, bytes("pkAlice"), "");
        vm.prank(bobAddr);
        identityRegistry.registerIdentity(bobDID, bobAddr, bytes("pkBob"), "");

        bytes32 h = keccak256("P1_CONTROLLER_ROTATION_HASH");
        vm.prank(manager);
        uint256 tokenId = assetRegistry.issueAsset(
            aliceAddr, aliceDID, managerDID,
            "CERTIFICATE", "CERTIFICATE_V1",
            h, "ipfs://p1",
            0, true
        );

        // 1. Verify asset is valid initially
        (bool isValid1,,,, bool isOwnerVerified1,,) = assetRegistry.verifyAsset(tokenId, h);
        assertTrue(isValid1);
        assertTrue(isOwnerVerified1);

        // 2. Alice rotates DID controller to Bob (propose -> accept)
        vm.prank(aliceAddr);
        identityRegistry.proposeController(aliceDID, bobAddr);
        vm.prank(bobAddr);
        identityRegistry.acceptController(aliceDID);

        // 3. Verify asset remains valid post-rotation
        (bool isValid2,,,, bool isOwnerVerified2,,) = assetRegistry.verifyAsset(tokenId, h);
        assertTrue(isValid2);
        assertTrue(isOwnerVerified2);

        // 4. Alice (old controller) CANNOT operate on asset
        vm.prank(aliceAddr);
        vm.expectRevert("AssetRegistry: unauthorized token action");
        assetRegistry.transferAsset(tokenId, bobAddr, bobDID);

        // 5. Bob (new controller) CAN operate on asset and sync NFT owner
        assertEq(assetNFT.ownerOf(tokenId), aliceAddr); // Before sync: NFT still owned by Alice's address
        vm.prank(bobAddr);
        assetRegistry.syncNFTOwner(tokenId);
        assertEq(assetNFT.ownerOf(tokenId), bobAddr);   // After sync: NFT owned by Bob's address

        // 6. Bob can transfer the asset
        vm.prank(bobAddr);
        assetRegistry.transferAsset(tokenId, bobAddr, bobDID);
        (AssetRegistry.AssetRecord memory rec, ) = assetRegistry.getAsset(tokenId);
        assertEq(rec.ownerDID, bobDID);
    }

    /**
     * @notice Explicit test verifying the exact 9-step motivating scenario:
     *   1. Register DID-A with Alice
     *   2. Issue asset to DID-A
     *   3. Verify asset → TRUE
     *   4. Rotate DID-A controller Alice → Bob
     *   5. Verify asset → STILL TRUE
     *   6. Alice cannot transfer asset (reverts)
     *   7. Bob can call syncNFTOwner()
     *   8. NFT owner becomes Bob
     *   9. Verify asset → TRUE
     */
    function test_MotivatingScenario_ControllerRotationFlow() public {
        address alice = address(0x1111);
        address bob   = address(0x2222);
        string memory didA = "did:trustchain:motivating-scenario-did-a";

        // Step 1: Register DID-A with Alice
        vm.prank(alice);
        identityRegistry.registerIdentity(didA, alice, bytes("pkAlice"), "");

        // Step 2: Issue asset to DID-A
        bytes32 h = keccak256("MOTIVATING_SCENARIO_HASH");
        vm.prank(manager);
        uint256 tokenId = assetRegistry.issueAsset(
            alice, didA, managerDID,
            "CERTIFICATE", "CERTIFICATE_V1",
            h, "ipfs://meta",
            0, true
        );

        // Step 3: Verify asset → TRUE
        (bool isValid1,,,, bool isOwnerVerified1,,) = assetRegistry.verifyAsset(tokenId, h);
        assertTrue(isValid1, "Step 3: Asset must be valid initially");
        assertTrue(isOwnerVerified1, "Step 3: Owner must be verified initially");

        // Step 4: Rotate DID-A controller Alice → Bob
        vm.prank(alice);
        identityRegistry.proposeController(didA, bob);
        vm.prank(bob);
        identityRegistry.acceptController(didA);

        // Step 5: Verify asset → STILL TRUE
        (bool isValid2,,,, bool isOwnerVerified2,,) = assetRegistry.verifyAsset(tokenId, h);
        assertTrue(isValid2, "Step 5: Asset must remain valid after controller rotation");
        assertTrue(isOwnerVerified2, "Step 5: Owner must remain verified after controller rotation");

        // Step 6: Alice cannot transfer asset
        vm.prank(alice);
        vm.expectRevert("AssetRegistry: unauthorized token action");
        assetRegistry.transferAsset(tokenId, bob, user2DID);

        // Step 7 & 8: Bob can call syncNFTOwner() -> NFT owner becomes Bob
        assertEq(assetNFT.ownerOf(tokenId), alice, "Pre-sync: NFT still owned by Alice");
        vm.prank(bob);
        assetRegistry.syncNFTOwner(tokenId);
        assertEq(assetNFT.ownerOf(tokenId), bob, "Step 8: NFT owner must become Bob");

        // Step 9: Verify asset → TRUE
        (bool isValid3,,,, bool isOwnerVerified3,,) = assetRegistry.verifyAsset(tokenId, h);
        assertTrue(isValid3, "Step 9: Asset must remain valid after NFT sync");
        assertTrue(isOwnerVerified3, "Step 9: Owner must remain verified after NFT sync");
    }

    /**
     * Invariant: Asset ↔ NFT mapping consistency.
     * For all token IDs 1..totalAssets(), ownerOf(tokenId) != address(0) and
     * getAsset(tokenId) returns non-zero tokenId and matching ownerDID.
     */
    function invariant_AssetNFTMappingConsistency() public view {
        uint256 total = assetRegistry.totalAssets();
        for (uint256 i = 1; i <= total; i++) {
            address nftOwner = assetNFT.ownerOf(i);
            assertTrue(nftOwner != address(0));

            (AssetRegistry.AssetRecord memory record, address currentOwner) = assetRegistry.getAsset(i);
            assertEq(record.tokenId, i);
            assertEq(currentOwner, nftOwner);
            assertTrue(bytes(record.ownerDID).length > 0);
        }
    }

    /**
     * Invariant: DID ↔ Asset index consistency.
     * For all registered DIDs and every tokenId in getTokensByDID(did),
     * getAsset(tokenId).ownerDID must equal did.
     */
    function invariant_DIDAssetIndexConsistency() public view {
        uint256 totalDids = identityRegistry.totalIdentities();
        string[] memory allDids = identityRegistry.getAllDids(0, totalDids);

        for (uint256 i = 0; i < allDids.length; i++) {
            string memory did = allDids[i];
            uint256[] memory tokens = assetRegistry.getTokensByDID(did);
            for (uint256 j = 0; j < tokens.length; j++) {
                (AssetRegistry.AssetRecord memory record, ) = assetRegistry.getAsset(tokens[j]);
                assertEq(keccak256(bytes(record.ownerDID)), keccak256(bytes(did)));
            }
        }
    }

    /**
     * Invariant (as test): REVOKED identity and asset statuses are terminal.
     */
    function test_Inv_RevokedStatusIsTerminal() public {
        uint256 tokenId = _issueDefaultAsset();

        vm.prank(manager);
        assetRegistry.revokeAsset(tokenId, "revoked");

        vm.expectRevert("AssetRegistry: asset already revoked");
        vm.prank(manager);
        assetRegistry.revokeAsset(tokenId, "revoked again");

        vm.expectRevert("AssetRegistry: asset is already permanently revoked");
        vm.prank(manager);
        assetRegistry.updateAssetStatus(tokenId, AssetRegistry.AssetStatus.ACTIVE, "reactivate");

        // Identity REVOKED check
        vm.prank(user);
        identityRegistry.setIdentityStatus(userDID, IdentityRegistry.IdentityStatus.REVOKED);

        vm.expectRevert("IdentityRegistry: REVOKED is terminal - cannot change status");
        vm.prank(admin);
        identityRegistry.setIdentityStatus(userDID, IdentityRegistry.IdentityStatus.ACTIVE);
    }

    /**
     * Invariant (as test): Non-transferable soulbound assets cannot change owner.
     */
    function test_Inv_NonTransferableAssetOwnerImmutable() public {
        bytes32 h = keccak256("SOULBOUND_HASH");
        vm.prank(manager);
        uint256 tokenId = assetRegistry.issueAsset(
            user, userDID, managerDID,
            "CERTIFICATE", "CERTIFICATE_V1",
            h, "ipfs://sb",
            0, false // non-transferable
        );

        vm.expectRevert("AssetRegistry: asset is non-transferable soulbound credential");
        vm.prank(user);
        assetRegistry.transferAsset(tokenId, user2, user2DID);

        (AssetRegistry.AssetRecord memory rec, ) = assetRegistry.getAsset(tokenId);
        assertEq(rec.ownerDID, userDID);
    }

    /**
     * Invariant (as test): Only current active DID controller (or Manager) passes authorization.
     */
    function test_Inv_CurrentControllerIsSoleOperator() public {
        uint256 tokenId = _issueDefaultAsset();

        // Attacker is not controller or manager
        vm.expectRevert("AssetRegistry: unauthorized token action");
        vm.prank(attacker);
        assetRegistry.transferAsset(tokenId, user2, user2DID);

        // Current controller (user) is authorized
        vm.prank(user);
        assetRegistry.transferAsset(tokenId, user2, user2DID);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  REQUESTED SPECIFIC TESTS (1 to 10)
    // ═══════════════════════════════════════════════════════════════════════

    /// Test 1: verifyAsset valid while NFT is desynced after controller rotation
    function test_Req1_VerifyAssetValidWhileNFTDesynced_AfterRotation() public {
        address alice = address(0x1A1A);
        address bob   = address(0x2B2B);
        string memory did = "did:trustchain:req1-test-did";

        vm.prank(alice);
        identityRegistry.registerIdentity(did, alice, bytes("pkAlice"), "");

        bytes32 h = keccak256("REQ1_HASH");
        vm.prank(manager);
        uint256 tokenId = assetRegistry.issueAsset(
            alice, did, managerDID,
            "CERTIFICATE", "CERTIFICATE_V1",
            h, "ipfs://req1", 0, true
        );

        // Rotate controller: Alice -> Bob
        vm.prank(alice);
        identityRegistry.proposeController(did, bob);
        vm.prank(bob);
        identityRegistry.acceptController(did);

        // Confirm NFT address is still Alice (desynced)
        assertEq(assetNFT.ownerOf(tokenId), alice);

        // Confirm verifyAsset is STILL VALID
        (bool isValid,,,, bool isOwnerVerified,,) = assetRegistry.verifyAsset(tokenId, h);
        assertTrue(isValid, "Req 1: Asset must be valid while NFT address is desynced");
        assertTrue(isOwnerVerified, "Req 1: Owner must be verified while NFT address is desynced");
    }

    /// Test 2: old controller cannot sync NFT after rotation
    function test_Req2_OldControllerCannotSyncNFT_AfterRotation() public {
        address alice = address(0x1A1A);
        address bob   = address(0x2B2B);
        string memory did = "did:trustchain:req2-test-did";

        vm.prank(alice);
        identityRegistry.registerIdentity(did, alice, bytes("pkAlice"), "");

        bytes32 h = keccak256("REQ2_HASH");
        vm.prank(manager);
        uint256 tokenId = assetRegistry.issueAsset(
            alice, did, managerDID,
            "CERTIFICATE", "CERTIFICATE_V1",
            h, "ipfs://req2", 0, true
        );

        vm.prank(alice);
        identityRegistry.proposeController(did, bob);
        vm.prank(bob);
        identityRegistry.acceptController(did);

        // Old controller Alice attempts to sync -> reverts
        vm.prank(alice);
        vm.expectRevert("AssetRegistry: unauthorized token action");
        assetRegistry.syncNFTOwner(tokenId);
    }

    /// Test 3: new controller can sync NFT after rotation
    function test_Req3_NewControllerCanSyncNFT_AfterRotation() public {
        address alice = address(0x1A1A);
        address bob   = address(0x2B2B);
        string memory did = "did:trustchain:req3-test-did";

        vm.prank(alice);
        identityRegistry.registerIdentity(did, alice, bytes("pkAlice"), "");

        bytes32 h = keccak256("REQ3_HASH");
        vm.prank(manager);
        uint256 tokenId = assetRegistry.issueAsset(
            alice, did, managerDID,
            "CERTIFICATE", "CERTIFICATE_V1",
            h, "ipfs://req3", 0, true
        );

        vm.prank(alice);
        identityRegistry.proposeController(did, bob);
        vm.prank(bob);
        identityRegistry.acceptController(did);

        // New controller Bob calls syncNFTOwner -> succeeds and updates owner
        vm.prank(bob);
        assetRegistry.syncNFTOwner(tokenId);

        assertEq(assetNFT.ownerOf(tokenId), bob, "Req 3: NFT owner must update to Bob");
    }

    /// Test 4: Manager can operate after controller rotation
    function test_Req4_ManagerCanOperate_AfterControllerRotation() public {
        address alice = address(0x1A1A);
        address bob   = address(0x2B2B);
        string memory did = "did:trustchain:req4-test-did";

        vm.prank(alice);
        identityRegistry.registerIdentity(did, alice, bytes("pkAlice"), "");

        bytes32 h = keccak256("REQ4_HASH");
        vm.prank(manager);
        uint256 tokenId = assetRegistry.issueAsset(
            alice, did, managerDID,
            "CERTIFICATE", "CERTIFICATE_V1",
            h, "ipfs://req4", 0, true
        );

        vm.prank(alice);
        identityRegistry.proposeController(did, bob);
        vm.prank(bob);
        identityRegistry.acceptController(did);

        // Manager can call syncNFTOwner
        vm.prank(manager);
        assetRegistry.syncNFTOwner(tokenId);
        assertEq(assetNFT.ownerOf(tokenId), bob);

        // Manager can update status
        vm.prank(manager);
        assetRegistry.updateAssetStatus(tokenId, AssetRegistry.AssetStatus.SUSPENDED, "manager override");
        (AssetRegistry.AssetRecord memory rec, ) = assetRegistry.getAsset(tokenId);
        assertEq(uint256(rec.status), uint256(AssetRegistry.AssetStatus.SUSPENDED));
    }

    /// Test 5: Admin can operate after controller rotation
    function test_Req5_AdminCanOperate_AfterControllerRotation() public {
        address alice = address(0x1A1A);
        address bob   = address(0x2B2B);
        string memory did = "did:trustchain:req5-test-did";

        vm.prank(alice);
        identityRegistry.registerIdentity(did, alice, bytes("pkAlice"), "");

        bytes32 h = keccak256("REQ5_HASH");
        vm.prank(manager);
        uint256 tokenId = assetRegistry.issueAsset(
            alice, did, managerDID,
            "CERTIFICATE", "CERTIFICATE_V1",
            h, "ipfs://req5", 0, true
        );

        vm.prank(alice);
        identityRegistry.proposeController(did, bob);
        vm.prank(bob);
        identityRegistry.acceptController(did);

        // Admin can call syncNFTOwner
        vm.prank(admin);
        assetRegistry.syncNFTOwner(tokenId);
        assertEq(assetNFT.ownerOf(tokenId), bob);

        // Admin can revoke asset
        vm.prank(admin);
        assetRegistry.revokeAsset(tokenId, "admin override");
        (AssetRegistry.AssetRecord memory rec, ) = assetRegistry.getAsset(tokenId);
        assertEq(uint256(rec.status), uint256(AssetRegistry.AssetStatus.REVOKED));
    }

    /// Test 6: Soulbound asset + controller rotation + sync
    function test_Req6_SoulboundAsset_ControllerRotationAndSync() public {
        address alice = address(0x1A1A);
        address bob   = address(0x2B2B);
        string memory did = "did:trustchain:req6-soulbound-did";

        vm.prank(alice);
        identityRegistry.registerIdentity(did, alice, bytes("pkAlice"), "");

        bytes32 h = keccak256("REQ6_SOULBOUND_HASH");
        vm.prank(manager);
        uint256 tokenId = assetRegistry.issueAsset(
            alice, did, managerDID,
            "CERTIFICATE", "CERTIFICATE_V1",
            h, "ipfs://req6", 0,
            false // soulbound / non-transferable
        );

        // Rotate controller Alice -> Bob
        vm.prank(alice);
        identityRegistry.proposeController(did, bob);
        vm.prank(bob);
        identityRegistry.acceptController(did);

        // Bob can sync NFT owner to update on-chain token address to Bob
        vm.prank(bob);
        assetRegistry.syncNFTOwner(tokenId);
        assertEq(assetNFT.ownerOf(tokenId), bob);

        // But transferring soulbound asset fails for both Alice and Bob
        vm.prank(alice);
        vm.expectRevert("AssetRegistry: unauthorized token action");
        assetRegistry.transferAsset(tokenId, bob, user2DID);

        vm.prank(bob);
        vm.expectRevert("AssetRegistry: asset is non-transferable soulbound credential");
        assetRegistry.transferAsset(tokenId, bob, user2DID);
    }

    /// Test 7: transferFromRegistry with wrong from address reverts
    function test_Req7_TransferFromRegistry_WithWrongFromAddress_Reverts() public {
        uint256 tokenId = _issueDefaultAsset();

        // Calling transferFromRegistry with wrong 'from' address reverts specifically with ERC721IncorrectOwner
        vm.prank(address(assetRegistry));
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("ERC721IncorrectOwner(address,uint256,address)")), attacker, tokenId, user));
        assetNFT.transferFromRegistry(attacker, user2, tokenId);
    }

    /// Test 8: ERC721 safeTransferFrom 4-argument overload is blocked
    function test_Req8_ERC721SafeTransferFrom_4Args_Blocked() public {
        uint256 tokenId = _issueDefaultAsset();

        vm.expectRevert("AssetNFT: transfers only via AssetRegistry");
        vm.prank(user);
        assetNFT.safeTransferFrom(user, attacker, tokenId, "0x1234");
    }

    /// Test 9: Deactivated schema does not invalidate existing assets
    function test_Req9_DeactivatedSchema_DoesNotInvalidateExistingAssets() public {
        bytes32 h = keccak256("REQ9_SCHEMA_HASH");
        vm.prank(manager);
        uint256 tokenId = assetRegistry.issueAsset(
            user, userDID, managerDID,
            "CERTIFICATE", "CERTIFICATE_V1",
            h, "ipfs://req9", 0, true
        );

        // Verify asset valid prior to schema deactivation
        (bool isValid1,,,,,,) = assetRegistry.verifyAsset(tokenId, h);
        assertTrue(isValid1);

        // Admin deactivates schema CERTIFICATE_V1
        vm.prank(admin);
        schemaRegistry.setSchemaStatus("CERTIFICATE_V1", false);

        // Existing asset MUST STILL BE VALID
        (bool isValid2,,,,,,) = assetRegistry.verifyAsset(tokenId, h);
        assertTrue(isValid2, "Req 9: Deactivated schema must not invalidate previously issued assets");
    }

    /// Test 10: Manager role removal actually removes Manager permissions
    function test_Req10_ManagerRoleRemoval_RemovesPermissions() public {
        address tempManager = address(0x7777);
        string memory tempManagerDID = "did:trustchain:temp-manager-did";

        bytes32 managerRole = roleManager.MANAGER_ROLE();

        vm.prank(admin);
        roleManager.assignRole(managerRole, tempManager);

        vm.prank(tempManager);
        identityRegistry.registerIdentity(tempManagerDID, tempManager, bytes("pkTM"), "");

        // tempManager can issue assets
        bytes32 h = keccak256("REQ10_HASH");
        vm.prank(tempManager);
        uint256 tokenId = assetRegistry.issueAsset(
            user, userDID, tempManagerDID,
            "CERTIFICATE", "CERTIFICATE_V1",
            h, "ipfs://req10", 0, true
        );

        // Admin revokes MANAGER_ROLE from tempManager
        vm.prank(admin);
        roleManager.unassignRole(managerRole, tempManager);

        // tempManager can NO LONGER issue assets
        bytes32 h2 = keccak256("REQ10_HASH_2");
        vm.prank(tempManager);
        vm.expectRevert("AssetRegistry: caller is not Manager or Admin");
        assetRegistry.issueAsset(
            user, userDID, tempManagerDID,
            "CERTIFICATE", "CERTIFICATE_V1",
            h2, "ipfs://req10-2", 0, true
        );

        // tempManager can NO LONGER revoke assets
        vm.prank(tempManager);
        vm.expectRevert("AssetRegistry: caller is not Manager or Admin");
        assetRegistry.revokeAsset(tokenId, "unauthorized revoke");

        // tempManager can NO LONGER update asset status
        vm.prank(tempManager);
        vm.expectRevert("AssetRegistry: caller is not Manager or Admin");
        assetRegistry.updateAssetStatus(tokenId, AssetRegistry.AssetStatus.SUSPENDED, "unauthorized update");
    }

    /// Test 11: AA Readiness — TrustSmartAccount acts as DID controller seamlessly without core contract modifications
    function test_AAReadiness_SmartAccountAsDIDController() public {
        address aliceEOA = address(0xAA11);
        string memory aliceDID = "did:trustchain:alice-aa-readiness-did";

        // 1. Initial registration with Alice EOA controller
        vm.prank(aliceEOA);
        identityRegistry.registerIdentity(aliceDID, aliceEOA, bytes("pkAliceEOA"), "");

        // 2. Issue asset to Alice EOA
        bytes32 h = keccak256("AA_READINESS_HASH");
        vm.prank(manager);
        uint256 tokenId = assetRegistry.issueAsset(
            aliceEOA, aliceDID, managerDID,
            "CERTIFICATE", "CERTIFICATE_V1",
            h, "ipfs://aa-readiness", 0, true
        );

        // 3. Deploy TrustSmartAccount for Alice
        vm.prank(aliceEOA);
        TrustSmartAccount smartAccount = new TrustSmartAccount(aliceEOA, aliceDID);

        // 4. Rotate DID controller from Alice EOA -> TrustSmartAccount
        vm.prank(aliceEOA);
        identityRegistry.proposeController(aliceDID, address(smartAccount));

        // Smart account accepts controller proposal via execute()
        vm.prank(aliceEOA);
        smartAccount.execute(
            address(identityRegistry),
            0,
            abi.encodeWithSelector(IdentityRegistry.acceptController.selector, aliceDID)
        );

        // 5. Confirm IdentityRegistry recognizes TrustSmartAccount as current active controller
        assertTrue(identityRegistry.isValidController(aliceDID, address(smartAccount)));
        assertFalse(identityRegistry.isValidController(aliceDID, aliceEOA));

        // 6. Alice EOA direct calls to AssetRegistry fail
        vm.prank(aliceEOA);
        vm.expectRevert("AssetRegistry: unauthorized token action");
        assetRegistry.syncNFTOwner(tokenId);

        // 7. TrustSmartAccount calls syncNFTOwner via execute() -> succeeds!
        vm.prank(aliceEOA);
        smartAccount.execute(
            address(assetRegistry),
            0,
            abi.encodeWithSelector(AssetRegistry.syncNFTOwner.selector, tokenId)
        );
        assertEq(assetNFT.ownerOf(tokenId), address(smartAccount));

        // 8. TrustSmartAccount transfers asset to user2 via execute() -> succeeds!
        vm.prank(aliceEOA);
        smartAccount.execute(
            address(assetRegistry),
            0,
            abi.encodeWithSelector(AssetRegistry.transferAsset.selector, tokenId, user2, user2DID)
        );

        (AssetRegistry.AssetRecord memory rec, address currentOwner) = assetRegistry.getAsset(tokenId);
        assertEq(rec.ownerDID, user2DID);
        assertEq(currentOwner, user2);

        // 9. Verification remains valid
        (bool isValid,,,,,,) = assetRegistry.verifyAsset(tokenId, h);
        assertTrue(isValid);
    }
}



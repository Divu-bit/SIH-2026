// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/RoleManager.sol";
import "../src/IdentityRegistry.sol";

contract IdentityRegistryHarness is IdentityRegistry {
    constructor(address roleManagerAddress) IdentityRegistry(roleManagerAddress) {}

    function exposeRemoveFromController(address controller, string memory did) external {
        _removeFromController(controller, did);
    }

    function exposeOnlyActiveIdentity(string calldata did) external onlyActiveIdentity(did) {}
}

contract IdentityRegistryTest is Test {
    RoleManager public roleManager;
    IdentityRegistry public registry;
    IdentityRegistryHarness public harness;

    address public admin = address(0x1);
    address public manager = address(0x2);
    address public user1 = address(0x10);
    address public user2 = address(0x20);
    address public attacker = address(0x99);

    string public constant DID1 = "did:trustchain:user1_identifier_12345";
    string public constant DID2 = "did:trustchain:user2_identifier_67890";
    string public constant DID3 = "did:trustchain:user1_identifier_99999";

    bytes public pubKey1 = hex"11223344";
    bytes public pubKey2 = hex"55667788";

    event IdentityCreated(string indexed did, address indexed controller, address indexed creator);
    event ControllerProposed(string indexed did, address indexed currentController, address indexed proposedController);
    event ControllerAccepted(string indexed did, address indexed oldController, address indexed newController);
    event IdentityStatusChanged(string indexed did, IdentityRegistry.IdentityStatus previousStatus, IdentityRegistry.IdentityStatus newStatus, address indexed changedBy);
    event PublicKeyUpdated(string indexed did, bytes newPublicKey);
    event MetadataUpdated(string indexed did, string newMetadataUri);

    function setUp() public {
        vm.startPrank(admin);
        roleManager = new RoleManager(admin);
        roleManager.assignRole(roleManager.MANAGER_ROLE(), manager);
        registry = new IdentityRegistry(address(roleManager));
        harness = new IdentityRegistryHarness(address(roleManager));
        vm.stopPrank();
    }

    function test_RemoveFromController_NotPresent_NoOp() public {
        harness.exposeRemoveFromController(user1, DID1);
    }

    function test_OnlyActiveIdentity_Modifier_Paths() public {
        // Non-existent DID -> reverts
        vm.expectRevert("IdentityRegistry: DID does not exist");
        harness.exposeOnlyActiveIdentity(DID1);

        // Register DID -> Active -> succeeds
        vm.prank(admin);
        harness.registerIdentity(DID1, user1, pubKey1, "ipfs://meta1");
        harness.exposeOnlyActiveIdentity(DID1);

        // Suspend DID -> Inactive -> reverts
        vm.prank(user1);
        harness.setIdentityStatus(DID1, IdentityRegistry.IdentityStatus.SUSPENDED);
        vm.expectRevert("IdentityRegistry: identity not active");
        harness.exposeOnlyActiveIdentity(DID1);
    }

    function test_Constructor_ZeroAddress_Reverts() public {
        vm.expectRevert("IdentityRegistry: zero address RoleManager");
        new IdentityRegistry(address(0));
    }

    function test_RegisterIdentity_SelfRegistration_Success() public {
        vm.expectEmit(true, true, true, true);
        emit IdentityCreated(DID1, user1, user1);

        vm.prank(user1);
        registry.registerIdentity(DID1, user1, pubKey1, "ipfs://meta1");

        assertTrue(registry.isValidController(DID1, user1));
        assertEq(registry.getControllerDIDCount(user1), 1);
        assertEq(registry.totalIdentities(), 1);

        string[] memory dids = registry.getDidsByController(user1);
        assertEq(dids.length, 1);
        assertEq(dids[0], DID1);

        IdentityRegistry.Identity memory id = registry.getIdentity(DID1);
        assertEq(id.did, DID1);
        assertEq(id.controller, user1);
        assertEq(id.publicKey, pubKey1);
        assertEq(id.metadataUri, "ipfs://meta1");
        assertTrue(id.status == IdentityRegistry.IdentityStatus.ACTIVE);
    }

    function test_RegisterIdentity_ManagerRegistration_Success() public {
        vm.prank(manager);
        registry.registerIdentity(DID1, user1, pubKey1, "ipfs://meta1");
        assertTrue(registry.isValidController(DID1, user1));
    }

    function test_RegisterIdentity_AdminRegistration_Success() public {
        vm.prank(admin);
        registry.registerIdentity(DID1, user1, pubKey1, "ipfs://meta1");
        assertTrue(registry.isValidController(DID1, user1));
    }

    function test_RegisterIdentity_TooShortDID_Reverts() public {
        vm.prank(user1);
        vm.expectRevert("IdentityRegistry: DID too short");
        registry.registerIdentity("did:trustchain:123", user1, pubKey1, "ipfs://meta");
    }

    function test_RegisterIdentity_InvalidPrefix_Reverts() public {
        vm.prank(user1);
        vm.expectRevert("IdentityRegistry: invalid DID prefix");
        registry.registerIdentity("did:invalidname:123456789", user1, pubKey1, "ipfs://meta");
    }

    function test_RegisterIdentity_ZeroController_Reverts() public {
        vm.prank(admin);
        vm.expectRevert("IdentityRegistry: zero address controller");
        registry.registerIdentity(DID1, address(0), pubKey1, "ipfs://meta");
    }

    function test_RegisterIdentity_DuplicateDID_Reverts() public {
        vm.prank(user1);
        registry.registerIdentity(DID1, user1, pubKey1, "ipfs://meta1");

        vm.prank(user1);
        vm.expectRevert("IdentityRegistry: DID already exists");
        registry.registerIdentity(DID1, user1, pubKey1, "ipfs://meta1");
    }

    function test_RegisterIdentity_UnauthorizedCaller_Reverts() public {
        vm.prank(attacker);
        vm.expectRevert("IdentityRegistry: not authorized to register DID for this controller");
        registry.registerIdentity(DID1, user1, pubKey1, "ipfs://meta1");
    }

    function test_ProposeController_Success_ByControllerAndAdmin() public {
        vm.prank(user1);
        registry.registerIdentity(DID1, user1, pubKey1, "ipfs://meta1");

        // Propose by controller
        vm.expectEmit(true, true, true, true);
        emit ControllerProposed(DID1, user1, user2);

        vm.prank(user1);
        registry.proposeController(DID1, user2);

        IdentityRegistry.Identity memory id = registry.getIdentity(DID1);
        assertEq(id.pendingController, user2);

        // Admin override proposal
        vm.prank(admin);
        registry.proposeController(DID1, attacker);
        id = registry.getIdentity(DID1);
        assertEq(id.pendingController, attacker);
    }

    function test_ProposeController_NonExistentDID_Reverts() public {
        vm.prank(admin);
        vm.expectRevert("IdentityRegistry: DID does not exist");
        registry.proposeController(DID1, user2);
    }

    function test_ProposeController_Unauthorized_Reverts() public {
        vm.prank(user1);
        registry.registerIdentity(DID1, user1, pubKey1, "ipfs://meta1");

        vm.prank(attacker);
        vm.expectRevert("IdentityRegistry: unauthorized caller");
        registry.proposeController(DID1, user2);
    }

    function test_ProposeController_ZeroAddress_Reverts() public {
        vm.prank(user1);
        registry.registerIdentity(DID1, user1, pubKey1, "ipfs://meta1");

        vm.prank(user1);
        vm.expectRevert("IdentityRegistry: zero address controller");
        registry.proposeController(DID1, address(0));
    }

    function test_ProposeController_SameController_Reverts() public {
        vm.prank(user1);
        registry.registerIdentity(DID1, user1, pubKey1, "ipfs://meta1");

        vm.prank(user1);
        vm.expectRevert("IdentityRegistry: proposed controller is already the current controller");
        registry.proposeController(DID1, user1);
    }

    function test_AcceptController_Success_AndReverseMappingSwapPop() public {
        // Register two DIDs for user1 to exercise swap-and-pop in _removeFromController
        vm.startPrank(user1);
        registry.registerIdentity(DID1, user1, pubKey1, "ipfs://meta1");
        registry.registerIdentity(DID3, user1, pubKey1, "ipfs://meta3");
        vm.stopPrank();

        assertEq(registry.getControllerDIDCount(user1), 2);

        // Propose user2 for DID1
        vm.prank(user1);
        registry.proposeController(DID1, user2);

        // Accept by user2
        vm.expectEmit(true, true, true, true);
        emit ControllerAccepted(DID1, user1, user2);

        vm.prank(user2);
        registry.acceptController(DID1);

        // Verify reverse mappings updated
        assertEq(registry.getControllerDIDCount(user1), 1);
        assertEq(registry.getDidsByController(user1)[0], DID3);

        assertEq(registry.getControllerDIDCount(user2), 1);
        assertEq(registry.getDidsByController(user2)[0], DID1);

        assertTrue(registry.isValidController(DID1, user2));
        assertFalse(registry.isValidController(DID1, user1));
    }

    function test_AcceptController_NonExistentDID_Reverts() public {
        vm.prank(user2);
        vm.expectRevert("IdentityRegistry: DID does not exist");
        registry.acceptController(DID1);
    }

    function test_AcceptController_NoPendingController_Reverts() public {
        vm.prank(user1);
        registry.registerIdentity(DID1, user1, pubKey1, "ipfs://meta1");

        vm.prank(user2);
        vm.expectRevert("IdentityRegistry: no pending controller");
        registry.acceptController(DID1);
    }

    function test_AcceptController_CallerNotPending_Reverts() public {
        vm.prank(user1);
        registry.registerIdentity(DID1, user1, pubKey1, "ipfs://meta1");

        vm.prank(user1);
        registry.proposeController(DID1, user2);

        vm.prank(attacker);
        vm.expectRevert("IdentityRegistry: caller is not the pending controller");
        registry.acceptController(DID1);
    }

    function test_UpdatePublicKey_Success() public {
        vm.prank(user1);
        registry.registerIdentity(DID1, user1, pubKey1, "ipfs://meta1");

        vm.expectEmit(true, false, false, true);
        emit PublicKeyUpdated(DID1, pubKey2);

        vm.prank(user1);
        registry.updatePublicKey(DID1, pubKey2);

        IdentityRegistry.Identity memory id = registry.getIdentity(DID1);
        assertEq(id.publicKey, pubKey2);
    }

    function test_UpdatePublicKey_Unauthorized_Reverts() public {
        vm.prank(user1);
        registry.registerIdentity(DID1, user1, pubKey1, "ipfs://meta1");

        vm.prank(attacker);
        vm.expectRevert("IdentityRegistry: unauthorized caller");
        registry.updatePublicKey(DID1, pubKey2);
    }

    function test_UpdateMetadataUri_Success() public {
        vm.prank(user1);
        registry.registerIdentity(DID1, user1, pubKey1, "ipfs://meta1");

        vm.expectEmit(true, false, false, true);
        emit MetadataUpdated(DID1, "ipfs://meta2");

        vm.prank(user1);
        registry.updateMetadataUri(DID1, "ipfs://meta2");

        IdentityRegistry.Identity memory id = registry.getIdentity(DID1);
        assertEq(id.metadataUri, "ipfs://meta2");
    }

    function test_UpdateMetadataUri_Unauthorized_Reverts() public {
        vm.prank(user1);
        registry.registerIdentity(DID1, user1, pubKey1, "ipfs://meta1");

        vm.prank(attacker);
        vm.expectRevert("IdentityRegistry: unauthorized caller");
        registry.updateMetadataUri(DID1, "ipfs://meta2");
    }

    function test_SetIdentityStatus_LifecycleAndRevokedTerminal() public {
        vm.prank(user1);
        registry.registerIdentity(DID1, user1, pubKey1, "ipfs://meta1");

        // Suspend
        vm.expectEmit(true, false, false, true);
        emit IdentityStatusChanged(DID1, IdentityRegistry.IdentityStatus.ACTIVE, IdentityRegistry.IdentityStatus.SUSPENDED, user1);

        vm.prank(user1);
        registry.setIdentityStatus(DID1, IdentityRegistry.IdentityStatus.SUSPENDED);

        assertFalse(registry.isValidController(DID1, user1));

        // Reactivate
        vm.prank(admin);
        registry.setIdentityStatus(DID1, IdentityRegistry.IdentityStatus.ACTIVE);
        assertTrue(registry.isValidController(DID1, user1));

        // Revoke
        vm.prank(user1);
        registry.setIdentityStatus(DID1, IdentityRegistry.IdentityStatus.REVOKED);
        assertFalse(registry.isValidController(DID1, user1));

        // Attempt status change after revocation -> reverts
        vm.prank(admin);
        vm.expectRevert("IdentityRegistry: REVOKED is terminal - cannot change status");
        registry.setIdentityStatus(DID1, IdentityRegistry.IdentityStatus.ACTIVE);
    }

    function test_GetIdentity_NonExistent_Reverts() public {
        vm.expectRevert("IdentityRegistry: DID does not exist");
        registry.getIdentity(DID1);
    }

    function test_IsValidController_FalseScenarios() public {
        // Non-existent DID
        assertFalse(registry.isValidController(DID1, user1));

        // Wrong controller
        vm.prank(user1);
        registry.registerIdentity(DID1, user1, pubKey1, "ipfs://meta1");
        assertFalse(registry.isValidController(DID1, user2));
    }

    function test_GetAllDids_Pagination() public {
        vm.startPrank(admin);
        registry.registerIdentity(DID1, user1, pubKey1, "ipfs://meta1");
        registry.registerIdentity(DID2, user2, pubKey2, "ipfs://meta2");
        vm.stopPrank();

        // Offset out of bounds
        string[] memory emptyList = registry.getAllDids(5, 2);
        assertEq(emptyList.length, 0);

        // Page 1 (limit 1)
        string[] memory page1 = registry.getAllDids(0, 1);
        assertEq(page1.length, 1);
        assertEq(page1[0], DID1);

        // Page 2 (limit 2, spans remaining)
        string[] memory page2 = registry.getAllDids(1, 2);
        assertEq(page2.length, 1);
        assertEq(page2[0], DID2);

        // Full list
        string[] memory fullList = registry.getAllDids(0, 10);
        assertEq(fullList.length, 2);
    }
}

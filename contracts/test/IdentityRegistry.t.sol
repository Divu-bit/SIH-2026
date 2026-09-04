// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/RoleManager.sol";
import "../src/IdentityRegistry.sol";

contract IdentityRegistryTest is Test {
    RoleManager public roleManager;
    IdentityRegistry public identityRegistry;

    address public admin = address(0x1);
    address public manager = address(0x2);
    address public user1 = address(0x3);
    address public user2 = address(0x4);

    string public did1 = "did:trustchain:0x0000000000000000000000000000000000000003";

    function setUp() public {
        vm.startPrank(admin);
        roleManager = new RoleManager(admin);
        roleManager.assignRole(roleManager.MANAGER_ROLE(), manager);
        identityRegistry = new IdentityRegistry(address(roleManager));
        vm.stopPrank();
    }

    function test_RegisterIdentity() public {
        vm.prank(user1);
        identityRegistry.registerIdentity(did1, user1, "pubkey-bytes", "ipfs://did-doc-1");

        IdentityRegistry.Identity memory id = identityRegistry.getIdentity(did1);
        assertEq(id.did, did1);
        assertEq(id.controller, user1);
        assertEq(uint256(id.status), uint256(IdentityRegistry.IdentityStatus.ACTIVE));
        assertTrue(identityRegistry.isValidController(did1, user1));
    }

    function test_CannotRegisterDuplicateDID() public {
        vm.prank(user1);
        identityRegistry.registerIdentity(did1, user1, "pubkey", "");

        vm.expectRevert("IdentityRegistry: DID already exists");
        vm.prank(user1);
        identityRegistry.registerIdentity(did1, user1, "pubkey", "");
    }

    function test_ControllerRotation() public {
        vm.prank(user1);
        identityRegistry.registerIdentity(did1, user1, "pubkey", "");

        vm.prank(user1);
        identityRegistry.updateController(did1, user2);

        assertFalse(identityRegistry.isValidController(did1, user1));
        assertTrue(identityRegistry.isValidController(did1, user2));
    }

    function test_UnauthorizedControllerUpdateReverts() public {
        vm.prank(user1);
        identityRegistry.registerIdentity(did1, user1, "pubkey", "");

        vm.expectRevert("IdentityRegistry: unauthorized caller");
        vm.prank(user2);
        identityRegistry.updateController(did1, user2);
    }

    function test_RevokeIdentity() public {
        vm.prank(user1);
        identityRegistry.registerIdentity(did1, user1, "pubkey", "");

        vm.prank(user1);
        identityRegistry.setIdentityStatus(did1, IdentityRegistry.IdentityStatus.REVOKED);

        assertFalse(identityRegistry.isValidController(did1, user1));
    }
}

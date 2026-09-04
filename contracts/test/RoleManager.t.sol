// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/RoleManager.sol";

contract RoleManagerTest is Test {
    RoleManager public roleManager;

    address public admin = address(0x1);
    address public manager = address(0x2);
    address public auditor = address(0x3);
    address public attacker = address(0x99);

    function setUp() public {
        vm.prank(admin);
        roleManager = new RoleManager(admin);
    }

    function test_InitialRoles() public view {
        assertTrue(roleManager.isAdmin(admin));
        assertTrue(roleManager.isManager(admin));
        assertFalse(roleManager.isManager(manager));
    }

    function test_AdminCanAssignAndRevokeRoles() public {
        bytes32 managerRole = roleManager.MANAGER_ROLE();
        bytes32 auditorRole = roleManager.AUDITOR_ROLE();

        vm.startPrank(admin);
        roleManager.assignRole(managerRole, manager);
        roleManager.assignRole(auditorRole, auditor);
        vm.stopPrank();

        assertTrue(roleManager.isManager(manager));
        assertTrue(roleManager.isAuditor(auditor));

        vm.prank(admin);
        roleManager.unassignRole(managerRole, manager);

        assertFalse(roleManager.isManager(manager));
    }

    function test_NonAdminCannotGrantRole() public {
        bytes32 managerRole = roleManager.MANAGER_ROLE();

        vm.expectRevert();
        vm.prank(attacker);
        roleManager.assignRole(managerRole, attacker);
    }
}

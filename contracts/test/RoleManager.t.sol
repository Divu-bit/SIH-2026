// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/RoleManager.sol";

contract RoleManagerHarness is RoleManager {
    constructor(address initialAdmin) RoleManager(initialAdmin) {}

    function exposeRoleName(bytes32 role) external pure returns (string memory) {
        return _roleName(role);
    }
}

contract RoleManagerTest is Test {
    RoleManager public roleManager;
    RoleManagerHarness public harness;

    address public admin = address(0x1);
    address public manager = address(0x2);
    address public auditor = address(0x3);
    address public user = address(0x4);
    address public attacker = address(0x99);

    event RoleAssigned(
        address indexed account,
        bytes32 indexed role,
        string  roleName,
        address indexed assignedBy
    );

    event RoleUnassigned(
        address indexed account,
        bytes32 indexed role,
        string  roleName,
        address indexed removedBy
    );

    function setUp() public {
        vm.prank(admin);
        roleManager = new RoleManager(admin);

        vm.prank(admin);
        harness = new RoleManagerHarness(admin);
    }

    function test_Constructor_ZeroAddress_Reverts() public {
        vm.expectRevert("RoleManager: zero address admin");
        new RoleManager(address(0));
    }

    function test_InitialRoles() public view {
        assertTrue(roleManager.isAdmin(admin));
        assertTrue(roleManager.isManager(admin));
        assertTrue(roleManager.isAuditor(admin));
        assertTrue(roleManager.isUser(admin));

        assertFalse(roleManager.isAdmin(manager));
        assertFalse(roleManager.isManager(manager));
        assertFalse(roleManager.isAuditor(manager));
        assertFalse(roleManager.isUser(manager));
    }

    function test_AssignRole_Success() public {
        bytes32 managerRole = roleManager.MANAGER_ROLE();

        vm.expectEmit(true, true, false, true);
        emit RoleAssigned(manager, managerRole, "MANAGER_ROLE", admin);

        vm.prank(admin);
        roleManager.assignRole(managerRole, manager);

        assertTrue(roleManager.isManager(manager));
        assertTrue(roleManager.isUser(manager));
    }

    function test_AssignRole_ZeroAddressAccount_Reverts() public {
        bytes32 userRole = roleManager.USER_ROLE();
        vm.prank(admin);
        vm.expectRevert("RoleManager: zero address account");
        roleManager.assignRole(userRole, address(0));
    }

    function test_AssignRole_InvalidRole_Reverts() public {
        bytes32 fakeRole = keccak256("FAKE_ROLE");
        vm.prank(admin);
        vm.expectRevert("RoleManager: invalid role");
        roleManager.assignRole(fakeRole, user);
    }

    function test_AssignRole_NonAdmin_Reverts() public {
        bytes32 userRole = roleManager.USER_ROLE();
        bytes32 adminRole = roleManager.DEFAULT_ADMIN_ROLE();
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("AccessControlUnauthorizedAccount(address,bytes32)")), attacker, adminRole));
        vm.prank(attacker);
        roleManager.assignRole(userRole, user);
    }

    function test_UnassignRole_Success() public {
        bytes32 auditorRole = roleManager.AUDITOR_ROLE();

        vm.prank(admin);
        roleManager.assignRole(auditorRole, auditor);
        assertTrue(roleManager.isAuditor(auditor));

        vm.expectEmit(true, true, false, true);
        emit RoleUnassigned(auditor, auditorRole, "AUDITOR_ROLE", admin);

        vm.prank(admin);
        roleManager.unassignRole(auditorRole, auditor);

        assertFalse(roleManager.isAuditor(auditor));
    }

    function test_UnassignRole_InvalidRole_Reverts() public {
        bytes32 fakeRole = keccak256("INVALID");
        vm.prank(admin);
        vm.expectRevert("RoleManager: invalid role");
        roleManager.unassignRole(fakeRole, manager);
    }

    function test_UnassignRole_NonAdmin_Reverts() public {
        bytes32 managerRole = roleManager.MANAGER_ROLE();
        bytes32 adminRole = roleManager.DEFAULT_ADMIN_ROLE();
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("AccessControlUnauthorizedAccount(address,bytes32)")), attacker, adminRole));
        vm.prank(attacker);
        roleManager.unassignRole(managerRole, manager);
    }

    function test_RoleChecks_AllRoles() public {
        bytes32 adminRole   = roleManager.ADMIN_ROLE();
        bytes32 managerRole = roleManager.MANAGER_ROLE();
        bytes32 auditorRole = roleManager.AUDITOR_ROLE();
        bytes32 userRole    = roleManager.USER_ROLE();

        vm.startPrank(admin);
        roleManager.assignRole(managerRole, manager);
        roleManager.assignRole(auditorRole, auditor);
        roleManager.assignRole(userRole, user);
        vm.stopPrank();

        // Admin
        assertTrue(roleManager.isAdmin(admin));
        assertTrue(roleManager.isManager(admin));
        assertTrue(roleManager.isAuditor(admin));
        assertTrue(roleManager.isUser(admin));

        // Manager
        assertFalse(roleManager.isAdmin(manager));
        assertTrue(roleManager.isManager(manager));
        assertFalse(roleManager.isAuditor(manager));
        assertTrue(roleManager.isUser(manager));

        // Auditor
        assertFalse(roleManager.isAdmin(auditor));
        assertFalse(roleManager.isManager(auditor));
        assertTrue(roleManager.isAuditor(auditor));
        assertFalse(roleManager.isUser(auditor));

        // User
        assertFalse(roleManager.isAdmin(user));
        assertFalse(roleManager.isManager(user));
        assertFalse(roleManager.isAuditor(user));
        assertTrue(roleManager.isUser(user));

        // Unassigned
        assertFalse(roleManager.isAdmin(attacker));
        assertFalse(roleManager.isManager(attacker));
        assertFalse(roleManager.isAuditor(attacker));
        assertFalse(roleManager.isUser(attacker));

        // Counts
        assertEq(roleManager.getRoleCount(adminRole), 1);
        assertEq(roleManager.getRoleCount(managerRole), 2); // admin + manager
        assertEq(roleManager.getRoleCount(auditorRole), 1);
        assertEq(roleManager.getRoleCount(userRole), 1);
    }

    function test_GetRoleCount_InvalidRole_Reverts() public {
        bytes32 fakeRole = keccak256("FAKE");
        vm.expectRevert("RoleManager: invalid role");
        roleManager.getRoleCount(fakeRole);
    }

    function test_RoleName_Unknown_Fallback() public view {
        bytes32 fakeRole = keccak256("UNKNOWN_ROLE");
        string memory name = harness.exposeRoleName(fakeRole);
        assertEq(name, "UNKNOWN");
    }

    function test_AssignAndUnassignAllRoles_Coverage() public {
        bytes32 adminRole = roleManager.ADMIN_ROLE();
        bytes32 userRole = roleManager.USER_ROLE();

        vm.startPrank(admin);
        roleManager.assignRole(adminRole, user);
        roleManager.assignRole(userRole, auditor);

        roleManager.unassignRole(adminRole, user);
        roleManager.unassignRole(userRole, auditor);
        vm.stopPrank();
    }
}

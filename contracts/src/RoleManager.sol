// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title RoleManager
 * @dev Centralized on-chain Role-Based Access Control (RBAC) governance contract.
 * Enforces ADMIN, MANAGER, AUDITOR, and USER roles for the TrustChain platform.
 */
contract RoleManager is AccessControl {
    bytes32 public constant ADMIN_ROLE = DEFAULT_ADMIN_ROLE;
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");
    bytes32 public constant USER_ROLE = keccak256("USER_ROLE");

    event PermissionUpdated(address indexed account, bytes32 indexed role, bool enabled, address indexed updatedBy);

    constructor(address initialAdmin) {
        require(initialAdmin != address(0), "RoleManager: zero address admin");
        _grantRole(DEFAULT_ADMIN_ROLE, initialAdmin);
        _grantRole(ADMIN_ROLE, initialAdmin);
        _grantRole(MANAGER_ROLE, initialAdmin);
    }

    /**
     * @notice Checks if an account has admin privileges
     */
    function isAdmin(address account) external view returns (bool) {
        return hasRole(ADMIN_ROLE, account);
    }

    /**
     * @notice Checks if an account has asset management / issuance privileges
     */
    function isManager(address account) external view returns (bool) {
        return hasRole(MANAGER_ROLE, account) || hasRole(ADMIN_ROLE, account);
    }

    /**
     * @notice Checks if an account has auditing privileges
     */
    function isAuditor(address account) external view returns (bool) {
        return hasRole(AUDITOR_ROLE, account) || hasRole(ADMIN_ROLE, account);
    }

    /**
     * @notice Checks if an account has user privileges
     */
    function isUser(address account) external view returns (bool) {
        return hasRole(USER_ROLE, account) || hasRole(ADMIN_ROLE, account) || hasRole(MANAGER_ROLE, account);
    }

    /**
     * @notice Assigns a role to an account (Only Admin)
     */
    function assignRole(bytes32 role, address account) external onlyRole(ADMIN_ROLE) {
        require(account != address(0), "RoleManager: zero address account");
        grantRole(role, account);
        emit PermissionUpdated(account, role, true, msg.sender);
    }

    /**
     * @notice Revokes a role from an account (Only Admin)
     */
    function unassignRole(bytes32 role, address account) external onlyRole(ADMIN_ROLE) {
        revokeRole(role, account);
        emit PermissionUpdated(account, role, false, msg.sender);
    }
}

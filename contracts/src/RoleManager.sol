// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/extensions/AccessControlEnumerable.sol";

/**
 * @title RoleManager
 * @notice Centralized on-chain Role-Based Access Control (RBAC) governance contract.
 * @dev Enforces ADMIN, MANAGER, AUDITOR, and USER roles for the TrustChain platform.
 *      Only the four defined application roles may be assigned. Arbitrary role bytes32
 *      values are rejected to prevent privilege escalation via unknown roles.
 */
contract RoleManager is AccessControlEnumerable {
    // -------------------------------------------------------------------------
    // Roles
    // -------------------------------------------------------------------------
    bytes32 public constant ADMIN_ROLE   = DEFAULT_ADMIN_ROLE;
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    bytes32 public constant AUDITOR_ROLE = keccak256("AUDITOR_ROLE");
    bytes32 public constant USER_ROLE    = keccak256("USER_ROLE");

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------
    /// @notice Emitted when a role is assigned or revoked.
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

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    constructor(address initialAdmin) {
        if (initialAdmin == address(0)) revert("RoleManager: zero address admin");
        _grantRole(DEFAULT_ADMIN_ROLE, initialAdmin);
        _grantRole(MANAGER_ROLE,       initialAdmin);
    }

    // -------------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------------

    /**
     * @dev Ensures that `role` is one of the four platform-defined roles.
     *      Rejects arbitrary bytes32 values to prevent privilege escalation.
     */
    function _requireValidRole(bytes32 role) internal pure {
        if (role == DEFAULT_ADMIN_ROLE || role == MANAGER_ROLE || role == AUDITOR_ROLE || role == USER_ROLE) {
            return;
        }
        revert("RoleManager: invalid role");
    }

    /**
     * @dev Returns a human-readable name for a known role (for event indexing).
     */
    function _roleName(bytes32 role) internal pure returns (string memory) {
        if (role == DEFAULT_ADMIN_ROLE) return "ADMIN_ROLE";
        if (role == MANAGER_ROLE)       return "MANAGER_ROLE";
        if (role == AUDITOR_ROLE)       return "AUDITOR_ROLE";
        if (role == USER_ROLE)          return "USER_ROLE";
        return "UNKNOWN";
    }

    // -------------------------------------------------------------------------
    // External write functions
    // -------------------------------------------------------------------------

    /**
     * @notice Assigns one of the four platform roles to an account.
     * @dev Restricted to ADMIN_ROLE. Rejects arbitrary role bytes32 values.
     */
    function assignRole(bytes32 role, address account)
        external
        onlyRole(ADMIN_ROLE)
    {
        if (account == address(0)) revert("RoleManager: zero address account");
        _requireValidRole(role);
        grantRole(role, account);
        emit RoleAssigned(account, role, _roleName(role), msg.sender);
    }

    /**
     * @notice Revokes a platform role from an account.
     * @dev Restricted to ADMIN_ROLE.
     */
    function unassignRole(bytes32 role, address account)
        external
        onlyRole(ADMIN_ROLE)
    {
        _requireValidRole(role);
        revokeRole(role, account);
        emit RoleUnassigned(account, role, _roleName(role), msg.sender);
    }

    // -------------------------------------------------------------------------
    // External view functions
    // -------------------------------------------------------------------------

    /// @notice Returns true if `account` has the ADMIN role.
    function isAdmin(address account) external view returns (bool) {
        return hasRole(ADMIN_ROLE, account);
    }

    /// @notice Returns true if `account` has MANAGER or ADMIN role.
    function isManager(address account) external view returns (bool) {
        return hasRole(MANAGER_ROLE, account) || hasRole(ADMIN_ROLE, account);
    }

    /// @notice Returns true if `account` has AUDITOR or ADMIN role.
    function isAuditor(address account) external view returns (bool) {
        return hasRole(AUDITOR_ROLE, account) || hasRole(ADMIN_ROLE, account);
    }

    /// @notice Returns true if `account` has USER, MANAGER, or ADMIN role.
    function isUser(address account) external view returns (bool) {
        return hasRole(USER_ROLE, account)
            || hasRole(MANAGER_ROLE, account)
            || hasRole(ADMIN_ROLE, account);
    }

    /**
     * @notice Returns the number of accounts that currently hold a given platform role.
     */
    function getRoleCount(bytes32 role) external view returns (uint256) {
        _requireValidRole(role);
        return getRoleMemberCount(role);
    }
}

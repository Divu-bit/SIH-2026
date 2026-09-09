// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./RoleManager.sol";

/**
 * @title SchemaRegistry
 * @notice On-chain registry of approved credential and asset schemas.
 * @dev Security properties:
 *   - Only Manager or Admin can register/deactivate schemas.
 *   - A non-empty schemaUri is mandatory on registration.
 *   - Deactivating a schema stops NEW asset issuance using that schema,
 *     but does NOT retroactively invalidate existing assets — historical
 *     assets must remain verifiable against the schema that was active
 *     at the time of issuance (spec §8).
 *   - Deactivation is an emergency operation (e.g. schema has a flaw);
 *     requiring an alternative schema version is not enforced on-chain.
 */
contract SchemaRegistry {

    // -------------------------------------------------------------------------
    // Types
    // -------------------------------------------------------------------------

    struct Schema {
        string  schemaId;       // e.g. "CERTIFICATE_V1"
        string  name;           // "Academic & Professional Certificate"
        string  schemaUri;      // URI / IPFS CID pointing to JSON Schema document
        bytes32 schemaHash;     // Keccak-256 hash of canonical schema JSON
        string  version;        // "1.0.0"
        address author;         // Entity that registered the schema
        bool    isActive;
        uint256 registeredAt;
    }

    // -------------------------------------------------------------------------
    // State
    // -------------------------------------------------------------------------

    RoleManager public immutable roleManager;

    mapping(string => Schema) private _schemas;
    mapping(string => bool)   private _schemaExists;
    string[] private _allSchemaIds;

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    event SchemaRegistered(
        string  indexed schemaId,
        bytes32 indexed schemaHash,
        string          schemaUri,
        address indexed author
    );
    event SchemaStatusChanged(
        string  indexed schemaId,
        bool            isActive,
        address indexed updatedBy
    );

    // -------------------------------------------------------------------------
    // Modifiers
    // -------------------------------------------------------------------------

    modifier onlyManagerOrAdmin() {
        if (!roleManager.isManager(msg.sender)) {
            revert("SchemaRegistry: caller is not Manager or Admin");
        }
        _;
    }

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor(address roleManagerAddress) {
        if (roleManagerAddress == address(0)) revert("SchemaRegistry: zero address RoleManager");
        roleManager = RoleManager(roleManagerAddress);
    }

    // -------------------------------------------------------------------------
    // External write functions
    // -------------------------------------------------------------------------

    /**
     * @notice Registers a new credential/asset schema on-chain.
     * @param schemaId    Unique identifier, e.g. "CERTIFICATE_V1"
     * @param name        Human-readable schema name
     * @param schemaUri   IPFS CID or URI pointing to the canonical JSON Schema document.
     *                    MUST be non-empty — a schema without a resolvable reference
     *                    is not meaningful for verification.
     * @param schemaHash  Keccak-256 hash of the canonical schema JSON
     * @param version     Semantic version string, e.g. "1.0.0"
     */
    function registerSchema(
        string  calldata schemaId,
        string  calldata name,
        string  calldata schemaUri,
        bytes32          schemaHash,
        string  calldata version
    ) external onlyManagerOrAdmin {
        if (bytes(schemaId).length == 0) revert("SchemaRegistry: empty schemaId");
        if (bytes(schemaUri).length == 0) revert("SchemaRegistry: empty schemaUri");
        if (schemaHash == bytes32(0)) revert("SchemaRegistry: zero schemaHash");
        if (_schemaExists[schemaId]) revert("SchemaRegistry: schemaId already registered");

        _schemas[schemaId] = Schema({
            schemaId:     schemaId,
            name:         name,
            schemaUri:    schemaUri,
            schemaHash:   schemaHash,
            version:      version,
            author:       msg.sender,
            isActive:     true,
            registeredAt: block.timestamp
        });

        _schemaExists[schemaId] = true;
        _allSchemaIds.push(schemaId);

        emit SchemaRegistered(schemaId, schemaHash, schemaUri, msg.sender);
    }

    /**
     * @notice Activates or deactivates an existing schema.
     * @dev Deactivating a schema prevents NEW assets from being issued under it.
     *      Existing assets that reference this schema remain historically verifiable.
     */
    function setSchemaStatus(string calldata schemaId, bool isActive)
        external
        onlyManagerOrAdmin
    {
        if (!_schemaExists[schemaId]) revert("SchemaRegistry: schema does not exist");
        _schemas[schemaId].isActive = isActive;
        emit SchemaStatusChanged(schemaId, isActive, msg.sender);
    }

    // -------------------------------------------------------------------------
    // External view functions
    // -------------------------------------------------------------------------

    /**
     * @notice Returns the full schema record for `schemaId`.
     */
    function getSchema(string calldata schemaId) external view returns (Schema memory) {
        if (!_schemaExists[schemaId]) revert("SchemaRegistry: schema does not exist");
        return _schemas[schemaId];
    }

    /**
     * @notice Returns true if a schema exists, is active, and (optionally) its hash matches.
     * @param schemaId      The schema identifier to check.
     * @param expectedHash  If non-zero, also verifies the on-chain schema hash matches.
     *                      Pass bytes32(0) to skip hash comparison.
     */
    function isSchemaValid(string calldata schemaId, bytes32 expectedHash)
        external view returns (bool)
    {
        if (!_schemaExists[schemaId]) return false;
        Schema storage s = _schemas[schemaId];
        return s.isActive && (expectedHash == bytes32(0) || s.schemaHash == expectedHash);
    }

    /**
     * @notice Returns true if a schema exists (even if currently inactive).
     * @dev Useful for historical verification — an asset may reference a schema
     *      that has since been deactivated; the schema record still exists.
     */
    function schemaExists(string calldata schemaId) external view returns (bool) {
        return _schemaExists[schemaId];
    }

    /// @notice Total number of registered schemas (active + inactive).
    function totalSchemas() external view returns (uint256) {
        return _allSchemaIds.length;
    }

    /// @notice Returns the list of all schema IDs ever registered.
    function getAllSchemaIds() external view returns (string[] memory) {
        return _allSchemaIds;
    }
}

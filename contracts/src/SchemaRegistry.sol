// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./RoleManager.sol";

/**
 * @title SchemaRegistry
 * @dev On-chain registry of approved credential and asset schemas.
 * Ensures all issued credentials conform to immutable cryptographically anchored schemas.
 */
contract SchemaRegistry {
    struct Schema {
        string schemaId;       // e.g. "CERTIFICATE_V1"
        string name;           // "Academic & Professional Certificate"
        string schemaUri;      // URI / IPFS CID pointing to JSON Schema document
        bytes32 schemaHash;    // Keccak256 hash of canonical schema JSON
        string version;        // "1.0.0"
        address author;        // Entity that registered the schema
        bool isActive;
        uint256 registeredAt;
    }

    RoleManager public immutable roleManager;

    mapping(string => Schema) private _schemas;
    mapping(string => bool) private _schemaExists;
    string[] private _allSchemaIds;

    event SchemaRegistered(string indexed schemaId, bytes32 indexed schemaHash, string schemaUri, address indexed author);
    event SchemaStatusChanged(string indexed schemaId, bool isActive, address indexed updatedBy);

    modifier onlyManagerOrAdmin() {
        require(
            roleManager.isManager(msg.sender) || roleManager.isAdmin(msg.sender),
            "SchemaRegistry: caller is not Manager or Admin"
        );
        _;
    }

    constructor(address roleManagerAddress) {
        require(roleManagerAddress != address(0), "SchemaRegistry: zero address RoleManager");
        roleManager = RoleManager(roleManagerAddress);
    }

    /**
     * @notice Registers a new credential/asset schema on-chain
     */
    function registerSchema(
        string calldata schemaId,
        string calldata name,
        string calldata schemaUri,
        bytes32 schemaHash,
        string calldata version
    ) external onlyManagerOrAdmin {
        require(bytes(schemaId).length > 0, "SchemaRegistry: empty schemaId");
        require(schemaHash != bytes32(0), "SchemaRegistry: zero schemaHash");
        require(!_schemaExists[schemaId], "SchemaRegistry: schemaId already registered");

        _schemas[schemaId] = Schema({
            schemaId: schemaId,
            name: name,
            schemaUri: schemaUri,
            schemaHash: schemaHash,
            version: version,
            author: msg.sender,
            isActive: true,
            registeredAt: block.timestamp
        });

        _schemaExists[schemaId] = true;
        _allSchemaIds.push(schemaId);

        emit SchemaRegistered(schemaId, schemaHash, schemaUri, msg.sender);
    }

    /**
     * @notice Activates or deactivates an existing schema
     */
    function setSchemaStatus(string calldata schemaId, bool isActive) external onlyManagerOrAdmin {
        require(_schemaExists[schemaId], "SchemaRegistry: schema does not exist");
        _schemas[schemaId].isActive = isActive;

        emit SchemaStatusChanged(schemaId, isActive, msg.sender);
    }

    /**
     * @notice Get schema details
     */
    function getSchema(string calldata schemaId) external view returns (Schema memory) {
        require(_schemaExists[schemaId], "SchemaRegistry: schema does not exist");
        return _schemas[schemaId];
    }

    /**
     * @notice Verifies if a schema is registered and active
     */
    function isSchemaValid(string calldata schemaId, bytes32 expectedHash) external view returns (bool) {
        if (!_schemaExists[schemaId]) return false;
        Schema storage s = _schemas[schemaId];
        return (s.isActive && (expectedHash == bytes32(0) || s.schemaHash == expectedHash));
    }

    /**
     * @notice Total number of registered schemas
     */
    function totalSchemas() external view returns (uint256) {
        return _allSchemaIds.length;
    }

    /**
     * @notice Returns list of all schema IDs
     */
    function getAllSchemaIds() external view returns (string[] memory) {
        return _allSchemaIds;
    }
}

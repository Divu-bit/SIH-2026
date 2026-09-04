// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./RoleManager.sol";

/**
 * @title IdentityRegistry
 * @dev Manages Decentralized Identifiers (DIDs), controllers, public keys, and lifecycle states.
 * Follows W3C DID Core principles mapped to EVM controllers and smart accounts.
 */
contract IdentityRegistry {
    enum IdentityStatus { ACTIVE, SUSPENDED, REVOKED }

    struct Identity {
        string did;             // e.g. "did:trustchain:0x70997970c51812dc3a010c7d01b50e0d17dc79c8"
        address controller;     // EOA or Smart Account address controlling the DID
        bytes publicKey;        // Public key / verification material
        IdentityStatus status;
        uint256 createdAt;
        uint256 updatedAt;
        string metadataUri;     // IPFS or secure storage link to DID document / profile
    }

    RoleManager public immutable roleManager;

    // did string -> Identity
    mapping(string => Identity) private _identities;
    // controller address -> array of DIDs owned
    mapping(address => string[]) private _controllerToDids;
    // did string -> exists
    mapping(string => bool) private _didExists;
    // all DIDs list
    string[] private _allDids;

    event IdentityCreated(string indexed did, address indexed controller, address indexed creator);
    event ControllerUpdated(string indexed did, address indexed oldController, address indexed newController);
    event IdentityStatusChanged(string indexed did, IdentityStatus previousStatus, IdentityStatus newStatus, address indexed changedBy);
    event PublicKeyUpdated(string indexed did, bytes newPublicKey);
    event MetadataUpdated(string indexed did, string newMetadataUri);

    modifier onlyControllerOrAdmin(string memory did) {
        require(_didExists[did], "IdentityRegistry: DID does not exist");
        require(
            _identities[did].controller == msg.sender || roleManager.isAdmin(msg.sender),
            "IdentityRegistry: unauthorized caller"
        );
        _;
    }

    modifier onlyActiveIdentity(string memory did) {
        require(_didExists[did], "IdentityRegistry: DID does not exist");
        require(_identities[did].status == IdentityStatus.ACTIVE, "IdentityRegistry: identity not active");
        _;
    }

    constructor(address roleManagerAddress) {
        require(roleManagerAddress != address(0), "IdentityRegistry: zero address RoleManager");
        roleManager = RoleManager(roleManagerAddress);
    }

    /**
     * @notice Registers a new Decentralized Identity
     * @param did The unique DID string (e.g., did:trustchain:0x...)
     * @param controller The wallet or smart account controlling this DID
     * @param publicKey Verification public key bytes
     * @param metadataUri URI pointing to extended decentralized identity document
     */
    function registerIdentity(
        string calldata did,
        address controller,
        bytes calldata publicKey,
        string calldata metadataUri
    ) external {
        require(bytes(did).length > 0, "IdentityRegistry: empty DID");
        require(controller != address(0), "IdentityRegistry: zero address controller");
        require(!_didExists[did], "IdentityRegistry: DID already exists");

        // Either self-registering controller or admin/manager registering for user
        require(
            controller == msg.sender || roleManager.isManager(msg.sender) || roleManager.isAdmin(msg.sender),
            "IdentityRegistry: not authorized to register DID for this controller"
        );

        _identities[did] = Identity({
            did: did,
            controller: controller,
            publicKey: publicKey,
            status: IdentityStatus.ACTIVE,
            createdAt: block.timestamp,
            updatedAt: block.timestamp,
            metadataUri: metadataUri
        });

        _didExists[did] = true;
        _controllerToDids[controller].push(did);
        _allDids.push(did);

        emit IdentityCreated(did, controller, msg.sender);
    }

    /**
     * @notice Updates the controller address for a DID (Key rotation / Account Abstraction binding)
     */
    function updateController(string calldata did, address newController) external onlyControllerOrAdmin(did) {
        require(newController != address(0), "IdentityRegistry: zero address new controller");
        address oldController = _identities[did].controller;
        _identities[did].controller = newController;
        _identities[did].updatedAt = block.timestamp;
        _controllerToDids[newController].push(did);

        emit ControllerUpdated(did, oldController, newController);
    }

    /**
     * @notice Updates the public key verification material for a DID
     */
    function updatePublicKey(string calldata did, bytes calldata newPublicKey) external onlyControllerOrAdmin(did) {
        _identities[did].publicKey = newPublicKey;
        _identities[did].updatedAt = block.timestamp;

        emit PublicKeyUpdated(did, newPublicKey);
    }

    /**
     * @notice Updates the metadata URI of a DID document
     */
    function updateMetadataUri(string calldata did, string calldata newMetadataUri) external onlyControllerOrAdmin(did) {
        _identities[did].metadataUri = newMetadataUri;
        _identities[did].updatedAt = block.timestamp;

        emit MetadataUpdated(did, newMetadataUri);
    }

    /**
     * @notice Changes identity status (ACTIVE, SUSPENDED, REVOKED)
     */
    function setIdentityStatus(string calldata did, IdentityStatus newStatus) external onlyControllerOrAdmin(did) {
        IdentityStatus oldStatus = _identities[did].status;
        _identities[did].status = newStatus;
        _identities[did].updatedAt = block.timestamp;

        emit IdentityStatusChanged(did, oldStatus, newStatus, msg.sender);
    }

    /**
     * @notice Look up an identity by DID
     */
    function getIdentity(string calldata did) external view returns (Identity memory) {
        require(_didExists[did], "IdentityRegistry: DID does not exist");
        return _identities[did];
    }

    /**
     * @notice Verifies if a given address is the authorized active controller for a DID
     */
    function isValidController(string calldata did, address account) external view returns (bool) {
        if (!_didExists[did]) return false;
        Identity storage id = _identities[did];
        return (id.controller == account && id.status == IdentityStatus.ACTIVE);
    }

    /**
     * @notice Get all DIDs controlled by an address
     */
    function getDidsByController(address controller) external view returns (string[] memory) {
        return _controllerToDids[controller];
    }

    /**
     * @notice Total count of registered DIDs
     */
    function totalIdentities() external view returns (uint256) {
        return _allDids.length;
    }

    /**
     * @notice Returns all registered DIDs (paginated)
     */
    function getAllDids(uint256 offset, uint256 limit) external view returns (string[] memory) {
        uint256 total = _allDids.length;
        if (offset >= total) return new string[](0);
        uint256 end = offset + limit > total ? total : offset + limit;
        string[] memory result = new string[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            result[i - offset] = _allDids[i];
        }
        return result;
    }
}

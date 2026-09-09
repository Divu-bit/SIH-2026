// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./RoleManager.sol";

/**
 * @title IdentityRegistry
 * @notice Manages Decentralized Identifiers (DIDs), controllers, public keys,
 *         and identity lifecycle states following W3C DID Core principles.
 *
 * @dev Security properties enforced by this contract:
 *   - DID strings MUST carry the "did:trustchain:" prefix and be >= 20 chars.
 *   - Controller rotation uses a two-step propose → accept pattern to prevent
 *     accidental or malicious controller reassignment.
 *   - REVOKED is a terminal state; a REVOKED identity can never become ACTIVE.
 *   - SUSPENDED is a temporary state; only Admin or the current controller can
 *     reactivate a SUSPENDED identity.
 *   - The reverse mapping (controller → DIDs) is kept consistent via
 *     swap-and-pop removal on controller rotation.
 */
contract IdentityRegistry {

    // -------------------------------------------------------------------------
    // Types
    // -------------------------------------------------------------------------

    enum IdentityStatus { ACTIVE, SUSPENDED, REVOKED }

    struct Identity {
        string         did;           // "did:trustchain:<identifier>"
        address        controller;    // EOA or Smart Account controlling the DID
        bytes          publicKey;     // Verification material (informational; see §6.2 of spec)
        IdentityStatus status;
        uint256        createdAt;
        uint256        updatedAt;
        string         metadataUri;   // IPFS / secure-storage link to DID document
        address        pendingController; // Proposed new controller (two-step rotation)
    }

    // -------------------------------------------------------------------------
    // State
    // -------------------------------------------------------------------------

    RoleManager public immutable roleManager;

    /// @dev Primary lookup: DID string → Identity record.
    mapping(string  => Identity) private _identities;

    /// @dev Existence flag: DID string → exists.
    mapping(string  => bool)     private _didExists;

    /// @dev Reverse index: controller address → array of owned DIDs.
    mapping(address => string[]) private _controllerToDids;

    /**
     * @dev Index for O(1) removal during controller rotation.
     *      _controllerDidIndex[controller][did] = index+1 (0 means "not present").
     */
    mapping(address => mapping(string => uint256)) private _controllerDidIndex;

    /// @dev All registered DIDs (for enumeration / pagination).
    string[] private _allDids;

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    event IdentityCreated(
        string  indexed did,
        address indexed controller,
        address indexed creator
    );
    event ControllerProposed(
        string  indexed did,
        address indexed currentController,
        address indexed proposedController
    );
    event ControllerAccepted(
        string  indexed did,
        address indexed oldController,
        address indexed newController
    );
    event IdentityStatusChanged(
        string  indexed did,
        IdentityStatus  previousStatus,
        IdentityStatus  newStatus,
        address indexed changedBy
    );
    event PublicKeyUpdated(string indexed did, bytes newPublicKey);
    event MetadataUpdated(string indexed did, string newMetadataUri);

    // -------------------------------------------------------------------------
    // Modifiers
    // -------------------------------------------------------------------------

    modifier onlyControllerOrAdmin(string memory did) {
        if (!_didExists[did]) revert("IdentityRegistry: DID does not exist");
        if (_identities[did].controller != msg.sender && !roleManager.isAdmin(msg.sender)) {
            revert("IdentityRegistry: unauthorized caller");
        }
        _;
    }

    modifier onlyActiveIdentity(string memory did) {
        if (!_didExists[did]) revert("IdentityRegistry: DID does not exist");
        if (_identities[did].status != IdentityStatus.ACTIVE) {
            revert("IdentityRegistry: identity not active");
        }
        _;
    }

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor(address roleManagerAddress) {
        if (roleManagerAddress == address(0)) revert("IdentityRegistry: zero address RoleManager");
        roleManager = RoleManager(roleManagerAddress);
    }

    // -------------------------------------------------------------------------
    // Internal helpers
    // -------------------------------------------------------------------------

    /**
     * @dev Validates that `did` has the required "did:trustchain:" prefix and
     *      meets a minimum reasonable length.  The 20-character floor comes from
     *      the spec (§5.1) and is intentionally non-prescriptive about what
     *      follows the prefix so future DID method variants remain possible.
     */
    function _validateDID(string memory did) internal pure {
        bytes memory b = bytes(did);
        // Minimum: "did:trustchain:" (15) + at least 5 identifier chars = 20
        if (b.length < 20) revert("IdentityRegistry: DID too short");

        // Prefix check: "did:trustchain:"
        bytes memory prefix = bytes("did:trustchain:");
        for (uint256 i = 0; i < prefix.length; i++) {
            if (b[i] != prefix[i]) revert("IdentityRegistry: invalid DID prefix");
        }
    }

    /**
     * @dev Adds `did` to `controller`'s DID list and updates the index.
     */
    function _addToController(address controller, string memory did) internal {
        _controllerToDids[controller].push(did);
        _controllerDidIndex[controller][did] = _controllerToDids[controller].length; // store 1-based
    }

    /**
     * @dev Removes `did` from `controller`'s DID list using swap-and-pop.
     *      Keeps the reverse index consistent.
     */
    function _removeFromController(address controller, string memory did) internal {
        uint256 idx1Based = _controllerDidIndex[controller][did];
        if (idx1Based == 0) return; // not present — safe no-op

        uint256 idx = idx1Based - 1;
        string[] storage arr = _controllerToDids[controller];
        uint256 last = arr.length - 1;

        if (idx != last) {
            string memory lastDid = arr[last];
            arr[idx] = lastDid;
            _controllerDidIndex[controller][lastDid] = idx + 1;
        }

        arr.pop();
        delete _controllerDidIndex[controller][did];
    }

    // -------------------------------------------------------------------------
    // External write functions
    // -------------------------------------------------------------------------

    /**
     * @notice Registers a new Decentralized Identity.
     * @param did        DID string, e.g. "did:trustchain:abc123..."
     * @param controller EOA or Smart Account that will control this DID
     * @param publicKey  Verification public key bytes (informational)
     * @param metadataUri URI to extended DID document
     */
    function registerIdentity(
        string   calldata did,
        address           controller,
        bytes    calldata publicKey,
        string   calldata metadataUri
    ) external {
        _validateDID(did);
        if (controller == address(0)) revert("IdentityRegistry: zero address controller");
        if (_didExists[did]) revert("IdentityRegistry: DID already exists");

        // Authorization: self-registration, or Manager/Admin acting on behalf of user.
        if (controller != msg.sender && !roleManager.isManager(msg.sender)) {
            revert("IdentityRegistry: not authorized to register DID for this controller");
        }

        _identities[did] = Identity({
            did:               did,
            controller:        controller,
            publicKey:         publicKey,
            status:            IdentityStatus.ACTIVE,
            createdAt:         block.timestamp,
            updatedAt:         block.timestamp,
            metadataUri:       metadataUri,
            pendingController: address(0)
        });

        _didExists[did] = true;
        _addToController(controller, did);
        _allDids.push(did);

        emit IdentityCreated(did, controller, msg.sender);
    }

    /**
     * @notice Step 1 of controller rotation — proposes a new controller.
     * @dev Only the current controller or an Admin can initiate the proposal.
     *      The proposed controller must call `acceptController()` to finalize.
     */
    function proposeController(string calldata did, address newController)
        external
        onlyControllerOrAdmin(did)
    {
        if (newController == address(0)) revert("IdentityRegistry: zero address controller");
        if (newController == _identities[did].controller) {
            revert("IdentityRegistry: proposed controller is already the current controller");
        }
        _identities[did].pendingController = newController;
        _identities[did].updatedAt = block.timestamp;

        emit ControllerProposed(did, _identities[did].controller, newController);
    }

    /**
     * @notice Step 2 of controller rotation — proposed controller accepts.
     * @dev Must be called by the address that was proposed as the new controller.
     *      Updates the reverse mapping atomically.
     */
    function acceptController(string calldata did) external {
        if (!_didExists[did]) revert("IdentityRegistry: DID does not exist");
        Identity storage id = _identities[did];

        if (id.pendingController == address(0)) revert("IdentityRegistry: no pending controller");
        if (msg.sender != id.pendingController) revert("IdentityRegistry: caller is not the pending controller");

        address oldController = id.controller;
        address newController = id.pendingController;

        // Update reverse mapping
        _removeFromController(oldController, did);
        _addToController(newController, did);

        id.controller        = newController;
        id.pendingController = address(0);
        id.updatedAt         = block.timestamp;

        emit ControllerAccepted(did, oldController, newController);
    }

    /**
     * @notice Updates the public key verification material for a DID.
     * @dev Informational only — the system does not use this for on-chain signature
     *      verification at this stage (see spec §6.2).
     */
    function updatePublicKey(string calldata did, bytes calldata newPublicKey)
        external
        onlyControllerOrAdmin(did)
    {
        _identities[did].publicKey  = newPublicKey;
        _identities[did].updatedAt  = block.timestamp;
        emit PublicKeyUpdated(did, newPublicKey);
    }

    /**
     * @notice Updates the metadata URI of a DID document.
     */
    function updateMetadataUri(string calldata did, string calldata newMetadataUri)
        external
        onlyControllerOrAdmin(did)
    {
        _identities[did].metadataUri = newMetadataUri;
        _identities[did].updatedAt   = block.timestamp;
        emit MetadataUpdated(did, newMetadataUri);
    }

    /**
     * @notice Changes identity lifecycle status.
     *
     * @dev Enforced lifecycle rules (§5.3 / Invariant 7):
     *   - REVOKED is terminal: a REVOKED identity CANNOT be moved to any other state.
     *   - Only Admin or the current controller may suspend/reactivate.
     *   - Setting status to REVOKED is allowed by Admin or the controller (self-revoke).
     */
    function setIdentityStatus(string calldata did, IdentityStatus newStatus)
        external
        onlyControllerOrAdmin(did)
    {
        Identity storage id = _identities[did];

        if (id.status == IdentityStatus.REVOKED) {
            revert("IdentityRegistry: REVOKED is terminal - cannot change status");
        }

        IdentityStatus oldStatus = id.status;
        id.status    = newStatus;
        id.updatedAt = block.timestamp;

        emit IdentityStatusChanged(did, oldStatus, newStatus, msg.sender);
    }

    // -------------------------------------------------------------------------
    // External view functions
    // -------------------------------------------------------------------------

    /**
     * @notice Returns the full identity record for a DID.
     */
    function getIdentity(string calldata did) external view returns (Identity memory) {
        if (!_didExists[did]) revert("IdentityRegistry: DID does not exist");
        return _identities[did];
    }

    /**
     * @notice Returns true if `account` is the authorized ACTIVE controller of `did`.
     * @dev Used by AssetRegistry to validate recipient/issuer relationships.
     */
    function isValidController(string calldata did, address account)
        external view returns (bool)
    {
        if (!_didExists[did]) return false;
        Identity storage id = _identities[did];
        return (id.controller == account && id.status == IdentityStatus.ACTIVE);
    }

    /**
     * @notice Returns all DIDs currently associated with a controller address.
     * @dev The array reflects the current canonical state after rotations.
     */
    function getDidsByController(address controller)
        external view returns (string[] memory)
    {
        return _controllerToDids[controller];
    }

    /**
     * @notice Returns the count of DIDs associated with a controller address.
     */
    function getControllerDIDCount(address controller)
        external view returns (uint256)
    {
        return _controllerToDids[controller].length;
    }

    /**
     * @notice Total count of all registered DIDs (including revoked/suspended).
     */
    function totalIdentities() external view returns (uint256) {
        return _allDids.length;
    }

    /**
     * @notice Paginated list of all registered DID strings.
     */
    function getAllDids(uint256 offset, uint256 limit)
        external view returns (string[] memory)
    {
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

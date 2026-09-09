// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./RoleManager.sol";
import "./IdentityRegistry.sol";
import "./SchemaRegistry.sol";
import "./AssetNFT.sol";

/**
 * @title AssetRegistry
 * @notice Core orchestrator that binds ERC-721 tokens to DIDs, anchors
 *         cryptographic credential hashes, enforces RBAC, and manages
 *         the full asset lifecycle.
 *
 * @dev Security properties enforced by this contract:
 *
 *   P0.1 — ERC-721 transfer bypass prevention:
 *     AssetNFT._update() now requires msg.sender == assetRegistry for all
 *     transfers; this contract is the sole authorized caller.
 *
 *   P0.2 — DID/NFT ownership model:
 *     A DID represents the logical identity/owner. The NFT represents the digital asset
 *     on-chain. The current DID controller is authorized to operate on behalf of the DID.
 *     Controller rotation via IdentityRegistry does NOT automatically move the NFT — the
 *     DID remains the canonical ownership anchor.
 *
 *   P0.3 — Issuer validation:
 *     issuerAddress must be the active controller of issuerDID.
 *     issuerAddress must also hold Manager or Admin role.
 *
 *   P0.4 — Recipient validation:
 *     recipient must be the active controller of ownerDID.
 *
 *   10.1 — Explicit hash anchoring via _hashAnchored bool map.
 *   10.2 — ReentrancyGuard + checks-effects-interactions pattern.
 *   10.3 — Pausable: issue/transfer/status-changes pause; reads stay live.
 *   10.4 — updateAssetStatus() cannot set REVOKED; use revokeAsset() instead.
 *   10.5 — isTransferable enforced in transferAsset(); ERC-721 layer
 *           also enforced via AssetNFT._update().
 *   10.6 — Schema validity checked at issuance time.
 */
contract AssetRegistry is ReentrancyGuard, Pausable {

    // -------------------------------------------------------------------------
    // Types
    // -------------------------------------------------------------------------

    enum AssetStatus { ACTIVE, SUSPENDED, REVOKED, EXPIRED }

    struct AssetRecord {
        uint256     tokenId;
        string      assetType;       // e.g. "CERTIFICATE", "SOFTWARE_LICENSE"
        string      schemaId;        // e.g. "CERTIFICATE_V1"
        bytes32     credentialHash;  // Keccak-256 of canonical off-chain credential
        string      ownerDID;        // Logical owner DID (immutable post-issue)
        string      issuerDID;       // Issuer DID
        address     issuerAddress;   // Wallet/account that authorized issuance
        uint256     issuedAt;
        uint256     expiresAt;       // 0 = no expiry
        AssetStatus status;
        bool        isTransferable;
        string      metadataUri;
    }

    struct IssueAssetParams {
        address recipient;
        string  ownerDID;
        string  issuerDID;
        string  assetType;
        string  schemaId;
        bytes32 credentialHash;
        string  metadataUri;
        uint256 expiresAt;
        bool    isTransferable;
    }

    // -------------------------------------------------------------------------
    // State
    // -------------------------------------------------------------------------

    RoleManager      public immutable roleManager;
    IdentityRegistry public immutable identityRegistry;
    SchemaRegistry   public immutable schemaRegistry;
    AssetNFT         public immutable assetNFT;

    /// @dev tokenId → AssetRecord
    mapping(uint256  => AssetRecord)  private _assets;

    /// @dev Explicit anchor: credentialHash → already anchored?
    mapping(bytes32  => bool)         private _hashAnchored;

    /// @dev credentialHash → tokenId (for look-up by hash)
    mapping(bytes32  => uint256)      private _credentialHashToTokenId;

    /// @dev ownerDID → list of tokenIds
    mapping(string   => uint256[])    private _didToTokens;

    /**
     * @dev Index for O(1) swap-and-pop removal during asset transfer.
     *      _didTokenIndex[did][tokenId] = index+1 (0 means not present).
     */
    mapping(string   => mapping(uint256 => uint256)) private _didTokenIndex;

    /// @dev All token IDs ever issued
    uint256[] private _allTokenIds;

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    event AssetMinted(
        uint256 indexed tokenId,
        string  indexed assetType,
        string  indexed schemaId,
        address         recipient,
        string          ownerDID,
        bytes32         credentialHash,
        address         issuer
    );

    event AssetTransferred(
        uint256 indexed tokenId,
        address indexed from,
        address indexed to,
        string          fromDID,
        string          toDID
    );

    event AssetRevoked(
        uint256 indexed tokenId,
        string          reason,
        address indexed revokedBy
    );

    event AssetStatusUpdated(
        uint256     indexed tokenId,
        AssetStatus         previousStatus,
        AssetStatus         newStatus,
        string              reason,
        address     indexed updatedBy
    );

    event ContractPaused(address indexed by);
    event ContractUnpaused(address indexed by);
    event NFTOwnerSynced(
        uint256 indexed tokenId,
        address indexed oldOwner,
        address indexed newOwner
    );

    // -------------------------------------------------------------------------
    // Modifiers
    // -------------------------------------------------------------------------

    modifier onlyManagerOrAdmin() {
        if (!roleManager.isManager(msg.sender)) {
            revert("AssetRegistry: caller is not Manager or Admin");
        }
        _;
    }

    modifier onlyAdmin() {
        if (!roleManager.isAdmin(msg.sender)) {
            revert("AssetRegistry: caller is not Admin");
        }
        _;
    }

    /**
     * @dev Authorization for asset operations.
     *      Checks the CURRENT DID controller via IdentityRegistry (not the raw NFT owner).
     *      This ensures that after DID controller rotation, the OLD address cannot
     *      still act on assets — only the CURRENT active DID controller can.
     *      Managers and Admins retain override access.
     */
    modifier onlyTokenOwnerOrManager(uint256 tokenId) {
        AssetRecord storage asset = _assets[tokenId];
        bool isCurrentController = identityRegistry.isValidController(
            asset.ownerDID, msg.sender
        );
        if (!isCurrentController && !roleManager.isManager(msg.sender)) {
            revert("AssetRegistry: unauthorized token action");
        }
        _;
    }

    modifier assetExists(uint256 tokenId) {
        if (_assets[tokenId].tokenId == 0) {
            revert("AssetRegistry: asset does not exist");
        }
        _;
    }

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor(
        address _roleManager,
        address _identityRegistry,
        address _schemaRegistry,
        address _assetNFT
    ) {
        if (_roleManager      == address(0)) revert("AssetRegistry: zero RoleManager");
        if (_identityRegistry == address(0)) revert("AssetRegistry: zero IdentityRegistry");
        if (_schemaRegistry   == address(0)) revert("AssetRegistry: zero SchemaRegistry");
        if (_assetNFT         == address(0)) revert("AssetRegistry: zero AssetNFT");

        roleManager      = RoleManager(_roleManager);
        identityRegistry = IdentityRegistry(_identityRegistry);
        schemaRegistry   = SchemaRegistry(_schemaRegistry);
        assetNFT         = AssetNFT(_assetNFT);
    }

    // -------------------------------------------------------------------------
    // Pause controls (Admin only)
    // -------------------------------------------------------------------------

    /**
     * @notice Pauses all state-changing operations.
     * @dev Read and verify functions remain available during a pause.
     */
    function pause() external onlyAdmin {
        _pause();
        emit ContractPaused(msg.sender);
    }

    /**
     * @notice Resumes all state-changing operations.
     */
    function unpause() external onlyAdmin {
        _unpause();
        emit ContractUnpaused(msg.sender);
    }

    /**
     * @notice One-time deployment helper: calls AssetNFT.acceptAssetRegistry().
     * @dev Used during deployment to complete the two-step AssetNFT binding.
     *      This must be called immediately after deploy while this contract is
     *      set as the pendingAssetRegistry on AssetNFT.
     *      Restricted to Admin; can only be called once (NFT will revert after binding).
     * @param _assetNFT The AssetNFT address to accept binding from.
     */
    function bootstrapAcceptNFT(address _assetNFT) external onlyAdmin {
        if (_assetNFT == address(0)) revert("AssetRegistry: zero assetNFT");
        AssetNFT(_assetNFT).acceptAssetRegistry();
    }

    // -------------------------------------------------------------------------
    // Asset issuance (public entry points)
    // -------------------------------------------------------------------------

    /**
     * @notice Issues and mints a new verified digital asset NFT bound to a DID.
     * @dev Validates: schema active, issuer identity, recipient identity, hash uniqueness.
     *      Caller must be Manager or Admin AND must be the active controller of `issuerDID`.
     */
    function issueAsset(
        address  recipient,
        string   calldata ownerDID,
        string   calldata issuerDID,
        string   calldata assetType,
        string   calldata schemaId,
        bytes32           credentialHash,
        string   calldata metadataUri,
        uint256           expiresAt,
        bool              isTransferable
    ) external whenNotPaused onlyManagerOrAdmin nonReentrant returns (uint256) {
        IssueAssetParams memory p;
        p.recipient      = recipient;
        p.ownerDID       = ownerDID;
        p.issuerDID      = issuerDID;
        p.assetType      = assetType;
        p.schemaId       = schemaId;
        p.credentialHash = credentialHash;
        p.metadataUri    = metadataUri;
        p.expiresAt      = expiresAt;
        p.isTransferable = isTransferable;
        return _issueAssetInternal(p);
    }

    /**
     * @notice Struct-based variant of issueAsset (avoids stack-too-deep on ABI callers).
     */
    function issueAssetWithParams(IssueAssetParams calldata params)
        external
        whenNotPaused
        onlyManagerOrAdmin
        nonReentrant
        returns (uint256)
    {
        return _issueAssetInternal(params);
    }

    // -------------------------------------------------------------------------
    // Internal issuance logic
    // -------------------------------------------------------------------------

    /**
     * @dev Validates all preconditions for asset issuance.
     *      Extracted into its own function to reduce stack depth in
     *      _issueAssetInternal — keeping both functions under the 16-slot
     *      EVM stack limit when forge coverage disables IR codegen.
     */
    function _validateIssuance(IssueAssetParams memory params) internal view {
        if (params.recipient == address(0)) revert("AssetRegistry: zero recipient address");
        if (bytes(params.ownerDID).length == 0) revert("AssetRegistry: empty ownerDID");
        if (bytes(params.issuerDID).length == 0) revert("AssetRegistry: empty issuerDID");
        if (params.credentialHash == bytes32(0)) revert("AssetRegistry: zero credentialHash");
        if (_hashAnchored[params.credentialHash]) revert("AssetRegistry: credential hash already anchored");

        // P0.4 — Recipient must be active controller of ownerDID
        if (!identityRegistry.isValidController(params.ownerDID, params.recipient)) {
            revert("AssetRegistry: recipient is not active controller of ownerDID");
        }

        // P0.3 — Issuer must be active controller of issuerDID
        if (!identityRegistry.isValidController(params.issuerDID, msg.sender)) {
            revert("AssetRegistry: issuer is not active controller of issuerDID");
        }

        // Schema must be active at time of issuance
        if (bytes(params.schemaId).length > 0) {
            if (!schemaRegistry.isSchemaValid(params.schemaId, bytes32(0))) {
                revert("AssetRegistry: schema is not active or valid");
            }
        }
    }

    function _issueAssetInternal(IssueAssetParams memory params)
        internal
        returns (uint256)
    {
        // --- Checks (delegated to reduce stack depth) ---
        _validateIssuance(params);

        // --- Effects (all state writes before external calls) ---

        // Mark hash as anchored immediately (prevents re-entrancy hash collision)
        _hashAnchored[params.credentialHash] = true;
        _credentialHashToTokenId[params.credentialHash] = 0; // placeholder, updated after mint

        // --- Interactions ---

        uint256 tokenId = assetNFT.mint(params.recipient, params.metadataUri);

        // --- More effects (safe: re-entrancy guard active, hash anchored above) ---

        _assets[tokenId] = AssetRecord({
            tokenId:        tokenId,
            assetType:      params.assetType,
            schemaId:       params.schemaId,
            credentialHash: params.credentialHash,
            ownerDID:       params.ownerDID,
            issuerDID:      params.issuerDID,
            issuerAddress:  msg.sender,
            issuedAt:       block.timestamp,
            expiresAt:      params.expiresAt,
            status:         AssetStatus.ACTIVE,
            isTransferable: params.isTransferable,
            metadataUri:    params.metadataUri
        });

        _credentialHashToTokenId[params.credentialHash] = tokenId;
        _addDIDToken(params.ownerDID, tokenId);
        _allTokenIds.push(tokenId);

        emit AssetMinted(
            tokenId,
            params.assetType,
            params.schemaId,
            params.recipient,
            params.ownerDID,
            params.credentialHash,
            msg.sender
        );

        return tokenId;
    }

    // -------------------------------------------------------------------------
    // Asset transfer
    // -------------------------------------------------------------------------

    /**
     * @notice Transfers an asset to a new DID-bound owner (policy-enforced).
     * @dev Enforces: asset ACTIVE, isTransferable, recipient is valid DID controller.
     *      The ERC-721 layer (AssetNFT._update) also blocks direct transfers.
     */
    function transferAsset(
        uint256  tokenId,
        address  to,
        string   calldata newOwnerDID
    )
        external
        whenNotPaused
        nonReentrant
        assetExists(tokenId)
        onlyTokenOwnerOrManager(tokenId)
    {
        AssetRecord storage asset = _assets[tokenId];

        // Checks
        if (asset.status != AssetStatus.ACTIVE) revert("AssetRegistry: asset is not active");
        if (!asset.isTransferable) revert("AssetRegistry: asset is non-transferable soulbound credential");
        if (to == address(0)) revert("AssetRegistry: zero destination address");
        if (!identityRegistry.isValidController(newOwnerDID, to)) {
            revert("AssetRegistry: destination is not active controller of new DID");
        }

        address currentOwner = assetNFT.ownerOf(tokenId);
        string memory previousDID = asset.ownerDID;

        // Effects: update DID record and reverse mapping atomically before interaction
        asset.ownerDID = newOwnerDID;
        _removeDIDToken(previousDID, tokenId);   // Gap 1 fix: remove from old DID's list
        _addDIDToken(newOwnerDID, tokenId);       // add to new DID's list

        // Interaction
        assetNFT.transferFromRegistry(currentOwner, to, tokenId);

        emit AssetTransferred(tokenId, currentOwner, to, previousDID, newOwnerDID);
    }

    /**
     * @notice Syncs the ERC-721 token owner on-chain to the current active DID controller.
     * @dev Callable by the active DID controller or Manager/Admin after controller rotation.
     */
    function syncNFTOwner(uint256 tokenId)
        external
        whenNotPaused
        nonReentrant
        assetExists(tokenId)
        onlyTokenOwnerOrManager(tokenId)
    {
        AssetRecord storage asset = _assets[tokenId];
        IdentityRegistry.Identity memory id = identityRegistry.getIdentity(asset.ownerDID);
        if (id.status != IdentityRegistry.IdentityStatus.ACTIVE) {
            revert("AssetRegistry: owner DID is not active");
        }

        address currentNFTOwner = assetNFT.ownerOf(tokenId);
        if (currentNFTOwner != id.controller) {
            assetNFT.transferFromRegistry(currentNFTOwner, id.controller, tokenId);
            emit NFTOwnerSynced(tokenId, currentNFTOwner, id.controller);
        }
    }

    // -------------------------------------------------------------------------
    // Internal DID → token index helpers
    // -------------------------------------------------------------------------

    /**
     * @dev Adds `tokenId` to `did`'s token list and records its index.
     */
    function _addDIDToken(string memory did, uint256 tokenId) internal {
        _didToTokens[did].push(tokenId);
        _didTokenIndex[did][tokenId] = _didToTokens[did].length; // 1-based
    }

    /**
     * @dev Removes `tokenId` from `did`'s token list using swap-and-pop.
     *      Keeps the index consistent. Safe no-op if not present.
     */
    function _removeDIDToken(string memory did, uint256 tokenId) internal {
        uint256 idx1Based = _didTokenIndex[did][tokenId];
        if (idx1Based == 0) return; // not present

        uint256 idx  = idx1Based - 1;
        uint256[] storage arr = _didToTokens[did];
        uint256 last = arr.length - 1;

        if (idx != last) {
            uint256 lastTokenId = arr[last];
            arr[idx] = lastTokenId;
            _didTokenIndex[did][lastTokenId] = idx + 1;
        }

        arr.pop();
        delete _didTokenIndex[did][tokenId];
    }

    // -------------------------------------------------------------------------
    // Asset status management
    // -------------------------------------------------------------------------

    /**
     * @notice Permanently revokes an asset.
     * @dev Emits both AssetRevoked and AssetStatusUpdated for comprehensive audit trail.
     *      REVOKED is terminal — see Invariant 8.
     */
    function revokeAsset(uint256 tokenId, string calldata reason)
        external
        whenNotPaused
        onlyManagerOrAdmin
        assetExists(tokenId)
    {
        if (_assets[tokenId].status == AssetStatus.REVOKED) {
            revert("AssetRegistry: asset already revoked");
        }

        AssetStatus prev = _assets[tokenId].status;
        _assets[tokenId].status = AssetStatus.REVOKED;

        emit AssetRevoked(tokenId, reason, msg.sender);
        emit AssetStatusUpdated(tokenId, prev, AssetStatus.REVOKED, reason, msg.sender);
    }

    /**
     * @notice Updates lifecycle status to ACTIVE, SUSPENDED, or EXPIRED.
     * @dev REVOKED is intentionally NOT accepted here — use revokeAsset() instead
     *      to guarantee the AssetRevoked event is always emitted on revocation.
     */
    function updateAssetStatus(
        uint256     tokenId,
        AssetStatus newStatus,
        string      calldata reason
    )
        external
        whenNotPaused
        onlyManagerOrAdmin
        assetExists(tokenId)
    {
        if (newStatus == AssetStatus.REVOKED) {
            revert("AssetRegistry: use revokeAsset() to revoke an asset");
        }
        if (_assets[tokenId].status == AssetStatus.REVOKED) {
            revert("AssetRegistry: asset is already permanently revoked");
        }

        AssetStatus prev = _assets[tokenId].status;
        _assets[tokenId].status = newStatus;

        emit AssetStatusUpdated(tokenId, prev, newStatus, reason, msg.sender);
    }

    // -------------------------------------------------------------------------
    // Verification (read-only, available even while paused)
    // -------------------------------------------------------------------------

    /**
     * @notice Full on-chain verification pipeline for a single asset.
     * @dev Returns a comprehensive validity breakdown for the public verifier.
     */
    function verifyAsset(uint256 tokenId, bytes32 expectedCredentialHash)
        external view returns (
            bool isValid,
            bool isHashMatch,
            bool isStatusActive,
            bool isNotExpired,
            bool isOwnerVerified,
            AssetRecord memory asset,
            address currentOwner
        )
    {
        if (_assets[tokenId].tokenId == 0) {
            return (false, false, false, false, false, asset, address(0));
        }

        asset        = _assets[tokenId];
        currentOwner = assetNFT.ownerOf(tokenId);

        isHashMatch    = (expectedCredentialHash == bytes32(0)
                           || asset.credentialHash == expectedCredentialHash);
        isStatusActive = (asset.status == AssetStatus.ACTIVE);
        isNotExpired   = (asset.expiresAt == 0 || block.timestamp <= asset.expiresAt);

        try identityRegistry.getIdentity(asset.ownerDID) returns (IdentityRegistry.Identity memory id) {
            isOwnerVerified = (id.status == IdentityRegistry.IdentityStatus.ACTIVE);
        } catch {
            isOwnerVerified = false;
        }

        isValid = (isHashMatch && isStatusActive && isNotExpired && isOwnerVerified);
    }

    // -------------------------------------------------------------------------
    // View helpers
    // -------------------------------------------------------------------------

    /**
     * @notice Returns the full asset record and current NFT holder address.
     */
    function getAsset(uint256 tokenId)
        external view
        assetExists(tokenId)
        returns (AssetRecord memory record, address currentOwner)
    {
        return (_assets[tokenId], assetNFT.ownerOf(tokenId));
    }

    /**
     * @notice Returns the token ID anchored to a given credential hash (0 = not found).
     */
    function getTokenIdByHash(bytes32 credentialHash) external view returns (uint256) {
        return _credentialHashToTokenId[credentialHash];
    }

    /**
     * @notice Returns true if a credential hash has already been anchored on-chain.
     */
    function isHashAnchored(bytes32 credentialHash) external view returns (bool) {
        return _hashAnchored[credentialHash];
    }

    /**
     * @notice Returns all token IDs registered to a specific DID.
     */
    function getTokensByDID(string calldata did) external view returns (uint256[] memory) {
        return _didToTokens[did];
    }

    /**
     * @notice Total number of digital assets ever issued.
     */
    function totalAssets() external view returns (uint256) {
        return _allTokenIds.length;
    }
}

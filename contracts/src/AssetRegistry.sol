// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./RoleManager.sol";
import "./IdentityRegistry.sol";
import "./SchemaRegistry.sol";
import "./AssetNFT.sol";

/**
 * @title AssetRegistry
 * @dev The core orchestrator contract that binds ERC-721 tokens to Decentralized Identifiers (DIDs),
 * anchors cryptographic credential hashes, enforces RBAC, and manages the asset lifecycle.
 */
contract AssetRegistry {
    enum AssetStatus { ACTIVE, SUSPENDED, REVOKED, EXPIRED }

    struct AssetRecord {
        uint256 tokenId;
        string assetType;        // e.g. "CERTIFICATE", "SOFTWARE_LICENSE", "LAND_TITLE"
        string schemaId;         // e.g. "CERTIFICATE_V1"
        bytes32 credentialHash;  // Keccak256 / SHA256 of canonical off-chain credential
        string ownerDID;         // Recipient DID
        string issuerDID;        // Issuer DID
        address issuerAddress;   // Wallet/Account that authorized the issuance
        uint256 issuedAt;
        uint256 expiresAt;       // 0 for permanent
        AssetStatus status;
        bool isTransferable;
        string metadataUri;
    }

    struct IssueAssetParams {
        address recipient;
        string ownerDID;
        string issuerDID;
        string assetType;
        string schemaId;
        bytes32 credentialHash;
        string metadataUri;
        uint256 expiresAt;
        bool isTransferable;
    }

    RoleManager public immutable roleManager;
    IdentityRegistry public immutable identityRegistry;
    SchemaRegistry public immutable schemaRegistry;
    AssetNFT public immutable assetNFT;

    // tokenId -> AssetRecord
    mapping(uint256 => AssetRecord) private _assets;
    // credentialHash -> tokenId (to prevent duplicate issuance of the same credential hash)
    mapping(bytes32 => uint256) private _credentialHashToTokenId;
    // ownerDID -> tokenIds array
    mapping(string => uint256[]) private _didToTokens;
    // total count
    uint256[] private _allTokenIds;

    event AssetMinted(
        uint256 indexed tokenId,
        string indexed assetType,
        string indexed schemaId,
        address recipient,
        string ownerDID,
        bytes32 credentialHash,
        address issuer
    );

    event AssetTransferred(
        uint256 indexed tokenId,
        address indexed from,
        address indexed to,
        string fromDID,
        string toDID
    );

    event AssetRevoked(uint256 indexed tokenId, string reason, address indexed revokedBy);

    event AssetStatusUpdated(
        uint256 indexed tokenId,
        AssetStatus previousStatus,
        AssetStatus newStatus,
        string reason,
        address indexed updatedBy
    );

    modifier onlyManagerOrAdmin() {
        require(
            roleManager.isManager(msg.sender) || roleManager.isAdmin(msg.sender),
            "AssetRegistry: caller is not Manager or Admin"
        );
        _;
    }

    modifier onlyTokenOwnerOrManager(uint256 tokenId) {
        address tokenOwner = assetNFT.ownerOf(tokenId);
        require(
            msg.sender == tokenOwner || roleManager.isManager(msg.sender) || roleManager.isAdmin(msg.sender),
            "AssetRegistry: unauthorized token action"
        );
        _;
    }

    constructor(
        address _roleManager,
        address _identityRegistry,
        address _schemaRegistry,
        address _assetNFT
    ) {
        require(_roleManager != address(0), "AssetRegistry: zero RoleManager");
        require(_identityRegistry != address(0), "AssetRegistry: zero IdentityRegistry");
        require(_schemaRegistry != address(0), "AssetRegistry: zero SchemaRegistry");
        require(_assetNFT != address(0), "AssetRegistry: zero AssetNFT");

        roleManager = RoleManager(_roleManager);
        identityRegistry = IdentityRegistry(_identityRegistry);
        schemaRegistry = SchemaRegistry(_schemaRegistry);
        assetNFT = AssetNFT(_assetNFT);
    }

    /**
     * @notice Issue and mint a new verified digital asset NFT bound to a user's DID
     */
    function issueAsset(
        address recipient,
        string calldata ownerDID,
        string calldata issuerDID,
        string calldata assetType,
        string calldata schemaId,
        bytes32 credentialHash,
        string calldata metadataUri,
        uint256 expiresAt,
        bool isTransferable
    ) external onlyManagerOrAdmin returns (uint256) {
        return _issueAssetInternal(
            IssueAssetParams({
                recipient: recipient,
                ownerDID: ownerDID,
                issuerDID: issuerDID,
                assetType: assetType,
                schemaId: schemaId,
                credentialHash: credentialHash,
                metadataUri: metadataUri,
                expiresAt: expiresAt,
                isTransferable: isTransferable
            })
        );
    }

    /**
     * @notice Struct-based issue function
     */
    function issueAssetWithParams(IssueAssetParams calldata params) external onlyManagerOrAdmin returns (uint256) {
        return _issueAssetInternal(params);
    }

    function _issueAssetInternal(IssueAssetParams memory params) internal returns (uint256) {
        require(params.recipient != address(0), "AssetRegistry: zero recipient address");
        require(bytes(params.ownerDID).length > 0, "AssetRegistry: empty ownerDID");
        require(bytes(params.issuerDID).length > 0, "AssetRegistry: empty issuerDID");
        require(params.credentialHash != bytes32(0), "AssetRegistry: zero credentialHash");
        require(_credentialHashToTokenId[params.credentialHash] == 0, "AssetRegistry: credential hash already anchored");

        // Verify that recipient is active controller of ownerDID
        require(
            identityRegistry.isValidController(params.ownerDID, params.recipient),
            "AssetRegistry: recipient is not active controller of ownerDID"
        );
        
        // Verify schema validity if schemaId is specified
        if (bytes(params.schemaId).length > 0) {
            require(schemaRegistry.isSchemaValid(params.schemaId, bytes32(0)), "AssetRegistry: schema is not active or valid");
        }

        // Mint underlying ERC-721 token
        uint256 tokenId = assetNFT.mint(params.recipient, params.metadataUri);

        _assets[tokenId] = AssetRecord({
            tokenId: tokenId,
            assetType: params.assetType,
            schemaId: params.schemaId,
            credentialHash: params.credentialHash,
            ownerDID: params.ownerDID,
            issuerDID: params.issuerDID,
            issuerAddress: msg.sender,
            issuedAt: block.timestamp,
            expiresAt: params.expiresAt,
            status: AssetStatus.ACTIVE,
            isTransferable: params.isTransferable,
            metadataUri: params.metadataUri
        });

        _credentialHashToTokenId[params.credentialHash] = tokenId;
        _didToTokens[params.ownerDID].push(tokenId);
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

    /**
     * @notice Transfer an asset along with DID rebinding (if policy allows transfer)
     */
    function transferAsset(
        uint256 tokenId,
        address to,
        string calldata newOwnerDID
    ) external onlyTokenOwnerOrManager(tokenId) {
        AssetRecord storage asset = _assets[tokenId];
        require(asset.status == AssetStatus.ACTIVE, "AssetRegistry: asset is not active");
        require(asset.isTransferable, "AssetRegistry: asset is non-transferable soulbound credential");
        require(to != address(0), "AssetRegistry: zero destination address");
        require(identityRegistry.isValidController(newOwnerDID, to), "AssetRegistry: destination is not active controller of new DID");

        address currentOwner = assetNFT.ownerOf(tokenId);
        string memory previousDID = asset.ownerDID;

        asset.ownerDID = newOwnerDID;
        _didToTokens[newOwnerDID].push(tokenId);

        // Governed transfer of ERC-721
        assetNFT.transferFromRegistry(currentOwner, to, tokenId);

        emit AssetTransferred(tokenId, currentOwner, to, previousDID, newOwnerDID);
    }

    /**
     * @notice Revokes an asset permanently (Only Manager or Admin)
     */
    function revokeAsset(uint256 tokenId, string calldata reason) external onlyManagerOrAdmin {
        require(_assets[tokenId].tokenId != 0, "AssetRegistry: asset does not exist");
        require(_assets[tokenId].status != AssetStatus.REVOKED, "AssetRegistry: asset already revoked");

        AssetStatus prev = _assets[tokenId].status;
        _assets[tokenId].status = AssetStatus.REVOKED;

        emit AssetRevoked(tokenId, reason, msg.sender);
        emit AssetStatusUpdated(tokenId, prev, AssetStatus.REVOKED, reason, msg.sender);
    }

    /**
     * @notice Updates asset lifecycle status (ACTIVE, SUSPENDED, EXPIRED)
     */
    function updateAssetStatus(
        uint256 tokenId,
        AssetStatus newStatus,
        string calldata reason
    ) external onlyManagerOrAdmin {
        require(_assets[tokenId].tokenId != 0, "AssetRegistry: asset does not exist");
        AssetStatus prev = _assets[tokenId].status;
        _assets[tokenId].status = newStatus;

        emit AssetStatusUpdated(tokenId, prev, newStatus, reason, msg.sender);
    }

    /**
     * @notice Get comprehensive asset details
     */
    function getAsset(uint256 tokenId) external view returns (AssetRecord memory record, address currentOwner) {
        require(_assets[tokenId].tokenId != 0, "AssetRegistry: asset does not exist");
        return (_assets[tokenId], assetNFT.ownerOf(tokenId));
    }

    /**
     * @notice Find token ID by credential hash
     */
    function getTokenIdByHash(bytes32 credentialHash) external view returns (uint256) {
        return _credentialHashToTokenId[credentialHash];
    }

    /**
     * @notice Instant on-chain verification pipeline check
     */
    function verifyAsset(
        uint256 tokenId,
        bytes32 expectedCredentialHash
    ) external view returns (
        bool isValid,
        bool isHashMatch,
        bool isStatusActive,
        bool isNotExpired,
        bool isOwnerVerified,
        AssetRecord memory asset,
        address currentOwner
    ) {
        if (_assets[tokenId].tokenId == 0) {
            return (false, false, false, false, false, asset, address(0));
        }

        asset = _assets[tokenId];
        currentOwner = assetNFT.ownerOf(tokenId);

        isHashMatch = (expectedCredentialHash == bytes32(0) || asset.credentialHash == expectedCredentialHash);
        isStatusActive = (asset.status == AssetStatus.ACTIVE);
        isNotExpired = (asset.expiresAt == 0 || block.timestamp <= asset.expiresAt);
        isOwnerVerified = identityRegistry.isValidController(asset.ownerDID, currentOwner);

        isValid = (isHashMatch && isStatusActive && isNotExpired && isOwnerVerified);
    }

    /**
     * @notice Get all token IDs registered to a specific DID
     */
    function getTokensByDID(string calldata did) external view returns (uint256[] memory) {
        return _didToTokens[did];
    }

    /**
     * @notice Total number of registered digital assets
     */
    function totalAssets() external view returns (uint256) {
        return _allTokenIds.length;
    }
}

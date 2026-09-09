// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AssetNFT
 * @notice ERC-721 token representing unique TrustChain digital assets.
 * @dev Security properties:
 *   - A DID represents the logical identity/owner. The NFT represents the digital asset on-chain.
 *     The current DID controller is authorized to operate on behalf of the DID.
 *   - Only the bound AssetRegistry contract may mint, burn, transfer, or update URIs.
 *   - Direct user calls to safeTransferFrom/transferFrom are blocked via an
 *     override of _update(), ensuring ALL transfers go through AssetRegistry's
 *     business-rule checks (DID ownership, transferability, pause state, status).
 *   - AssetRegistry binding uses a two-step propose → accept pattern to prevent
 *     accidental or malicious registry replacement.
 *
 * @custom:security-contact trustchain-security@example.com
 */
contract AssetNFT is ERC721URIStorage, Ownable {

    // -------------------------------------------------------------------------
    // State
    // -------------------------------------------------------------------------

    /// @notice The governing AssetRegistry that is allowed to call privileged functions.
    address public assetRegistry;

    /// @dev Proposed next AssetRegistry (step 1 of two-step binding).
    address public pendingAssetRegistry;

    uint256 private _nextTokenId = 1;

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    event AssetRegistryProposed(
        address indexed currentRegistry,
        address indexed proposedRegistry
    );
    event AssetRegistryAccepted(
        address indexed previousRegistry,
        address indexed newRegistry
    );

    // -------------------------------------------------------------------------
    // Modifiers
    // -------------------------------------------------------------------------

    modifier onlyAssetRegistry() {
        if (msg.sender != assetRegistry) revert("AssetNFT: caller is not AssetRegistry");
        _;
    }

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor(address initialOwner)
        ERC721("TrustChain Verifiable Asset", "TCVA")
        Ownable(initialOwner)
    {}

    // -------------------------------------------------------------------------
    // AssetRegistry binding (two-step)
    // -------------------------------------------------------------------------

    /**
     * @notice Step 1 — Owner proposes a new AssetRegistry address.
     * @dev Only the contract owner (deployer / multisig) may propose.
     */
    function proposeAssetRegistry(address _proposed) external onlyOwner {
        if (_proposed == address(0)) revert("AssetNFT: zero address");
        if (_proposed == assetRegistry) revert("AssetNFT: already current registry");
        pendingAssetRegistry = _proposed;
        emit AssetRegistryProposed(assetRegistry, _proposed);
    }

    /**
     * @notice Step 2 — The proposed AssetRegistry accepts the binding.
     * @dev The proposed contract must call this itself, proving it is a live
     *      contract at that address and the deployment is intentional.
     */
    function acceptAssetRegistry() external {
        if (msg.sender != pendingAssetRegistry) revert("AssetNFT: caller is not the pending AssetRegistry");
        address old = assetRegistry;
        assetRegistry = pendingAssetRegistry;
        pendingAssetRegistry = address(0);
        emit AssetRegistryAccepted(old, assetRegistry);
    }

    // -------------------------------------------------------------------------
    // ERC-721 policy override — prevent direct transfer bypass (P0.1)
    // -------------------------------------------------------------------------

    /**
     * @dev Overrides ERC-721's internal _update hook, which is called by
     *      safeTransferFrom, transferFrom, and all other token movement paths.
     *
     *      Rule: the only permitted callers for non-mint, non-burn transfers
     *      are (a) the AssetRegistry itself, or (b) address(0) → recipient
     *      mints (also controlled via AssetRegistry.mint() only).
     *
     *      This prevents users from calling safeTransferFrom/transferFrom
     *      directly on this contract, which would bypass:
     *        - isTransferable checks
     *        - DID ownership validation
     *        - Pause state
     *        - Asset status checks
     */
    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address)
    {
        address from = _ownerOf(tokenId);

        // Allow mints (from == address(0)) only when called by AssetRegistry
        if (from == address(0)) {
            if (msg.sender != assetRegistry) revert("AssetNFT: minting only via AssetRegistry");
        }
        // Allow burns (to == address(0)) only when called by AssetRegistry
        else if (to == address(0)) {
            if (msg.sender != assetRegistry) revert("AssetNFT: burning only via AssetRegistry");
        }
        // Block all other transfers unless initiated by AssetRegistry
        else {
            if (msg.sender != assetRegistry) revert("AssetNFT: transfers only via AssetRegistry");
        }

        return super._update(to, tokenId, auth);
    }

    // -------------------------------------------------------------------------
    // AssetRegistry-controlled operations
    // -------------------------------------------------------------------------

    /**
     * @notice Mint a new Asset NFT to `recipient`.
     * @dev Only callable by the bound AssetRegistry.
     */
    function mint(address recipient, string calldata tokenUri)
        external
        onlyAssetRegistry
        returns (uint256)
    {
        uint256 tokenId = _nextTokenId++;
        _safeMint(recipient, tokenId);
        if (bytes(tokenUri).length > 0) {
            _setTokenURI(tokenId, tokenUri);
        }
        return tokenId;
    }

    /**
     * @notice Registry-governed transfer of an Asset NFT.
     * @dev Only callable by the bound AssetRegistry after policy checks.
     */
    function transferFromRegistry(address from, address to, uint256 tokenId)
        external
        onlyAssetRegistry
    {
        _transfer(from, to, tokenId);
    }

    /**
     * @notice Burn an Asset NFT.
     * @dev Only callable by the bound AssetRegistry.
     */
    function burn(uint256 tokenId) external onlyAssetRegistry {
        _burn(tokenId);
    }

    /**
     * @notice Update token metadata URI.
     * @dev Only callable by the bound AssetRegistry.
     */
    function updateTokenURI(uint256 tokenId, string calldata newTokenUri)
        external
        onlyAssetRegistry
    {
        _setTokenURI(tokenId, newTokenUri);
    }

    /// @notice Returns the next token ID that will be minted.
    function currentTokenId() external view returns (uint256) {
        return _nextTokenId;
    }
}

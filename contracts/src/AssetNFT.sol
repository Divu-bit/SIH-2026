// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AssetNFT
 * @dev ERC-721 Token representing unique digital assets and verifiable credentials on-chain.
 * Minting, burning, and transfers can be mediated by the AssetRegistry to ensure policy compliance.
 */
contract AssetNFT is ERC721URIStorage, Ownable {
    address public assetRegistry;
    uint256 private _nextTokenId = 1;

    event AssetRegistryUpdated(address indexed previousRegistry, address indexed newRegistry);

    modifier onlyAssetRegistry() {
        require(msg.sender == assetRegistry, "AssetNFT: caller is not AssetRegistry");
        _;
    }

    constructor(address initialOwner) ERC721("TrustChain Verifiable Asset", "TCVA") Ownable(initialOwner) {}

    /**
     * @notice Set the governing AssetRegistry contract
     */
    function setAssetRegistry(address _assetRegistry) external onlyOwner {
        require(_assetRegistry != address(0), "AssetNFT: zero address AssetRegistry");
        address old = assetRegistry;
        assetRegistry = _assetRegistry;
        emit AssetRegistryUpdated(old, _assetRegistry);
    }

    /**
     * @notice Mint a new unique Asset NFT to the recipient (Only AssetRegistry)
     */
    function mint(address recipient, string calldata tokenUri) external onlyAssetRegistry returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(recipient, tokenId);
        if (bytes(tokenUri).length > 0) {
            _setTokenURI(tokenId, tokenUri);
        }
        return tokenId;
    }

    /**
     * @notice Governed transfer of an Asset NFT (Only AssetRegistry)
     */
    function transferFromRegistry(address from, address to, uint256 tokenId) external onlyAssetRegistry {
        _transfer(from, to, tokenId);
    }

    /**
     * @notice Burn an Asset NFT (Only AssetRegistry)
     */
    function burn(uint256 tokenId) external onlyAssetRegistry {
        _burn(tokenId);
    }

    /**
     * @notice Update token URI (Only AssetRegistry)
     */
    function updateTokenURI(uint256 tokenId, string calldata newTokenUri) external onlyAssetRegistry {
        _setTokenURI(tokenId, newTokenUri);
    }

    /**
     * @notice Returns the next token ID to be minted
     */
    function currentTokenId() external view returns (uint256) {
        return _nextTokenId;
    }
}

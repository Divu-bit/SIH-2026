// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/AssetNFT.sol";

contract AssetNFTTest is Test {
    AssetNFT public assetNFT;

    address public owner = address(0x1);
    address public mockRegistry = address(0x2);
    address public newRegistry = address(0x3);
    address public attacker = address(0x99);

    event AssetRegistryProposed(
        address indexed currentRegistry,
        address indexed proposedRegistry
    );
    event AssetRegistryAccepted(
        address indexed previousRegistry,
        address indexed newRegistry
    );

    function setUp() public {
        vm.prank(owner);
        assetNFT = new AssetNFT(owner);

        // Bind mock registry via 2-step propose -> accept
        vm.prank(owner);
        assetNFT.proposeAssetRegistry(mockRegistry);

        vm.prank(mockRegistry);
        assetNFT.acceptAssetRegistry();
    }

    function test_InitialState() public view {
        assertEq(assetNFT.owner(), owner);
        assertEq(assetNFT.assetRegistry(), mockRegistry);
        assertEq(assetNFT.pendingAssetRegistry(), address(0));
        assertEq(assetNFT.currentTokenId(), 1);
    }

    function test_ProposeAssetRegistry_Success() public {
        vm.expectEmit(true, true, false, true);
        emit AssetRegistryProposed(mockRegistry, newRegistry);

        vm.prank(owner);
        assetNFT.proposeAssetRegistry(newRegistry);

        assertEq(assetNFT.pendingAssetRegistry(), newRegistry);
    }

    function test_ProposeAssetRegistry_ZeroAddress_Reverts() public {
        vm.prank(owner);
        vm.expectRevert("AssetNFT: zero address");
        assetNFT.proposeAssetRegistry(address(0));
    }

    function test_ProposeAssetRegistry_AlreadyCurrent_Reverts() public {
        vm.prank(owner);
        vm.expectRevert("AssetNFT: already current registry");
        assetNFT.proposeAssetRegistry(mockRegistry);
    }

    function test_ProposeAssetRegistry_NonOwner_Reverts() public {
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("OwnableUnauthorizedAccount(address)")), attacker));
        assetNFT.proposeAssetRegistry(newRegistry);
    }

    function test_AcceptAssetRegistry_NonPending_Reverts() public {
        vm.prank(owner);
        assetNFT.proposeAssetRegistry(newRegistry);

        vm.prank(attacker);
        vm.expectRevert("AssetNFT: caller is not the pending AssetRegistry");
        assetNFT.acceptAssetRegistry();
    }

    function test_AcceptAssetRegistry_Success() public {
        vm.prank(owner);
        assetNFT.proposeAssetRegistry(newRegistry);

        vm.expectEmit(true, true, false, true);
        emit AssetRegistryAccepted(mockRegistry, newRegistry);

        vm.prank(newRegistry);
        assetNFT.acceptAssetRegistry();

        assertEq(assetNFT.assetRegistry(), newRegistry);
        assertEq(assetNFT.pendingAssetRegistry(), address(0));
    }

    function test_Mint_Success_WithAndWithoutURI() public {
        // Mint with URI
        vm.prank(mockRegistry);
        uint256 id1 = assetNFT.mint(address(0x10), "ipfs://uri1");
        assertEq(id1, 1);
        assertEq(assetNFT.ownerOf(1), address(0x10));
        assertEq(assetNFT.tokenURI(1), "ipfs://uri1");

        // Mint with empty URI
        vm.prank(mockRegistry);
        uint256 id2 = assetNFT.mint(address(0x20), "");
        assertEq(id2, 2);
        assertEq(assetNFT.ownerOf(2), address(0x20));
        assertEq(assetNFT.currentTokenId(), 3);
    }

    function test_Mint_Unauthorized_Reverts() public {
        vm.prank(attacker);
        vm.expectRevert("AssetNFT: caller is not AssetRegistry");
        assetNFT.mint(attacker, "ipfs://test");
    }

    function test_TransferFromRegistry_Success() public {
        vm.prank(mockRegistry);
        uint256 id = assetNFT.mint(address(0x10), "ipfs://uri");

        vm.prank(mockRegistry);
        assetNFT.transferFromRegistry(address(0x10), address(0x20), id);

        assertEq(assetNFT.ownerOf(id), address(0x20));
    }

    function test_TransferFromRegistry_Unauthorized_Reverts() public {
        vm.prank(mockRegistry);
        uint256 id = assetNFT.mint(address(0x10), "ipfs://uri");

        vm.prank(attacker);
        vm.expectRevert("AssetNFT: caller is not AssetRegistry");
        assetNFT.transferFromRegistry(address(0x10), address(0x20), id);
    }

    function test_DirectTransfer_Blocked() public {
        vm.prank(mockRegistry);
        uint256 id = assetNFT.mint(address(0x10), "ipfs://uri");

        vm.prank(address(0x10));
        vm.expectRevert("AssetNFT: transfers only via AssetRegistry");
        assetNFT.transferFrom(address(0x10), address(0x20), id);
    }

    function test_Burn_Success() public {
        vm.prank(mockRegistry);
        uint256 id = assetNFT.mint(address(0x10), "ipfs://uri");

        vm.prank(mockRegistry);
        assetNFT.burn(id);

        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("ERC721NonexistentToken(uint256)")), id));
        assetNFT.ownerOf(id);
    }

    function test_Burn_Unauthorized_Reverts() public {
        vm.prank(mockRegistry);
        uint256 id = assetNFT.mint(address(0x10), "ipfs://uri");

        vm.prank(attacker);
        vm.expectRevert("AssetNFT: caller is not AssetRegistry");
        assetNFT.burn(id);
    }

    function test_UpdateTokenURI_Success() public {
        vm.prank(mockRegistry);
        uint256 id = assetNFT.mint(address(0x10), "ipfs://old");

        vm.prank(mockRegistry);
        assetNFT.updateTokenURI(id, "ipfs://new");

        assertEq(assetNFT.tokenURI(id), "ipfs://new");
    }

    function test_UpdateTokenURI_Unauthorized_Reverts() public {
        vm.prank(mockRegistry);
        uint256 id = assetNFT.mint(address(0x10), "ipfs://old");

        vm.prank(attacker);
        vm.expectRevert("AssetNFT: caller is not AssetRegistry");
        assetNFT.updateTokenURI(id, "ipfs://new");
    }
}

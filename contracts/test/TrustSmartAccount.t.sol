// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/AccountAbstraction/TrustSmartAccount.sol";

contract MockTarget {
    uint256 public val;

    function setVal(uint256 _v) external payable returns (uint256) {
        val = _v;
        return _v;
    }

    function fail() external pure {
        revert("Target failed");
    }
}

contract TrustSmartAccountTest is Test {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    TrustSmartAccount public account;
    MockTarget public target;

    uint256 public ownerPrivateKey = 0xA11CE;
    address public owner = vm.addr(ownerPrivateKey);
    address public attacker = address(0x99);

    event Executed(address indexed target, uint256 value, bytes data);
    event OwnerUpdated(address indexed oldOwner, address indexed newOwner);

    function setUp() public {
        account = new TrustSmartAccount(owner, "did:trustchain:smart_account_1");
        target = new MockTarget();
    }

    function test_Constructor_ZeroOwner_Reverts() public {
        vm.expectRevert("TrustSmartAccount: zero owner");
        new TrustSmartAccount(address(0), "did:trustchain:test");
    }

    function test_ReceiveETH() public {
        vm.deal(address(this), 1 ether);
        (bool ok, ) = address(account).call{value: 1 ether}("");
        assertTrue(ok);
        assertEq(address(account).balance, 1 ether);
    }

    function test_Execute_Success() public {
        bytes memory data = abi.encodeWithSelector(MockTarget.setVal.selector, 42);

        vm.expectEmit(true, false, false, true);
        emit Executed(address(target), 0, data);

        vm.prank(owner);
        bytes memory result = account.execute(address(target), 0, data);

        uint256 returnedVal = abi.decode(result, (uint256));
        assertEq(returnedVal, 42);
        assertEq(target.val(), 42);
    }

    function test_Execute_SelfCall_Success() public {
        // Self-call via execute allows onlySelf execution of transferOwnership
        bytes memory data = abi.encodeWithSelector(TrustSmartAccount.transferOwnership.selector, address(0x20));

        vm.prank(owner);
        account.execute(address(account), 0, data);

        assertEq(account.owner(), address(0x20));
    }

    function test_Execute_Unauthorized_Reverts() public {
        bytes memory data = abi.encodeWithSelector(MockTarget.setVal.selector, 42);

        vm.prank(attacker);
        vm.expectRevert("TrustSmartAccount: unauthorized caller");
        account.execute(address(target), 0, data);
    }

    function test_Execute_ZeroTarget_Reverts() public {
        vm.prank(owner);
        vm.expectRevert("TrustSmartAccount: zero target");
        account.execute(address(0), 0, "");
    }

    function test_Execute_TargetCallFailure_Reverts() public {
        bytes memory data = abi.encodeWithSelector(MockTarget.fail.selector);

        vm.prank(owner);
        vm.expectRevert("TrustSmartAccount: execution failed");
        account.execute(address(target), 0, data);
    }

    function test_ExecuteSigned_Success() public {
        bytes memory data = abi.encodeWithSelector(MockTarget.setVal.selector, 100);
        uint256 validUntil = block.timestamp + 3600;
        uint256 currentNonce = account.nonce();

        bytes32 messageHash = keccak256(
            abi.encodePacked(
                address(account),
                address(target),
                uint256(0),
                keccak256(data),
                currentNonce,
                validUntil,
                block.chainid
            )
        );

        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(ownerPrivateKey, ethSignedMessageHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        vm.expectEmit(true, false, false, true);
        emit Executed(address(target), 0, data);

        // Relayer/Attacker can broadcast the valid meta-tx
        vm.prank(attacker);
        bytes memory result = account.executeSigned(address(target), 0, data, validUntil, signature);

        uint256 returnedVal = abi.decode(result, (uint256));
        assertEq(returnedVal, 100);
        assertEq(target.val(), 100);
        assertEq(account.nonce(), currentNonce + 1);
    }

    function test_ExecuteSigned_Expired_Reverts() public {
        uint256 validUntil = block.timestamp - 1;

        vm.expectRevert("TrustSmartAccount: transaction expired");
        account.executeSigned(address(target), 0, "", validUntil, "");
    }

    function test_ExecuteSigned_InvalidSignature_Reverts() public {
        bytes memory data = abi.encodeWithSelector(MockTarget.setVal.selector, 100);
        uint256 validUntil = block.timestamp + 3600;

        uint256 wrongPrivateKey = 0xBAD;
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                address(account),
                address(target),
                uint256(0),
                keccak256(data),
                account.nonce(),
                validUntil,
                block.chainid
            )
        );

        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(wrongPrivateKey, ethSignedMessageHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        vm.expectRevert("TrustSmartAccount: invalid owner signature");
        account.executeSigned(address(target), 0, data, validUntil, signature);
    }

    function test_ExecuteSigned_TargetCallFailure_Reverts() public {
        bytes memory data = abi.encodeWithSelector(MockTarget.fail.selector);
        uint256 validUntil = block.timestamp + 3600;

        bytes32 messageHash = keccak256(
            abi.encodePacked(
                address(account),
                address(target),
                uint256(0),
                keccak256(data),
                account.nonce(),
                validUntil,
                block.chainid
            )
        );

        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(ownerPrivateKey, ethSignedMessageHash);
        bytes memory signature = abi.encodePacked(r, s, v);

        vm.expectRevert("TrustSmartAccount: signed execution failed");
        account.executeSigned(address(target), 0, data, validUntil, signature);
    }

    function test_TransferOwnership_Success() public {
        address newOwner = address(0x20);

        vm.expectEmit(true, true, false, true);
        emit OwnerUpdated(owner, newOwner);

        vm.prank(owner);
        account.transferOwnership(newOwner);

        assertEq(account.owner(), newOwner);
    }

    function test_TransferOwnership_Unauthorized_Reverts() public {
        vm.prank(attacker);
        vm.expectRevert("TrustSmartAccount: unauthorized caller");
        account.transferOwnership(attacker);
    }

    function test_TransferOwnership_ZeroOwner_Reverts() public {
        vm.prank(owner);
        vm.expectRevert("TrustSmartAccount: zero new owner");
        account.transferOwnership(address(0));
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title TrustSmartAccount
 * @dev ERC-4337 Compatible Smart Account representing a decentralized identity smart wallet.
 * Supports programmable access, key rotation, and gasless transaction execution via Paymasters.
 */
contract TrustSmartAccount {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    address public owner;
    string public did;
    uint256 public nonce;

    event Executed(address indexed target, uint256 value, bytes data);
    event OwnerUpdated(address indexed oldOwner, address indexed newOwner);

    modifier onlyOwner() {
        require(msg.sender == owner || msg.sender == address(this), "TrustSmartAccount: unauthorized caller");
        _;
    }

    constructor(address _owner, string memory _did) {
        require(_owner != address(0), "TrustSmartAccount: zero owner");
        owner = _owner;
        did = _did;
    }

    /**
     * @notice Direct execution of a transaction by the owner or authorized relayer
     */
    function execute(address target, uint256 value, bytes calldata data) external payable onlyOwner returns (bytes memory) {
        require(target != address(0), "TrustSmartAccount: zero target");
        (bool success, bytes memory result) = target.call{value: value}(data);
        require(success, "TrustSmartAccount: execution failed");
        emit Executed(target, value, data);
        return result;
    }

    /**
     * @notice Gasless / Meta-transaction execution using cryptographic signature
     */
    function executeSigned(
        address target,
        uint256 value,
        bytes calldata data,
        uint256 validUntil,
        bytes calldata signature
    ) external payable returns (bytes memory) {
        require(block.timestamp <= validUntil, "TrustSmartAccount: transaction expired");
        
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                address(this),
                target,
                value,
                keccak256(data),
                nonce++,
                validUntil,
                block.chainid
            )
        );

        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        address signer = ethSignedMessageHash.recover(signature);
        require(signer == owner, "TrustSmartAccount: invalid owner signature");

        (bool success, bytes memory result) = target.call{value: value}(data);
        require(success, "TrustSmartAccount: signed execution failed");
        emit Executed(target, value, data);
        return result;
    }

    /**
     * @notice Rotate the controller/owner of this smart account
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "TrustSmartAccount: zero new owner");
        address old = owner;
        owner = newOwner;
        emit OwnerUpdated(old, newOwner);
    }

    receive() external payable {}
}

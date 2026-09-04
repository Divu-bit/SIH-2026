// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../IdentityRegistry.sol";

/**
 * @title TrustPaymaster
 * @dev Gas-sponsorship paymaster contract for ERC-4337 Smart Accounts.
 * Subsidizes gas fees for users with verified active DIDs on the TrustChain platform.
 */
contract TrustPaymaster is Ownable {
    IdentityRegistry public identityRegistry;
    mapping(string => uint256) public sponsoredTxCount;
    uint256 public totalGasSponsored;

    event GasSponsored(address indexed smartAccount, string indexed did, uint256 gasRefunded);
    event Deposited(address indexed sender, uint256 amount);

    constructor(address _identityRegistry, address initialOwner) Ownable(initialOwner) {
        require(_identityRegistry != address(0), "TrustPaymaster: zero IdentityRegistry");
        identityRegistry = IdentityRegistry(_identityRegistry);
    }

    /**
     * @notice Deposit funds to sponsor user transactions
     */
    function deposit() external payable {
        emit Deposited(msg.sender, msg.value);
    }

    /**
     * @notice Checks if a user DID is eligible for sponsored gas
     */
    function isEligible(string calldata did, address controller) external view returns (bool) {
        return identityRegistry.isValidController(did, controller);
    }

    /**
     * @notice Sponsor transaction execution gas by refunding caller
     */
    function sponsorTransaction(
        address payable relayer,
        string calldata did,
        address smartAccount,
        uint256 gasCost
    ) external onlyOwner {
        require(identityRegistry.isValidController(did, smartAccount), "TrustPaymaster: smart account not valid DID controller");
        require(address(this).balance >= gasCost, "TrustPaymaster: insufficient sponsor balance");

        sponsoredTxCount[did]++;
        totalGasSponsored += gasCost;

        (bool success, ) = relayer.call{value: gasCost}("");
        require(success, "TrustPaymaster: refund failed");

        emit GasSponsored(smartAccount, did, gasCost);
    }

    /**
     * @notice Withdraw unused sponsor reserve funds
     */
    function withdraw(address payable recipient, uint256 amount) external onlyOwner {
        require(recipient != address(0), "TrustPaymaster: zero recipient");
        require(address(this).balance >= amount, "TrustPaymaster: insufficient balance");
        recipient.transfer(amount);
    }

    receive() external payable {
        emit Deposited(msg.sender, msg.value);
    }
}

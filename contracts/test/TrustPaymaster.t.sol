// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/RoleManager.sol";
import "../src/IdentityRegistry.sol";
import "../src/AccountAbstraction/TrustPaymaster.sol";

contract ETHRejector {
    receive() external payable {
        revert("ETH transfer rejected");
    }
}

contract TrustPaymasterTest is Test {
    RoleManager public roleManager;
    IdentityRegistry public identityRegistry;
    TrustPaymaster public paymaster;
    ETHRejector public rejector;

    address public owner = address(0x1);
    address public relayer = address(0x2);
    address public user1 = address(0x10);
    address public attacker = address(0x99);

    string public constant USER1_DID = "did:trustchain:user1_identifier_12345";

    event GasSponsored(address indexed smartAccount, string indexed did, uint256 gasRefunded);
    event Deposited(address indexed sender, uint256 amount);

    function setUp() public {
        vm.startPrank(owner);
        roleManager = new RoleManager(owner);
        identityRegistry = new IdentityRegistry(address(roleManager));
        paymaster = new TrustPaymaster(address(identityRegistry), owner);

        identityRegistry.registerIdentity(USER1_DID, user1, hex"1122", "ipfs://meta");
        vm.stopPrank();

        rejector = new ETHRejector();
    }

    function test_Constructor_ZeroAddress_Reverts() public {
        vm.expectRevert("TrustPaymaster: zero IdentityRegistry");
        new TrustPaymaster(address(0), owner);
    }

    function test_DepositAndReceive() public {
        vm.expectEmit(true, false, false, true);
        emit Deposited(owner, 1 ether);

        vm.prank(owner);
        vm.deal(owner, 1 ether);
        paymaster.deposit{value: 1 ether}();
        assertEq(address(paymaster).balance, 1 ether);

        // Fallback receive()
        vm.expectEmit(true, false, false, true);
        emit Deposited(relayer, 0.5 ether);

        vm.prank(relayer);
        vm.deal(relayer, 0.5 ether);
        (bool ok, ) = address(paymaster).call{value: 0.5 ether}("");
        assertTrue(ok);
        assertEq(address(paymaster).balance, 1.5 ether);
    }

    function test_IsEligible() public view {
        assertTrue(paymaster.isEligible(USER1_DID, user1));
        assertFalse(paymaster.isEligible(USER1_DID, attacker));
    }

    function test_SponsorTransaction_Success() public {
        vm.deal(address(paymaster), 2 ether);

        vm.expectEmit(true, true, false, true);
        emit GasSponsored(user1, USER1_DID, 0.1 ether);

        vm.prank(owner);
        paymaster.sponsorTransaction(payable(relayer), USER1_DID, user1, 0.1 ether);

        assertEq(paymaster.sponsoredTxCount(USER1_DID), 1);
        assertEq(paymaster.totalGasSponsored(), 0.1 ether);
        assertEq(relayer.balance, 0.1 ether);
    }

    function test_SponsorTransaction_Unauthorized_Reverts() public {
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("OwnableUnauthorizedAccount(address)")), attacker));
        paymaster.sponsorTransaction(payable(relayer), USER1_DID, user1, 0.1 ether);
    }

    function test_SponsorTransaction_InvalidController_Reverts() public {
        vm.prank(owner);
        vm.expectRevert("TrustPaymaster: smart account not valid DID controller");
        paymaster.sponsorTransaction(payable(relayer), USER1_DID, attacker, 0.1 ether);
    }

    function test_SponsorTransaction_InsufficientBalance_Reverts() public {
        vm.prank(owner);
        vm.expectRevert("TrustPaymaster: insufficient sponsor balance");
        paymaster.sponsorTransaction(payable(relayer), USER1_DID, user1, 1 ether);
    }

    function test_SponsorTransaction_TransferFailure_Reverts() public {
        vm.deal(address(paymaster), 2 ether);

        vm.prank(owner);
        vm.expectRevert("TrustPaymaster: refund failed");
        paymaster.sponsorTransaction(payable(address(rejector)), USER1_DID, user1, 0.1 ether);
    }

    function test_Withdraw_Success() public {
        vm.deal(address(paymaster), 5 ether);
        address payable recipient = payable(address(0x30));

        vm.prank(owner);
        paymaster.withdraw(recipient, 2 ether);

        assertEq(recipient.balance, 2 ether);
        assertEq(address(paymaster).balance, 3 ether);
    }

    function test_Withdraw_Unauthorized_Reverts() public {
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(bytes4(keccak256("OwnableUnauthorizedAccount(address)")), attacker));
        paymaster.withdraw(payable(attacker), 1 ether);
    }

    function test_Withdraw_ZeroRecipient_Reverts() public {
        vm.prank(owner);
        vm.expectRevert("TrustPaymaster: zero recipient");
        paymaster.withdraw(payable(address(0)), 1 ether);
    }

    function test_Withdraw_InsufficientBalance_Reverts() public {
        vm.prank(owner);
        vm.expectRevert("TrustPaymaster: insufficient balance");
        paymaster.withdraw(payable(relayer), 10 ether);
    }

    function test_Withdraw_TransferFailure_Reverts() public {
        vm.deal(address(paymaster), 2 ether);

        vm.prank(owner);
        vm.expectRevert("TrustPaymaster: withdrawal failed");
        paymaster.withdraw(payable(address(rejector)), 1 ether);
    }
}

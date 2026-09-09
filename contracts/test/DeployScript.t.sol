// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../script/Deploy.s.sol";

contract DeployScriptTest is Test {
    DeployScript public deployScript;

    function setUp() public {
        // Set PRIVATE_KEY env variable required by DeployScript
        vm.setEnv("PRIVATE_KEY", "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");
        deployScript = new DeployScript();
    }

    function test_DeployScript_Run_Success() public {
        // Execute the deployment script
        deployScript.run();
    }
}

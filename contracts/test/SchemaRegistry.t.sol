// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/RoleManager.sol";
import "../src/SchemaRegistry.sol";

contract SchemaRegistryTest is Test {
    RoleManager public roleManager;
    SchemaRegistry public schemaRegistry;

    address public admin = address(0x1);
    address public manager = address(0x2);
    address public attacker = address(0x99);

    bytes32 public constant HASH1 = keccak256("SCHEMA_HASH_1");
    bytes32 public constant HASH2 = keccak256("SCHEMA_HASH_2");

    event SchemaRegistered(
        string  indexed schemaId,
        bytes32 indexed schemaHash,
        string          schemaUri,
        address indexed author
    );

    event SchemaStatusChanged(
        string  indexed schemaId,
        bool            isActive,
        address indexed updatedBy
    );

    function setUp() public {
        vm.startPrank(admin);
        roleManager = new RoleManager(admin);
        roleManager.assignRole(roleManager.MANAGER_ROLE(), manager);
        schemaRegistry = new SchemaRegistry(address(roleManager));
        vm.stopPrank();
    }

    function test_Constructor_ZeroAddress_Reverts() public {
        vm.expectRevert("SchemaRegistry: zero address RoleManager");
        new SchemaRegistry(address(0));
    }

    function test_RegisterSchema_Success() public {
        vm.expectEmit(true, true, false, true);
        emit SchemaRegistered("CERT_V1", HASH1, "ipfs://QmCertV1", manager);

        vm.prank(manager);
        schemaRegistry.registerSchema(
            "CERT_V1",
            "Certificate V1",
            "ipfs://QmCertV1",
            HASH1,
            "1.0.0"
        );

        assertTrue(schemaRegistry.schemaExists("CERT_V1"));
        assertEq(schemaRegistry.totalSchemas(), 1);

        string[] memory allIds = schemaRegistry.getAllSchemaIds();
        assertEq(allIds.length, 1);
        assertEq(allIds[0], "CERT_V1");

        SchemaRegistry.Schema memory s = schemaRegistry.getSchema("CERT_V1");
        assertEq(s.schemaId, "CERT_V1");
        assertEq(s.name, "Certificate V1");
        assertEq(s.schemaUri, "ipfs://QmCertV1");
        assertEq(s.schemaHash, HASH1);
        assertEq(s.version, "1.0.0");
        assertEq(s.author, manager);
        assertTrue(s.isActive);
    }

    function test_RegisterSchema_EmptySchemaId_Reverts() public {
        vm.prank(admin);
        vm.expectRevert("SchemaRegistry: empty schemaId");
        schemaRegistry.registerSchema("", "Name", "ipfs://uri", HASH1, "1.0");
    }

    function test_RegisterSchema_EmptySchemaUri_Reverts() public {
        vm.prank(admin);
        vm.expectRevert("SchemaRegistry: empty schemaUri");
        schemaRegistry.registerSchema("ID1", "Name", "", HASH1, "1.0");
    }

    function test_RegisterSchema_ZeroSchemaHash_Reverts() public {
        vm.prank(admin);
        vm.expectRevert("SchemaRegistry: zero schemaHash");
        schemaRegistry.registerSchema("ID1", "Name", "ipfs://uri", bytes32(0), "1.0");
    }

    function test_RegisterSchema_DuplicateSchemaId_Reverts() public {
        vm.startPrank(admin);
        schemaRegistry.registerSchema("ID1", "Name", "ipfs://uri", HASH1, "1.0");

        vm.expectRevert("SchemaRegistry: schemaId already registered");
        schemaRegistry.registerSchema("ID1", "Name 2", "ipfs://uri2", HASH2, "2.0");
        vm.stopPrank();
    }

    function test_RegisterSchema_UnauthorizedCaller_Reverts() public {
        vm.prank(attacker);
        vm.expectRevert("SchemaRegistry: caller is not Manager or Admin");
        schemaRegistry.registerSchema("ID1", "Name", "ipfs://uri", HASH1, "1.0");
    }

    function test_SetSchemaStatus_Success() public {
        vm.prank(admin);
        schemaRegistry.registerSchema("ID1", "Name", "ipfs://uri", HASH1, "1.0");

        vm.expectEmit(true, false, false, true);
        emit SchemaStatusChanged("ID1", false, admin);

        vm.prank(admin);
        schemaRegistry.setSchemaStatus("ID1", false);

        SchemaRegistry.Schema memory s = schemaRegistry.getSchema("ID1");
        assertFalse(s.isActive);
    }

    function test_SetSchemaStatus_NonExistent_Reverts() public {
        vm.prank(admin);
        vm.expectRevert("SchemaRegistry: schema does not exist");
        schemaRegistry.setSchemaStatus("NON_EXISTENT", false);
    }

    function test_SetSchemaStatus_UnauthorizedCaller_Reverts() public {
        vm.prank(admin);
        schemaRegistry.registerSchema("ID1", "Name", "ipfs://uri", HASH1, "1.0");

        vm.prank(attacker);
        vm.expectRevert("SchemaRegistry: caller is not Manager or Admin");
        schemaRegistry.setSchemaStatus("ID1", false);
    }

    function test_GetSchema_NonExistent_Reverts() public {
        vm.expectRevert("SchemaRegistry: schema does not exist");
        schemaRegistry.getSchema("NON_EXISTENT");
    }

    function test_IsSchemaValid_Scenarios() public {
        // Non-existent schema
        assertFalse(schemaRegistry.isSchemaValid("ID1", bytes32(0)));
        assertFalse(schemaRegistry.isSchemaValid("ID1", HASH1));

        // Register schema
        vm.prank(admin);
        schemaRegistry.registerSchema("ID1", "Name", "ipfs://uri", HASH1, "1.0");

        // Valid with zero expected hash
        assertTrue(schemaRegistry.isSchemaValid("ID1", bytes32(0)));

        // Valid with matching expected hash
        assertTrue(schemaRegistry.isSchemaValid("ID1", HASH1));

        // Invalid with mismatched expected hash
        assertFalse(schemaRegistry.isSchemaValid("ID1", HASH2));

        // Deactivate schema
        vm.prank(admin);
        schemaRegistry.setSchemaStatus("ID1", false);

        // Inactive schema is not valid
        assertFalse(schemaRegistry.isSchemaValid("ID1", bytes32(0)));
        assertFalse(schemaRegistry.isSchemaValid("ID1", HASH1));
    }
}

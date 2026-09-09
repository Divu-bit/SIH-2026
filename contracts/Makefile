.PHONY: test coverage sizes clean build lint

# Run all tests
test:
	forge test -vvv

# Run tests with summary table only
test-summary:
	forge test --summary

# Coverage — must use --ir-minimum because forge coverage disables viaIR by default
# and AssetRegistry.sol hits the 16-slot EVM stack limit without IR.
coverage:
	forge coverage --ir-minimum --report summary

# Full LCOV report (for IDE integration / Codecov)
coverage-lcov:
	forge coverage --ir-minimum --report lcov

# Contract sizes (check against 24KB EIP-170 limit)
sizes:
	forge build --sizes

# Build
build:
	forge build

# Clean build artifacts
clean:
	forge clean

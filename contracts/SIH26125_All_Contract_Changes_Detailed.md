# SIH26125 — Complete Smart Contract Changes
## Detailed Implementation & Security Fix Specification

> **Project:** TrustChain — Blockchain-Based Secure Platform for Identity, Access Control, and Digital Asset Management  
> **Purpose:** Master `.md` document containing all contract changes that need to be made to the current codebase.
>
> **Important:** The original team-proposed fixes are preserved. Additional fixes identified during the review are included separately and clearly marked.

---

# 1. Current Contract Structure

```text
contracts/src/
├── AccountAbstraction/
│   ├── TrustPaymaster.sol
│   └── TrustSmartAccount.sol
├── AssetNFT.sol
├── AssetRegistry.sol
├── IdentityRegistry.sol
├── RoleManager.sol
└── SchemaRegistry.sol
```

Core contracts:

```text
RoleManager
IdentityRegistry
SchemaRegistry
AssetNFT
AssetRegistry
```

Account Abstraction contracts:

```text
TrustSmartAccount
TrustPaymaster
```

---

# 2. Implementation Priority

## P0 — Must fix before Core 5 is considered secure

1. Prevent direct ERC-721 transfer bypass.
2. Resolve DID ↔ NFT ownership/controller semantics.
3. Enforce issuer DID/controller authorization.
4. Validate recipient DID/controller relationship.
5. Fix stale `_didToTokens` mappings after asset transfer.
6. Remove hardcoded private keys from deployment/interaction scripts.
7. Strengthen identity lifecycle and controller-rotation behavior.

## P1 — Core security and robustness

1. DID format validation.
2. Controller reverse-mapping consistency.
3. Explicit credential-hash anchoring.
4. Dedicated asset revocation.
5. Reentrancy protection.
6. Pausable emergency mechanism.
7. Two-step AssetRegistry binding.
8. Two-step DID controller rotation.
9. Role whitelist.
10. Schema URI validation.
11. Schema status/deactivation events.

## P2 — Architecture and verification improvements

1. Credential authenticity through issuer signatures.
2. DID public-key verification model.
3. Asset expiration semantics.
4. Credential duplicate policy.
5. Stronger role boundaries.
6. Better event/indexing consistency.
7. Proper invariant testing.

## P3 — Account Abstraction

1. EIP-712.
2. Proper ERC-4337 Smart Account.
3. EntryPoint integration.
4. UserOperation validation.
5. Proper ERC-4337 Paymaster.
6. Sponsorship policy and accounting.

**Do not make P3 a dependency of the Core 5 MVP.**

---

# 3. `RoleManager.sol`

## 3.1 Whitelist application roles

### Problem

A generic function such as:

```solidity
assignRole(bytes32 role, address account)
```

can be dangerous if arbitrary role identifiers are accepted.

### Required behavior

Only the four application roles should be assignable:

```solidity
ADMIN_ROLE
MANAGER_ROLE
AUDITOR_ROLE
USER_ROLE
```

Reject anything else.

Conceptually:

```solidity
function _isValidApplicationRole(bytes32 role)
    internal
    pure
    returns (bool)
{
    return
        role == ADMIN_ROLE ||
        role == MANAGER_ROLE ||
        role == AUDITOR_ROLE ||
        role == USER_ROLE;
}
```

Then:

```text
assignRole()
    ↓
validate role
    ↓
valid application role?
    ├── NO → revert
    └── YES → grant
```

---

## 3.2 Role assignment/removal events

Maintain explicit events for:

```text
RoleAssigned
RoleUnassigned
```

Recommended information:

```text
account
role
assigner/remover
```

A human-readable role name can be included if desired, but it is not required for security and increases event gas/storage overhead.

---

## 3.3 Role count

Provide:

```solidity
getRoleCount(...)
```

for administration/testing.

If the implementation uses counters, ensure counters are updated correctly when roles are assigned and removed.

---

## 3.4 Least privilege

Final permissions should follow:

```text
ADMIN
 ├── system administration
 ├── role management
 ├── emergency pause
 └── privileged identity/asset management

MANAGER
 ├── authorized asset issuance
 └── appropriate management operations

AUDITOR
 └── read/audit functions

USER
 └── normal identity/asset operations allowed by policy
```

Do not give all roles unnecessary write privileges.

---

# 4. `IdentityRegistry.sol`

## 4.1 DID prefix validation

Require:

```text
did:trustchain:
```

Example:

```text
did:trustchain:user123
```

Reject:

```text
did:wrong:user123
```

The implementation should validate the prefix rather than forcing the DID to be directly derived from an Ethereum address.

---

## 4.2 DID minimum length

Reject extremely short DIDs.

The current test expectation is:

```text
minimum length = 20 characters
```

This is a basic sanity check, not a complete DID-method implementation.

---

## 4.3 Do NOT force address-derived DIDs

Avoid permanently forcing:

```text
did:trustchain:0x<40 hexadecimal characters>
```

unless the project intentionally decides that this is its final DID method.

Why:

```text
DID
≠
Ethereum address
```

A controller can be:

```text
EOA
Smart Account
other authorized controller
```

and the DID should remain logically independent.

---

# 5. Identity Controller Mapping

## 5.1 Problem

A mapping such as:

```solidity
mapping(address => string[]) private _controllerToDids;
```

can become stale after:

```text
Controller A
     ↓
Controller B
```

If the DID remains in Controller A's array, reverse queries become incorrect.

---

## 5.2 Required solution

Use:

```text
controller
    ↓
DID array
    +
DID → index mapping
```

Conceptually:

```solidity
mapping(address => string[]) private _controllerToDids;
mapping(address => mapping(string => uint256)) private _controllerDidIndex;
```

When removing:

```text
1. Find DID index.
2. Move last array element into that position.
3. Update moved element's index.
4. Pop the final element.
5. Delete old index.
```

This is the standard swap-and-pop approach.

---

# 6. Controller Rotation

## 6.1 Use two-step rotation

Do not immediately replace the controller.

Use:

```text
proposeController()
        ↓
pendingController
        ↓
acceptController()
        ↓
new controller
```

Example:

```text
DID
 │
 └── Controller A

A proposes B

DID
 │
 ├── Controller A
 └── Pending Controller B

B accepts

DID
 │
 └── Controller B
```

---

## 6.2 Why two-step rotation is necessary

It prevents:

```text
A accidentally assigning DID to wrong address
```

and gives the new controller an opportunity to explicitly accept control.

---

## 6.3 Rotation authorization

Only the existing controller or appropriate administrator should be able to propose a new controller.

Only the proposed controller should be able to call:

```solidity
acceptController()
```

A random third party must revert.

---

## 6.4 Clear pending controller

After successful acceptance:

```text
pendingController = address(0)
```

and update:

```text
current controller
reverse mapping
updatedAt
```

atomically.

---

# 7. Identity Status Lifecycle

Recommended state machine:

```text
             ┌──────────────┐
             │    ACTIVE    │
             └──────┬───────┘
                    │
             suspend│
                    ↓
             ┌──────────────┐
             │  SUSPENDED   │
             └──────┬───────┘
                    │
             reactivate
                    │
                    └────────→ ACTIVE

ACTIVE
  │
  │ revoke
  ↓
┌──────────────┐
│   REVOKED    │
└──────────────┘
       │
       │
       └── TERMINAL
```

---

## 7.1 REVOKED must be terminal

Once:

```text
IdentityStatus.REVOKED
```

is reached:

```text
REVOKED → ACTIVE
REVOKED → SUSPENDED
```

must not be possible.

This should remain true even for Admin unless governance requirements explicitly change later.

---

## 7.2 SUSPENDED can reactivate

A suspended identity may return:

```text
SUSPENDED → ACTIVE
```

but only through the authorized lifecycle-management path.

---

## 7.3 Identity lifecycle authority

For an enterprise deployment, consider restricting:

```text
SUSPEND
REVOKE
REACTIVATE
```

to Admin/authorized authority rather than allowing a user/controller to arbitrarily change its own security status.

The current terminal-revocation protection is the essential requirement.

---

# 8. Identity Public Key

Current `publicKey` storage is not equivalent to cryptographic verification.

The system should clearly distinguish:

```text
stored public key
```

from:

```text
cryptographically verified signature
```

Later, when implementing credentials:

```text
Issuer signature
       ↓
issuer DID
       ↓
DID public key
       ↓
signature verification
```

Do not claim that storing `publicKey` alone proves authenticity.

---

# 9. `SchemaRegistry.sol`

## 9.1 Validate schema URI

Reject:

```text
empty schema URI
```

Require a usable schema reference.

---

## 9.2 Validate schema identity

A schema should have:

```text
schemaId
name
schemaUri
schemaHash
version
author
active status
registration timestamp
```

The schema hash should represent the actual schema definition.

---

## 9.3 Schema status event

Emit a dedicated status event:

```text
SchemaStatusChanged
```

containing enough information for off-chain indexing.

---

# 10. Schema Deactivation Semantics

Deactivation should mean:

```text
Schema V1
    ↓
inactive
    ↓
❌ cannot issue new assets using V1
```

It should NOT mean:

```text
Existing V1 assets
    ↓
❌ automatically invalid
```

Historical assets should remain auditable/verifiable.

This allows emergency deactivation:

```text
V1 has a problem
      ↓
Deactivate V1
      ↓
Stop new issuance
      ↓
Historical V1 records remain available
```

Do not require a replacement schema version before emergency deactivation.

---

# 11. `AssetNFT.sol`

## 11.1 Two-step AssetRegistry binding

Replace a one-step:

```solidity
setAssetRegistry(...)
```

with:

```text
proposeAssetRegistry(...)
        ↓
pendingAssetRegistry
        ↓
acceptAssetRegistry(...)
```

This protects against accidental registry assignment.

---

## 11.2 Only the intended registry should control the NFT

The NFT contract should allow:

```text
mint
burn
URI updates
managed transfers
```

only through the authorized `AssetRegistry`.

---

# 12. Critical: Block Direct ERC-721 Transfer Bypass

## 12.1 Problem

Standard ERC-721 exposes:

```text
transferFrom()
safeTransferFrom()
```

If users can call these directly, they may bypass:

```text
AssetRegistry
isTransferable
DID ownership
asset status
pause state
authorization
```

---

## 12.2 Required behavior

All TrustChain asset transfers must go through:

```text
AssetRegistry.transferAsset()
```

Flow:

```text
User
 ↓
AssetRegistry.transferAsset()
 ↓
authorization
 ↓
DID validation
 ↓
asset status
 ↓
isTransferable
 ↓
NFT transfer
```

The direct ERC-721 path must revert.

---

## 12.3 Test both transfer functions

Explicitly test:

```text
transferFrom()
safeTransferFrom()
```

for bypass attempts.

Both must fail when called directly by a user.

---

# 13. `AssetRegistry.sol` — Asset Model

Recommended logical model:

```text
Asset
 ├── tokenId
 ├── assetType
 ├── schemaId
 ├── credentialHash
 ├── ownerDID
 ├── issuerDID
 ├── issuerAddress
 ├── issuedAt
 ├── expiresAt
 ├── status
 ├── isTransferable
 └── metadataUri
```

---

# 14. DID ↔ NFT Ownership Model

This must be explicitly defined.

Recommended:

```text
DID
 │
 ├── logical owner of assets
 │
 └── controller
        ↓
      EOA / Smart Account
```

and:

```text
Asset
  ↓
NFT
  ↓
blockchain representation
```

The NFT address should not become the only source of truth for logical identity ownership.

---

# 15. Critical Controller-Rotation Ownership Issue

Consider:

```text
DID A
 ↓
Controller A
 ↓
NFT owner A
```

Then:

```text
Controller A
      ↓
Controller B
```

The intended architecture should allow:

```text
DID A
 ↓
Controller B
```

without requiring every asset to be transferred.

Therefore the authorization check for asset operations must use the **current DID controller**, not blindly trust the old ERC-721 owner.

---

## Required authorization concept

For an asset operation:

```text
asset.ownerDID
      ↓
IdentityRegistry
      ↓
current DID controller
      ↓
msg.sender
```

The operation is authorized only if:

```text
msg.sender == current DID controller
```

or the caller has an appropriate administrative role.

This prevents an old controller from retaining authority after controller rotation.

---

# 16. Recipient Validation

When issuing/transferring an asset:

```text
ownerDID
     ↓
IdentityRegistry
     ↓
DID exists?
     ↓
DID ACTIVE?
     ↓
recipient is current controller?
```

If not:

```text
REVERT
```

This prevents assigning assets to an unrelated address while claiming another DID as the owner.

---

# 17. Issuer Authorization

The issuer fields must not be trusted simply because the caller supplies them.

Required relationship:

```text
issuerDID
     ↓
IdentityRegistry
     ↓
ACTIVE?
     ↓
controller == msg.sender?
     ↓
issuer authorized?
```

At minimum, the current issuance path should verify:

```text
issuerDID is active
msg.sender is issuerDID controller
msg.sender has appropriate issuance role
```

This prevents:

```text
Attacker
 ↓
claims to be issuerDID
 ↓
issues fake asset
```

---

# 18. Credential Hash Anchoring

Use:

```solidity
mapping(bytes32 => bool) private _hashAnchored;
```

instead of relying on a token ID of `0` as the duplicate sentinel.

Flow:

```text
credentialHash
       ↓
_hashAnchored?
       ├── YES → revert
       └── NO  → anchor
```

### Important policy question

Decide whether identical credential contents may legitimately be issued more than once.

If:

```text
one credential = one unique asset
```

then duplicate hashes should be rejected.

If:

```text
same credential content can be legitimately issued to multiple holders
```

then the uniqueness policy needs to be redesigned.

Do not leave this ambiguous.

---

# 19. Schema Validation During Asset Issuance

Before issuance:

```text
schemaId
   ↓
SchemaRegistry
   ↓
exists?
   ↓
active?
   ↓
YES
   ↓
issue
```

If inactive:

```text
REVERT
```

Schema deactivation should affect future issuance, not historical asset records.

---

# 20. Asset Status

Recommended statuses:

```text
ACTIVE
SUSPENDED
REVOKED
EXPIRED
```

---

## 20.1 ACTIVE

Normal valid state.

---

## 20.2 SUSPENDED

Temporarily disabled.

Can potentially return to:

```text
ACTIVE
```

through authorized management.

---

## 20.3 REVOKED

Permanent invalid state.

Should not return to:

```text
ACTIVE
```

---

## 20.4 EXPIRED

Validity period has ended.

Historical verification can still show:

```text
asset exists
```

while current-validity verification returns:

```text
expired
```

---

# 21. Dedicated Asset Revocation

Do not allow:

```text
updateAssetStatus(..., REVOKED)
```

to silently revoke an asset.

Use:

```text
revokeAsset()
```

which emits:

```text
AssetRevoked
```

This guarantees that revocation has an explicit audit event.

---

# 22. Reentrancy Protection

`AssetRegistry` performs external calls to `AssetNFT`.

Protect state-changing functions such as:

```text
issueAsset()
issueAssetWithParams()
transferAsset()
```

with:

```solidity
nonReentrant
```

and follow:

```text
Checks
 ↓
Effects
 ↓
Interactions
```

Do not rely only on the modifier.

---

# 23. Pausable Emergency Mechanism

Use OpenZeppelin `Pausable`.

During pause:

```text
❌ issue
❌ mint
❌ transfer
```

should normally be blocked.

But:

```text
✅ read
✅ verify
```

should remain available.

This allows emergency containment without disabling public verification.

---

# 24. Credential Hash ≠ Credential Authenticity

This is an important architectural distinction.

A hash proves:

```text
credential content
        ↓
has not changed
```

It does NOT prove:

```text
credential was legitimately issued
```

Therefore the final verification system should include an issuer signature.

---

# 25. Recommended Credential Verification Pipeline

```text
Credential received
        ↓
Schema validation
        ↓
Credential hash calculation
        ↓
Compare with blockchain hash
        ↓
Issuer signature verification
        ↓
Issuer DID verification
        ↓
Asset/NFT lookup
        ↓
Owner DID verification
        ↓
Status verification
        ↓
Expiration verification
        ↓
FINAL RESULT
```

---

# 26. Generic Credential Architecture

Do not put asset-specific verification logic into Solidity.

Avoid:

```text
verifyCertificate()
verifySoftwareLicense()
verifyVehicle()
verifyLandTitle()
```

Instead:

```text
Asset
 ↓
assetType
 ↓
schemaId
 ↓
generic verification rules
```

The schema defines the structure.

---

# 27. Example Schemas

## Software License

```text
licenseNumber
product
issuer
issuedTo
issuedAt
expiresAt
```

## Certificate

```text
certificateNumber
course
issuer
recipient
issuedAt
```

## Vehicle

```text
registrationNumber
manufacturer
model
owner
manufacturedAt
```

## Defense/Enterprise Asset

```text
assetIdentifier
assetClass
issuer
assignedTo
issuedAt
classification/status
```

The contract should not need to understand the individual fields.

---

# 28. Off-Chain Credential Storage

Actual credential data should generally be stored off-chain.

Blockchain stores:

```text
asset ID
schema ID
credential hash
DID references
status
timestamps
NFT token ID
```

Off-chain storage can contain:

```text
credential JSON
document metadata
larger files
encrypted sensitive information
```

---

# 29. Privacy

Do not put sensitive information directly on a public blockchain.

Avoid storing:

```text
PII
private documents
secrets
large files
```

directly on-chain.

For sensitive data:

```text
Sensitive credential
      ↓
encrypted storage
      ↓
hash/reference on blockchain
```

Remember:

```text
IPFS CID ≠ privacy
```

Public IPFS content is still publicly retrievable.

---

# 30. `TrustSmartAccount.sol`

The current contract is an AA-like prototype.

It should not yet be presented as a complete ERC-4337 implementation.

---

# 31. Replace Custom Packed Signing with EIP-712

Current custom signing based on:

```solidity
abi.encodePacked(...)
```

should be replaced in the final AA version.

Use:

```text
EIP-712
```

with:

```text
Domain Separator
Type Hash
Chain ID
Contract Address
Nonce
Validity
Target
Value
Call Data
```

This provides typed structured signing and stronger domain separation.

---

# 32. Proper ERC-4337 Architecture

Final AA architecture:

```text
User
 ↓
UserOperation
 ↓
EntryPoint
 ↓
TrustSmartAccount
 ↓
validateUserOp()
 ↓
execute()
```

The smart account should eventually implement the relevant ERC-4337 interface rather than only providing a custom `executeSigned()` mechanism.

---

# 33. DID and Smart Account Synchronization

Avoid two independent identity sources:

```text
DID controller
```

and:

```text
SmartAccount owner
```

without a defined relationship.

Recommended:

```text
DID
 ↓
controller
 ↓
Smart Account
```

or clearly define the account as the DID controller.

Controller changes must remain consistent with smart-account ownership.

---

# 34. `TrustPaymaster.sol`

## 34.1 ETH transfer

Use:

```solidity
(bool success, ) = recipient.call{value: amount}("");
require(success, "...");
```

instead of:

```solidity
recipient.transfer(amount);
```

The call result must be checked.

---

# 35. Proper ERC-4337 Paymaster

The current Paymaster is not yet a complete ERC-4337 Paymaster.

Final architecture:

```text
UserOperation
      ↓
EntryPoint
      ↓
Paymaster validation
      ↓
sponsorship decision
      ↓
operation execution
      ↓
post-operation accounting
```

Eventually add:

```text
sponsorship rules
budget limits
gas limits
authorized operations
accounting
emergency controls
```

---

# 36. Deployment Scripts — Critical Security Fix

## Current problem

Do NOT keep:

```solidity
vm.envOr(
    "PRIVATE_KEY",
    uint256(0x...)
);
```

with an actual private key fallback in repository code.

Even if it is a development/test key, this is unsafe project hygiene.

---

## Required implementation

Use:

```solidity
uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
```

Then provide the key through the environment.

Example:

```bash
export PRIVATE_KEY=your_private_key
```

or a local `.env` file that is ignored by Git.

---

## `.gitignore`

Ensure:

```text
.env
.env.*
```

are ignored as appropriate.

Never commit:

```text
private keys
mnemonics
RPC credentials
API secrets
```

---

# 37. `Deploy.s.sol`

The deployment dependency order is correct:

```text
1. RoleManager
2. IdentityRegistry
3. SchemaRegistry
4. AssetNFT
5. AssetRegistry
6. Bind AssetNFT ↔ AssetRegistry
7. Paymaster
8. Register Admin DID
9. Register standard schemas
```

Maintain this order unless dependencies are deliberately redesigned.

---

# 38. Deployment Validation

After deployment, verify:

```text
RoleManager address
IdentityRegistry address
SchemaRegistry address
AssetNFT address
AssetRegistry address
Paymaster address
```

Then verify:

```text
AssetNFT.assetRegistry()
```

points to the correct registry.

Also verify:

```text
AssetRegistry.assetNFT()
```

points to the expected NFT contract.

---

# 39. Sepolia Interaction Script

The interaction script should:

```text
1. Load addresses from environment.
2. Verify deployer role.
3. Verify deployer DID.
4. Issue test asset.
5. Verify asset.
```

Do not hardcode private keys.

Use:

```text
PRIVATE_KEY
ROLE_MANAGER_ADDRESS
IDENTITY_REGISTRY_ADDRESS
ASSET_REGISTRY_ADDRESS
```

from the environment.

---

# 40. Security Test Matrix

Maintain at least these tests:

| # | Security Test |
|---|---|
| 1 | Unauthorized admin action |
| 2 | Unauthorized manager action |
| 3 | Unauthorized auditor action |
| 4 | Invalid role assignment |
| 5 | Duplicate DID |
| 6 | Invalid DID prefix |
| 7 | Too-short DID |
| 8 | Unauthorized controller proposal |
| 9 | Unauthorized controller acceptance |
| 10 | Controller reverse mapping after rotation |
| 11 | Revoked DID cannot reactivate |
| 12 | Suspended DID can reactivate through authority |
| 13 | Empty schema URI |
| 14 | Inactive schema cannot issue assets |
| 15 | Duplicate credential hash |
| 16 | Unauthorized asset issuance |
| 17 | Invalid recipient DID |
| 18 | Invalid issuer DID/controller |
| 19 | Non-transferable asset transfer |
| 20 | Direct `transferFrom()` bypass |
| 21 | Direct `safeTransferFrom()` bypass |
| 22 | Unauthorized status change |
| 23 | Dedicated revocation |
| 24 | Expired asset verification |
| 25 | Paused issuance |
| 26 | Paused transfer |
| 27 | Reentrancy attempt |
| 28 | NFT/AssetRegistry consistency |
| 29 | DID/token index consistency |
| 30 | Old controller cannot act after rotation |

---

# 41. Fuzz Testing

Fuzz:

```text
DID registration
controller addresses
DID strings
schema identifiers
credential hashes
expiration timestamps
asset transfers
role assignments
asset status transitions
```

Important properties:

```text
Invalid DID never registers.
```

```text
Unauthorized role is never granted.
```

```text
Unauthorized issuer cannot issue.
```

```text
Non-transferable asset never transfers.
```

```text
Revoked identity never becomes active.
```

```text
Revoked asset never becomes active.
```

---

# 42. Invariant Testing

Use actual Foundry invariants where possible, not only individual unit tests.

## Invariant 1

Every registered asset corresponds to exactly one NFT.

```text
AssetRegistry
      ↕
AssetNFT
```

---

## Invariant 2

Every managed NFT has an AssetRegistry record.

No orphaned managed NFT.

---

## Invariant 3

Non-transferable assets cannot move through any supported transfer path.

---

## Invariant 4

Every ACTIVE asset has an ACTIVE owner DID.

---

## Invariant 5

Every newly issued asset has an authorized issuer.

---

## Invariant 6

Credential hash remains consistent.

---

## Invariant 7

REVOKED identity never becomes ACTIVE.

---

## Invariant 8

REVOKED asset never becomes ACTIVE.

---

## Invariant 9

Controller reverse mappings remain consistent.

---

## Invariant 10

DID token indexes remain consistent after transfers.

---

## Invariant 11

Direct NFT transfer cannot bypass AssetRegistry.

---

## Invariant 12

Only valid application roles can be assigned.

---

# 43. Test Coverage

Target:

```text
≥ 90% line coverage
```

Run:

```bash
forge test -vvv
forge coverage
```

Also run:

```bash
forge build --sizes
```

Coverage should not be treated as proof of security.

The security argument should be:

```text
Unit tests
+
Negative tests
+
Fuzz tests
+
Invariant tests
+
Security matrix
+
Manual review
+
Coverage
```

---

# 44. Contract Size

Use:

```bash
forge build --sizes
```

Avoid putting heavy logic inside Solidity.

Do NOT implement:

```text
arbitrary JSON parsing
large credential processing
complex signature engines
asset-specific business logic
```

on-chain unless there is a strong reason.

---

# 45. Recommended Verification Split

## Solidity

Handle:

```text
asset existence
NFT relationship
ownership representation
schema registration/status
credential hash anchoring
DID/controller relationship
roles
permissions
asset status
expiration
revocation
transfer rules
audit events
```

## Rust Backend

Handle:

```text
credential retrieval
JSON/schema validation
credential parsing
issuer signature verification
DID document resolution
off-chain indexing
search
API
verification aggregation
```

This keeps the blockchain layer generic and efficient.

---

# 46. Recommended Rust Backend

```text
Rust
 ├── Axum
 ├── Tokio
 ├── Serde
 ├── Alloy
 └── SQLx
        ↓
    PostgreSQL
```

Responsibilities:

```text
Blockchain event indexer
Credential verification
Schema validation
Issuer signature verification
Asset search
Verification API
Audit/event indexing
```

---

# 47. Recommended Frontend

```text
React
TypeScript
Vite
Tailwind CSS
wagmi
viem
```

Screens:

```text
Dashboard
DID Management
Role Management
Schema Management
Asset Issuance
Asset Management
Verification
Audit History
```

---

# 48. Public Verification Portal

A strong SIH demonstration should provide independent verification.

Flow:

```text
QR Code / Asset ID
        ↓
Public Verification Portal
        ↓
Blockchain lookup
        ↓
Credential lookup
        ↓
Schema validation
        ↓
Credential hash comparison
        ↓
Issuer signature verification
        ↓
Issuer DID verification
        ↓
NFT ownership/state verification
        ↓
Result
```

Example:

```text
✓ Asset exists
✓ Schema valid
✓ Credential hash matches
✓ Issuer verified
✓ DID verified
✓ Ownership verified
✓ Asset active
✓ Not expired

STATUS: AUTHENTIC
```

---

# 49. Development Sequence

## Phase 1 — Core Contracts

```text
RoleManager
      ↓
IdentityRegistry
      ↓
SchemaRegistry
      ↓
AssetNFT
      ↓
AssetRegistry
```

---

## Phase 2 — Fixes

Implement:

```text
P0
 ↓
P1
 ↓
P2
```

Do not move to final deployment before P0 is complete.

---

## Phase 3 — Testing

```text
Unit tests
 ↓
Negative tests
 ↓
Security matrix
 ↓
Fuzzing
 ↓
Invariants
 ↓
Coverage
 ↓
Contract size
```

---

## Phase 4 — EOA MVP

Complete:

```text
Wallet connection
      ↓
DID registration
      ↓
Role management
      ↓
Schema registration
      ↓
Asset issuance
      ↓
NFT minting
      ↓
Asset transfer
      ↓
Asset verification
      ↓
Suspension/revocation
```

The entire flow must work without Account Abstraction.

---

## Phase 5 — Rust Backend

Implement:

```text
Indexer
Credential validation
Signature verification
Verification API
PostgreSQL
```

---

## Phase 6 — React Frontend

Integrate:

```text
wallet
DID
roles
schemas
assets
verification
audit
```

---

## Phase 7 — Account Abstraction

Only now implement:

```text
EIP-712
 ↓
Smart Account
 ↓
EntryPoint
 ↓
UserOperation
 ↓
Paymaster
```

---

# 50. What Should NOT Be Built Yet

Avoid:

```text
❌ Multiple blockchains
❌ Kubernetes
❌ Microservices
❌ Kafka
❌ Redis
❌ GraphQL
❌ Custom cryptography
❌ Custom NFT standard
❌ AI just for the sake of AI
❌ Asset-specific Solidity verification functions
❌ Production-scale distributed infrastructure
```

Focus on the SIH requirement:

```text
DID
+
RBAC
+
Schema Registry
+
NFT-based Asset Ownership
+
Issuer Authorization
+
Credential Integrity
+
Credential Authenticity
+
Immutable Audit Trail
+
Independent Verification
```

---

# 51. Final Architecture

```text
                         TRUSTCHAIN
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ↓              ↓              ↓
             DID            RBAC         Schemas
              │              │              │
              └──────────────┼──────────────┘
                             ↓
                      Asset Registry
                             │
                             ↓
                         Asset NFT
                             │
                    ┌────────┴────────┐
                    ↓                 ↓
                Ownership          Status
                    │                 │
                    └────────┬────────┘
                             ↓
                       Audit Events
                             │
                             ↓
                  Independent Verification
                             │
                ┌────────────┴────────────┐
                ↓                         ↓
          Rust Verification          Public Portal
                │
                ↓
        Credential Signature
           + Schema Check
           + Hash Check
           + DID Check
```

Later:

```text
EOA
 ↓
Smart Account
 ↓
ERC-4337
 ↓
EntryPoint
 ↓
Paymaster
```

---

# 52. The Most Important Architectural Rule

> **Solidity enforces universal trust, ownership, authorization, status, and integrity rules. Schemas define asset-specific structure. Credentials contain asset-specific claims. Issuer signatures establish provenance. The Rust/backend verification layer validates the off-chain credential and signature.**

Do not make Solidity understand every possible asset type.

Instead:

```text
Universal blockchain rules
        +
Generic asset model
        +
Schema-specific credential structure
        +
Issuer cryptographic proof
```

This gives TrustChain a scalable architecture for:

```text
Certificates
Software Licenses
Training Credentials
Defense/Enterprise Assets
Documents
Land/Registry Records
Other Digital Assets
```

without creating a separate Solidity verification function for every asset category.

---

# 53. Final Pre-MVP Checklist

## RoleManager

- [ ] Four-role whitelist
- [ ] Invalid roles rejected
- [ ] Role events
- [ ] Role counts
- [ ] Least-privilege permissions

## IdentityRegistry

- [ ] DID prefix
- [ ] DID minimum length
- [ ] Reverse mapping cleanup
- [ ] Controller index
- [ ] Two-step controller rotation
- [ ] Pending controller cleanup
- [ ] REVOKED terminal
- [ ] Authorized lifecycle management
- [ ] Public-key architecture defined

## SchemaRegistry

- [ ] Non-empty URI
- [ ] Schema hash
- [ ] Status event
- [ ] Deactivation behavior defined
- [ ] Historical schemas remain auditable

## AssetNFT

- [ ] Two-step registry binding
- [ ] Registry-only mint
- [ ] Registry-only burn
- [ ] Registry-only URI updates
- [ ] Direct `transferFrom()` blocked
- [ ] Direct `safeTransferFrom()` blocked

## AssetRegistry

- [ ] Credential hash anchoring
- [ ] Schema validation
- [ ] Issuer validation
- [ ] Recipient validation
- [ ] DID/controller authorization
- [ ] DID/NFT ownership semantics fixed
- [ ] `_didToTokens` cleanup
- [ ] Transferability enforcement
- [ ] Dedicated revoke function
- [ ] Revocation event
- [ ] Pausable
- [ ] ReentrancyGuard
- [ ] Expiration rules
- [ ] Duplicate hash policy

## AA

- [ ] EIP-712
- [ ] ERC-4337 EntryPoint
- [ ] `validateUserOp()`
- [ ] Replay protection
- [ ] Smart Account/DID relationship
- [ ] Real Paymaster
- [ ] Sponsorship policy
- [ ] Accounting

## Scripts

- [ ] No hardcoded private keys
- [ ] Environment-based secrets
- [ ] `.env` ignored
- [ ] Deployment validation
- [ ] Sepolia interaction validation

## Testing

- [ ] 15+ security cases
- [ ] 30-case matrix recommended
- [ ] Fuzz tests
- [ ] Proper invariants
- [ ] Controller rotation tests
- [ ] Direct NFT bypass tests
- [ ] Issuer authorization tests
- [ ] DID/token index tests
- [ ] Coverage ≥90% target
- [ ] `forge build --sizes`

---

# 54. Final Status of the Current Codebase

Based on the reviewed current files:

### Already implemented

```text
✅ DID prefix validation
✅ DID minimum length
✅ Controller reverse mapping cleanup
✅ Two-step controller rotation
✅ Terminal DID revocation
✅ Schema URI validation
✅ Schema status events
✅ Two-step AssetRegistry/NFT binding
✅ Credential hash anchoring
✅ ReentrancyGuard
✅ Pausable
✅ Dedicated asset revocation
✅ Direct ERC-721 transfer blocking
✅ Issuer controller validation
✅ Recipient controller validation
✅ Schema validation during issuance
✅ Paymaster call() instead of transfer()
✅ Large security test matrix
```

### Still needs work

```text
🔴 DID controller ↔ NFT ownership authorization consistency
🔴 `_didToTokens` stale mapping after transfer
🔴 Hardcoded private-key fallback in scripts
🟡 Proper issuer digital-signature verification
🟡 Actual DID public-key verification
🟡 Stronger true invariant testing
🟡 Coverage result/90% target verification
🟡 EIP-712
🟡 Proper ERC-4337 Smart Account
🟡 Proper ERC-4337 Paymaster
```

---

# 55. Recommended Immediate Order

Do the remaining work in this exact order:

```text
1. Fix DID/controller-based asset authorization
        ↓
2. Fix _didToTokens cleanup
        ↓
3. Remove hardcoded private keys
        ↓
4. Add/repair tests for these fixes
        ↓
5. Add true Foundry invariants
        ↓
6. Run complete test suite
        ↓
7. Run fuzzing
        ↓
8. Run forge coverage
        ↓
9. Run forge build --sizes
        ↓
10. Freeze Core 5
        ↓
11. Build Rust verification backend
        ↓
12. Build React frontend
        ↓
13. Implement EIP-712
        ↓
14. Implement proper ERC-4337
```

**Do not start with Account Abstraction. The Core 5 should become secure, internally consistent, and fully tested first.**

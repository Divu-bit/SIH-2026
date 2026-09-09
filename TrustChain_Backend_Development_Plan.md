# TrustChain / SIH26125 — Backend Development Plan

## 1. Objective

The smart contracts are deployed and the main Sepolia flow is working.
The next stage is to build the backend around the existing blockchain
system.

The backend should **not replace the smart contracts**. The blockchain
remains the authoritative source for critical identity, authorization,
schema, and asset state.

The backend will provide:

- REST APIs
- Wallet-based authentication
- DID resolution
- Blockchain interaction
- PostgreSQL indexing/cache
- Blockchain event indexing
- Metadata handling
- Audit/query APIs
- A clean interface for the React frontend

------------------------------------------------------------------------

## 2. Overall Architecture

``` text
                         ┌──────────────────────┐
                         │      React Frontend  │
                         │      Vite + TS       │
                         └──────────┬───────────┘
                                    │
                              HTTP / JSON
                                    │
                         ┌──────────▼───────────┐
                         │      Rust Backend    │
                         │        Axum          │
                         └───────┬───────┬──────┘
                                 │       │
                       ┌─────────┘       └─────────────┐
                       ▼                               ▼
                ┌──────────────┐               ┌────────────────┐
                │ PostgreSQL   │               │ Ethereum       │
                │              │               │ Sepolia        │
                │ Indexed data │               │ Smart Contracts│
                └──────────────┘               └───────┬────────┘
                                                       │
                    ┌──────────────────────────────────┼────────────────────┐
                    │                                  │                    │
                    ▼                                  ▼                    ▼
             IdentityRegistry                    AssetRegistry       SchemaRegistry
                    │                                  │                    │
                    └──────────────────┬───────────────┘                    │
                                       ▼                                    │
                                  AssetNFT ◄────────────────────────────────┘
```

------------------------------------------------------------------------

## 3. Source of Truth

This distinction is extremely important.

### Blockchain is authoritative for

- DID controller
- DID status
- Roles
- Schema status
- Asset ownership
- Asset issuer
- Asset status
- Credential hash
- Asset transfer state
- Important timestamps recorded on-chain
- Smart-contract authorization

### PostgreSQL is primarily for

- Fast querying
- Search
- Indexed blockchain events
- Application records
- Cached blockchain information
- Audit dashboards
- Transaction records

If PostgreSQL says `NFT owner = Neha` but the blockchain says
`NFT owner = Vikram`, **the blockchain wins**.

The database is an indexed representation, not the ultimate authority.

------------------------------------------------------------------------

## 4. Recommended Technology Stack

### Backend

``` text
Rust
```

### HTTP framework

``` text
Axum
```

Used for routes, HTTP requests, JSON responses, middleware, and
application state.

### Async runtime

``` text
Tokio
```

### Ethereum interaction

``` text
Alloy
```

Used for Sepolia RPC connections, contract reads, transactions, events,
and Ethereum types.

### Serialization

``` text
Serde
serde_json
```

### Database

``` text
PostgreSQL
```

### Database library

``` text
SQLx
```

### Configuration

``` text
dotenvy
```

### Logging

``` text
tracing
tracing-subscriber
```

------------------------------------------------------------------------

## 5. Do Not Overengineer the First Version

Do not start with:

- Microservices
- Kafka
- Redis
- Kubernetes
- GraphQL
- Multiple databases
- Complex authentication providers
- Distributed queues

For the SIH prototype, a single Rust backend is enough:

``` text
Rust + Axum + Alloy + PostgreSQL
```

Add complexity only when the application actually needs it.

------------------------------------------------------------------------

# 6. Development Phases

Build in this order:

``` text
Phase 1  → Rust backend skeleton
Phase 2  → Axum HTTP server
Phase 3  → Sepolia RPC connection
Phase 4  → Contract integration
Phase 5  → Blockchain read layer
Phase 6  → Wallet authentication
Phase 7  → PostgreSQL
Phase 8  → Blockchain event indexer
Phase 9  → REST APIs
Phase 10 → Authorization
Phase 11 → Metadata handling
Phase 12 → Frontend integration
Phase 13 → Auditor dashboard
Phase 14 → Production hardening
```

Do not implement everything simultaneously.

------------------------------------------------------------------------

# 7. Phase 1 — Create the Backend

Recommended project layout:

``` text
TrustChain/
├── frontend/
├── contracts/
└── backend/
```

Create it:

``` bash
cargo new backend
cd backend
```

Initially:

``` text
backend/
├── Cargo.toml
└── src/
    └── main.rs
```

Do not create the complete folder hierarchy yet.

------------------------------------------------------------------------

# 8. Phase 2 — Build the Axum Server

The first milestone is deliberately simple.

Expose:

``` text
GET /health
```

Return:

``` json
{
  "status": "ok"
}
```

This proves Rust, Cargo, Tokio, Axum, HTTP routing, and the server
startup all work before blockchain complexity is introduced.

------------------------------------------------------------------------

# 9. Phase 3 — Connect Rust to Sepolia

Next:

``` text
Rust Backend
     │
     ▼
Sepolia RPC
     │
     ▼
Deployed TrustChain contracts
```

Start with **read-only operations**.

Do not immediately allow the backend to submit blockchain transactions.

Read from:

``` text
RoleManager
IdentityRegistry
SchemaRegistry
AssetRegistry
AssetNFT
```

The backend should eventually be able to answer questions such as:

``` text
Who controls this DID?
What role does this address have?
Is this schema active?
What is the asset record?
Who owns this NFT?
Is this asset valid?
What is its token URI?
```

------------------------------------------------------------------------

# 10. Contract Addresses and ABIs

The backend must use the **actual deployed Sepolia contract addresses
and interfaces**.

Required contracts:

``` text
RoleManager
IdentityRegistry
SchemaRegistry
AssetRegistry
AssetNFT
```

Do not guess function signatures.

Use the exact current Solidity interfaces/ABIs from the deployed
contracts.

------------------------------------------------------------------------

# 11. Contract Integration Layer

Keep blockchain code separate from HTTP routes.

A useful eventual structure:

``` text
src/
├── main.rs
├── config.rs
├── error.rs
│
├── blockchain/
│   ├── mod.rs
│   ├── client.rs
│   ├── identity.rs
│   ├── roles.rs
│   ├── schemas.rs
│   ├── assets.rs
│   └── nft.rs
│
├── routes/
│   ├── mod.rs
│   ├── auth.rs
│   ├── identity.rs
│   ├── schemas.rs
│   ├── assets.rs
│   └── audit.rs
│
├── models/
│   ├── mod.rs
│   ├── identity.rs
│   ├── schema.rs
│   └── asset.rs
│
└── db/
    ├── mod.rs
    └── ...
```

Keep the route layer and blockchain layer separate:

``` text
HTTP request
     ↓
routes/assets.rs
     ↓
blockchain/assets.rs
     ↓
AssetRegistry
```

------------------------------------------------------------------------

# 12. Phase 4 — Blockchain Read Layer

Build read functions first.

Examples:

``` text
get_did()
get_did_controller()
is_valid_controller()
get_role()
get_schema()
is_schema_valid()
get_asset()
verify_asset()
get_nft_owner()
get_token_uri()
```

Conceptual flow:

``` text
GET /api/identity/:did
          │
          ▼
Identity route
          │
          ▼
Blockchain service
          │
          ▼
IdentityRegistry
          │
          ▼
JSON response
```

------------------------------------------------------------------------

# 13. Issuer DID Design

A current concern is that an issuer could manually enter the wrong DID.

Avoid requiring the issuer to enter their own DID manually.

Bad:

``` json
{
  "issuerDid": "did:trustchain:bel:issuer-001",
  "recipientDid": "did:trustchain:bel:employee-002"
}
```

Instead:

``` text
Connected wallet
       ↓
Authenticated address
       ↓
IdentityRegistry
       ↓
DID controlled by address
       ↓
Issuer DID
```

The API can therefore accept:

``` json
{
  "recipientDid": "did:trustchain:bel:employee-002",
  "schemaId": "EMPLOYEE_CERTIFICATE_V1",
  "assetType": "SECURITY_TRAINING_CERTIFICATE",
  "credentialHash": "0x..."
}
```

The backend resolves the issuer identity from the authenticated wallet.

The smart contract remains the final authorization boundary.

------------------------------------------------------------------------

# 14. Phase 5 — Wallet Authentication

Use a challenge/signature flow.

``` text
Frontend
   │
   │ request challenge
   ▼
Backend
   │
   │ random nonce/message
   ▼
Frontend
   │
   │ MetaMask signs
   ▼
Backend
   │
   │ verify signature
   ▼
Authenticated wallet
```

The backend should never request or store the user’s MetaMask private
key.

------------------------------------------------------------------------

# 15. Challenge Authentication Flow

### Step 1

Frontend requests:

``` text
POST /api/auth/challenge
```

Backend returns a server-generated nonce/message:

``` json
{
  "nonce": "random-server-generated-value",
  "message": "Sign this message to authenticate with TrustChain..."
}
```

### Step 2

MetaMask signs the message.

### Step 3

Frontend sends:

``` text
POST /api/auth/verify
```

with:

``` json
{
  "address": "0x...",
  "signature": "0x..."
}
```

### Step 4

Backend verifies the signature.

### Step 5

Backend resolves the wallet to its DID.

``` text
Wallet
  ↓
IdentityRegistry
  ↓
DID
```

A session/JWT can then be issued according to the final authentication
design.

------------------------------------------------------------------------

# 16. Never Trust Client-Supplied Identity

Do not accept security-critical identity information as trusted client
input:

``` json
{
  "wallet": "0xABC...",
  "issuerDid": "did:...",
  "role": "MANAGER"
}
```

The backend must determine these values.

Correct:

``` text
Authenticated wallet
        ↓
Blockchain
        ↓
Actual DID
        ↓
Actual role
        ↓
Authorization decision
```

The client tells the backend what it wants to do.

The backend determines whether the authenticated identity is allowed to
do it.

------------------------------------------------------------------------

# 17. Phase 6 — PostgreSQL

Introduce PostgreSQL after blockchain reads and authentication are
working.

Use it for:

- Fast searches
- Historical event queries
- Audit dashboards
- Application metadata
- Transaction tracking
- Indexed blockchain information

Potential tables:

``` text
users
identities
schemas
assets
blockchain_events
authentication_challenges
transactions
```

------------------------------------------------------------------------

# 18. Users Table

Conceptually:

``` text
users
-----
id
wallet_address
created_at
updated_at
```

Do not treat a cached database role as the ultimate authority if roles
are on-chain.

The blockchain role should remain authoritative.

------------------------------------------------------------------------

# 19. Identities Table

Possible fields:

``` text
identities
----------
id
did
controller_address
status
metadata_uri
created_at
updated_at
```

This is an indexed representation of `IdentityRegistry`.

When a controller changes:

``` text
Blockchain
     ↓
ControllerUpdated event
     ↓
Indexer
     ↓
PostgreSQL updated
```

------------------------------------------------------------------------

# 20. Schemas Table

Possible fields:

``` text
schemas
-------
schema_id
uri
schema_hash
active
registered_at
transaction_hash
```

The `active` value is cached blockchain state.

------------------------------------------------------------------------

# 21. Assets Table

Possible fields:

``` text
assets
------
token_id
asset_type
schema_id
credential_hash
owner_did
issuer_did
issuer_address
issued_at
expires_at
status
transferable
metadata_uri
transaction_hash
```

This mirrors the important `AssetRegistry` information.

------------------------------------------------------------------------

# 22. Blockchain Events Table

This is particularly useful for auditing.

Possible fields:

``` text
blockchain_events
-----------------
id
contract_address
event_name
block_number
transaction_hash
log_index
timestamp
event_data
```

Potential events include:

``` text
DIDRegistered
ControllerProposed
ControllerUpdated
SchemaRegistered
SchemaStatusChanged
AssetIssued
AssetTransferred
AssetRevoked
NFTOwnerSynced
```

Use the exact event names from the actual contracts.

------------------------------------------------------------------------

# 23. Phase 7 — Blockchain Event Indexer

The indexer reads blockchain events and updates PostgreSQL.

``` text
Sepolia
   │
   │ events
   ▼
Rust Indexer
   │
   ├── decode event
   ├── validate/decode data
   ├── store transaction hash
   └── update PostgreSQL
```

Example:

``` text
AssetIssued
     ↓
Indexer receives event
     ↓
Extract tokenId, issuerDID, ownerDID,
schemaId, transactionHash, blockNumber
     ↓
Update assets table
```

This makes audit/search APIs fast.

------------------------------------------------------------------------

# 24. Auditor Role

The Auditor is not useful merely because the blockchain is public.

Anyone can inspect public blockchain data.

The Auditor provides **organizational audit functionality**.

Auditor capabilities:

``` text
Read asset activity       ✅
Verify assets             ✅
Inspect issuance history  ✅
Inspect transfers         ✅
Inspect revocations       ✅
Review indexed events     ✅
Generate audit reports    ✅
```

Should not be able to:

``` text
Issue asset               ❌
Transfer asset             ❌
Register schema            ❌
Change roles               ❌
Modify system state        ❌
```

The backend makes the Auditor role practical by providing a clean audit
interface.

------------------------------------------------------------------------

# 25. Auditor APIs

Possible endpoints:

``` text
GET /api/audit/assets
GET /api/audit/issuances
GET /api/audit/transfers
GET /api/audit/revocations
GET /api/audit/events
GET /api/audit/issuer/:did
GET /api/audit/asset/:tokenId
```

These can query indexed data while optionally checking the blockchain
for authoritative verification.

------------------------------------------------------------------------

# 26. Phase 8 — REST API Design

Initial API structure:

``` text
/api
│
├── /auth
│   ├── POST /challenge
│   └── POST /verify
│
├── /identity
│   ├── GET  /me
│   ├── GET  /:did
│   └── POST /register
│
├── /schemas
│   ├── GET  /
│   ├── GET  /:schemaId
│   └── POST /
│
├── /assets
│   ├── GET  /:tokenId
│   ├── POST /issue
│   ├── POST /transfer
│   ├── POST /revoke
│   └── POST /verify
│
└── /audit
    ├── GET /assets
    ├── GET /issuances
    ├── GET /transfers
    └── GET /revocations
```

These are initial API concepts. Final endpoints should match the actual
Solidity functions and frontend needs.

------------------------------------------------------------------------

# 27. Read APIs vs Transaction APIs

## Read APIs

``` text
GET /api/identity/:did
GET /api/assets/:tokenId
GET /api/assets/:tokenId/verify
GET /api/schemas/:schemaId
```

They can use blockchain reads and/or indexed database data.

## Write APIs

``` text
POST /api/assets/issue
POST /api/assets/transfer
POST /api/assets/revoke
```

They require stronger authorization and transaction handling.

------------------------------------------------------------------------

# 28. Who Sends Blockchain Transactions?

For user-controlled actions, a good architecture is often:

``` text
Frontend
   ↓
MetaMask
   ↓
Blockchain
```

The backend can prepare data, authenticate the user, resolve identity,
and provide supporting APIs.

For genuinely server-controlled operations, the backend can use a
dedicated signer.

Never put a private key in source code.

If a backend signer is introduced, use environment variables for
development and proper secret management in production.

------------------------------------------------------------------------

# 29. Example Asset Issuance Flow

``` text
Manager opens frontend
        ↓
Connect MetaMask
        ↓
Authenticate wallet
        ↓
Backend verifies wallet
        ↓
Backend resolves Manager's DID
        ↓
Manager enters:
    recipient DID
    schema
    asset type
    credential hash
    metadata
        ↓
Backend validates request
        ↓
Blockchain transaction
        ↓
AssetRegistry.issueAsset(...)
        ↓
Sepolia confirms transaction
        ↓
AssetIssued event
        ↓
Indexer updates database
        ↓
Frontend displays asset
```

The contract remains the final security boundary.

------------------------------------------------------------------------

# 30. Metadata

Metadata should not be casually changed after issuance.

If the asset contains:

``` text
Asset
  ↓
metadata URI
  ↓
credential hash
```

and metadata is intended to be immutable, do not provide an unrestricted
endpoint such as:

``` text
PUT /assets/:id
```

that silently changes the asset.

A change should either:

- be explicitly supported by the smart-contract design, or
- create a new version/new asset.

The backend should preserve the immutability guarantees of the
blockchain layer.

------------------------------------------------------------------------

# 31. Sensitive Documents

Do not put large or sensitive documents directly on-chain.

Preferred model:

``` text
Document
   ↓
Encrypted/off-chain storage
   ↓
CID / URI
   ↓
Hash
   ↓
Blockchain
```

The blockchain stores proof/reference information.

The backend can control access to off-chain information where
appropriate.

------------------------------------------------------------------------

# 32. Public Verification

A public verifier can work without an internal account.

Example:

``` text
QR code
   ↓
Verification page
   ↓
GET /api/assets/verify/:tokenId
   ↓
Backend
   ↓
Blockchain
   ↓
verifyAsset()
   ↓
Result
```

Example response:

``` json
{
  "valid": true,
  "tokenId": 123,
  "status": "ACTIVE",
  "issuerDid": "did:trustchain:bel:issuer-001",
  "ownerDid": "did:trustchain:bel:employee-001"
}
```

Do not expose sensitive off-chain information through a public
verification endpoint.

------------------------------------------------------------------------

# 33. Error Handling

Create a common backend error type.

Conceptually:

``` text
AppError
├── BadRequest
├── Unauthorized
├── Forbidden
├── NotFound
├── BlockchainError
├── DatabaseError
└── Internal
```

Return consistent HTTP responses.

Example:

``` json
{
  "error": "asset_not_found",
  "message": "The requested asset does not exist."
}
```

Do not expose raw RPC errors, private keys, database credentials, or
internal implementation details.

------------------------------------------------------------------------

# 34. Configuration

Use environment variables.

Example:

``` text
SEPOLIA_RPC_URL=...
DATABASE_URL=...
CHAIN_ID=11155111
```

If a backend signer is eventually required:

``` text
BACKEND_PRIVATE_KEY=...
```

Never commit `.env`.

Add it to `.gitignore`.

------------------------------------------------------------------------

# 35. Security Rules

## Never

- Store private keys in Git
- Trust a client-supplied role
- Trust a client-supplied issuer DID
- Trust PostgreSQL over blockchain state
- Put private documents directly on-chain
- Allow arbitrary metadata modification
- Log private keys
- Return secrets in API responses

## Always

- Verify wallet signatures
- Resolve DID from the authenticated wallet
- Check authorization
- Validate request input
- Handle blockchain transaction failures
- Store transaction hashes
- Validate/decode blockchain events
- Use HTTPS in production
- Use environment variables/secrets management

------------------------------------------------------------------------

# 36. Backend Milestones

## Milestone 1 — Server

``` text
cargo project
      ↓
Axum
      ↓
GET /health
```

Success:

``` json
{
  "status": "ok"
}
```

## Milestone 2 — Sepolia

``` text
Axum
  ↓
Alloy
  ↓
Sepolia RPC
```

Success: backend connects to Sepolia.

## Milestone 3 — Contract reads

Read:

``` text
IdentityRegistry
RoleManager
SchemaRegistry
AssetRegistry
AssetNFT
```

Success: backend retrieves real data from the deployed contracts.

## Milestone 4 — Authentication

``` text
MetaMask
   ↓
Sign challenge
   ↓
Backend
   ↓
Signature verification
   ↓
Authenticated wallet
```

## Milestone 5 — DID resolution

``` text
Authenticated wallet
       ↓
IdentityRegistry
       ↓
DID
```

This solves the issuer-DID typo problem.

## Milestone 6 — PostgreSQL

``` text
Rust
 ↓
SQLx
 ↓
PostgreSQL
```

Create required tables.

## Milestone 7 — Event indexer

``` text
Sepolia events
      ↓
Rust
      ↓
PostgreSQL
```

## Milestone 8 — REST APIs

Build the application endpoints.

## Milestone 9 — Frontend

Connect React to the backend.

## Milestone 10 — Auditor

Build audit/search functionality on indexed blockchain events.

------------------------------------------------------------------------

# 37. Recommended Final Architecture

``` text
                         ┌─────────────────────┐
                         │     User Browser    │
                         │                     │
                         │ React + TypeScript  │
                         └──────────┬──────────┘
                                    │
                           HTTPS / REST / JSON
                                    │
                         ┌──────────▼──────────┐
                         │     Rust Backend    │
                         │        Axum         │
                         ├─────────────────────┤
                         │ Authentication      │
                         │ Authorization       │
                         │ DID Resolution      │
                         │ Asset Services      │
                         │ Schema Services     │
                         │ Audit Services      │
                         └───────┬───────┬─────┘
                                 │       │
                    ┌────────────┘       └─────────────┐
                    ▼                                  ▼
             ┌──────────────┐                  ┌────────────────┐
             │ PostgreSQL   │                  │ Sepolia        │
             │              │                  │ Blockchain     │
             │ Indexes      │                  │                │
             │ Audit data   │                  │ Identity       │
             │ App data     │                  │ RoleManager    │
             └──────────────┘                  │ SchemaRegistry │
                                               │ AssetRegistry  │
                                               │ AssetNFT       │
                                               └────────────────┘
```

------------------------------------------------------------------------

# 38. Immediate Implementation Plan

Do not implement the entire backend at once.

### Step 1

Create:

``` bash
cargo new backend
cd backend
```

### Step 2

Add:

``` text
Axum
Tokio
Serde
```

### Step 3

Implement:

``` text
GET /health
```

### Step 4

Run and test the server.

### Step 5

Add Alloy.

### Step 6

Configure the Sepolia RPC URL.

### Step 7

Connect to the actual deployed TrustChain contracts.

### Step 8

Perform a read-only `IdentityRegistry` call.

### Step 9

Add the remaining contract read services.

### Step 10

Implement wallet challenge/signature authentication.

### Step 11

Resolve the authenticated wallet to its DID.

### Step 12

Add PostgreSQL.

### Step 13

Build the blockchain event indexer.

### Step 14

Build REST APIs.

### Step 15

Integrate the React frontend.

### Step 16

Build Auditor functionality.

------------------------------------------------------------------------

# 39. Development Principle

Use:

``` text
Build → Test → Verify → Add next layer
```

rather than:

``` text
Write entire backend → hope everything connects
```

At every stage, test against the **actual deployed Sepolia contracts**.

The backend should make the blockchain system easier to use without
weakening the blockchain’s role as the authoritative security layer.

------------------------------------------------------------------------

# 40. Immediate Next Step

The first concrete task is:

``` bash
cargo new backend
cd backend
```

Then build the `/health` endpoint.

After `/health` works, connect the Rust backend to Sepolia using Alloy
and the **actual deployed TrustChain contract addresses and ABIs**.

This incremental approach will make the backend much easier to debug and
integrate with the frontend.

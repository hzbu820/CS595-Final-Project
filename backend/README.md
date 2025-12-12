# Backend API (Off-Chain Event Storage + Signature Verification)

The backend provides a secure off-chain service responsible for verifying signed supply-chain events, hashing and salting payloads, and persisting encrypted event envelopes. It prepares data for the FoodTraceability smart contract; dApps submit on-chain transactions from the user’s wallet (MetaMask), then report tx status back to the backend.

It acts as the bridge between the front-end clients (transporters, inspectors, retailers, regulators) and the on-chain traceability ledger.


## Folder Layout
```
backend/
├── src/
│   ├── server.ts            # Express app bootstrap, middleware, routes mount
│   ├── routes/
│   │   └── events.ts        # Event-related API endpoints
│   └── services/
│       ├── chain.ts         # On-chain helpers: setRole/getRole (optional create/append)
│       ├── storage.ts       # Firebase Storage read/write
│       ├── crypto.ts        # AES-256-GCM encryption utilities
│       ├── hash.ts          # Canonical JSON hashing + salt
│       ├── signature.ts     # EIP-712 signature recovery
│       └── types.ts         # Shared TS types
├── db/                      # Future SQLite/Prisma schema
├── artifacts/
│   └── FoodTraceability.json# Compiled contract ABI
├── storage/                 # Legacy local storage (unused with Firebase)
├── Dockerfile               # Backend Docker build
├── docker-compose.yml       # App + optional deps
├── tsconfig.json            # TypeScript config
├── package.json             # Dependencies + scripts
├── package-lock.json
├── .env                     # Environment variables
└── README.md                # Developer documentation
```


## Integration Contract
- Upload from UI → returns { cid, sha256, size }
- Verify JSON → returns { sha256, matches }
- Files saved under storage/<batchId>/<cid> enabling manual inspection during demos

Storage backend now targets **Firebase Storage** via `firebase-admin`. Required env:

- `FIREBASE_STORAGE_BUCKET` (e.g., `your-project.appspot.com`)
- Either `FIREBASE_SERVICE_ACCOUNT_BASE64` (base64 of service account JSON) or `FIREBASE_SERVICE_ACCOUNT_JSON`; falls back to `google-application-default` if neither is set.

Extend this service with authentication, S3/IPFS adapters, or database persistence as needed.

# Backend API (Events)

**Base URL:** `http://localhost:4000/api`

All endpoints use **JSON** (`Content-Type: application/json`).

The backend verifies EIP-712 signatures, adds a random 32-byte salt, computes  
`SHA256(canonicalJSON || salt)`, stores the envelope off-chain, and returns the salted hash + CID for the dApp to submit on-chain.

---

## Data Models

### `EventType`

"Create" | "Transport" | "Inspect"


### `EventPayload`
```json
{
  "batchId": "0x<32-byte-hex>",
  "eventType": "Transport",
  "data": { "...": "arbitrary event fields" }
}
```


Stored EventEnvelope (off-chain blob)
```json
{
  "payload": { "batchId": "0x...", "eventType": "Transport", "data": { ... } },
  "signer": "0x<address>",
  "signature": "0x<eip712-signature>",
  "salt": "0x<32-byte-hex>",
  "sha256": "0x<hash-of-canonical||salt>",
  "enc": {                       // present only if BACKEND_AES_KEY is set
    "alg": "AES-256-GCM",
    "iv": "0x<12-byte-hex>",
    "tag": "0x<16-byte-hex>"
  },
  "cid": "optional ipfs cid (if enabled)",
  "createdAt": 1731599999
}
```


Notes
* Canonical JSON uses stable key ordering for deterministic hashes.

* Salt is stored off-chain (never on-chain) to prevent small-domain brute-force.

* If BACKEND_AES_KEY is set, the stored file contains { envelope, ciphertext }; otherwise { envelope, canonical }.

* The dApp uses the returned salted hash when calling the smart contract.

### POST `/api/batches/create`

Create a new food batch and store the genesis envelope off-chain. The dApp then calls the smart contract from the user’s wallet with the returned `cid` and `saltedHash`, and finally reports status back to the backend.

This endpoint is typically used by **producers** to register a new batch. Internally it:

1. Verifies the EIP-712 signature of the caller.
2. Checks the caller’s role (must be Producer).
3. Computes a salted SHA-256 hash of the batch metadata.
4. Optionally encrypts the canonical JSON and stores it off-chain (Firebase Storage).
5. Records a Firestore `batches/{batchId}` doc with `status: "pending"` (awaiting on-chain tx from the client).

### Request

```json
{
  "batchId": "0x<32-byte-hex>",
  "meta": {
    "product": "Chilled beef",
    "origin": "US-NE-Plant-42",
    "productionDate": 1731542400,
    "extra": { "lot": "A-1024" }
  },
  "signature": "0x<eip712-signature>",
  "signer": "0x<address>"
}
```

Response 200 OK
```json
{
  "ok": true,
  "batchId": "0x<...>",
  "custodian": "0x<address>",
  "sha256": "0x<hash>",
  "saltedHash": "0x<hash>",
  "salt": "0x<32-byte-hex>",
  "cid": "uuid-or-ipfs-cid.json",
  "uri": "/api/events/0xBATCHID/uuid-or-ipfs-cid.json",
  "metadataUri": "/api/events/0xBATCHID/uuid-or-ipfs-cid.json",
  "status": "pending"
}
```

Client should then submit the on-chain `createBatch` tx using `cid` and `saltedHash`, and afterward call `POST /api/batches/:batchId/status` to mark `confirmed` or `failed`.


### POST `/api/events/upload`

Accepts a signed payload, verifies signature & role, hashes with salt, and persists the envelope. The dApp then calls the smart contract from the user’s wallet using the returned `cid` and `saltedHash`, and finally reports status back to the backend.

Request
```json
{
  "batchId": "0x<32-byte-hex>",
  "eventType": "Transport",
  "data": { "temperature": 8.7, "ts": 1731599999 },
  "signature": "0x<eip712-signature>",
  "signer": "0x<address>"
}
```

Response 200 OK
```json
{
  "ok": true,
  "batchId": "0x<...>",
  "sha256": "0x<hash>",
  "saltedHash": "0x<hash>",          // alias to match front-end
  "salt": "0x<32-byte-hex>",        // off-chain only; not stored on-chain
  "cid": "uuid-or-ipfs-cid.json",
  "uri": "/api/events/0xBATCHID/uuid-or-ipfs-cid.json",
  "metadataUri": "/api/events/0xBATCHID/uuid-or-ipfs-cid.json", // alias to match front-end
  "status": "pending"
}
```

Client should then submit the on-chain `appendEvent` tx using `cid` and `saltedHash`, and afterward call `POST /api/events/:cid/status` to mark `confirmed` or `failed`.

Errors

* 400 – missing fields (batchId, eventType, data, signature, signer)

* 401 – signature mismatch (recovered address ≠ signer)

* 403 – signer not registered / role not permitted

* 500 – storage or chain error


### POST `/api/events/verify`

Recomputes the salted hash from the stored envelope and compares it with the recorded hash.

Request
```json
{ "batchId": "0x<32-byte-hex>", "cid": "uuid-or-ipfs-cid.json" }
```

Response 200 OK
```json
{
  "ok": true,
  "match": true,
  "recomputed": "0x<hash>",
  "recorded": "0x<hash>"
}
```

### GET `/api/events/:batchId/:cid`

Returns the stored JSON blob for the event (either { envelope, canonical } or { envelope, ciphertext }).

Response 200 OK


### POST `/api/events/:cid/status`

Mark an uploaded event as `confirmed` or `failed` after the on-chain tx settles.

Request
```json
{ "status": "confirmed", "txHash": "0x<transaction-hash>" }
```

Response 200 OK
```json
{ "ok": true, "status": "confirmed", "txHash": "0x<transaction-hash>" }
```


### POST `/api/batches/:batchId/status`

Mark a created batch as `confirmed` or `failed` after the on-chain tx settles.

Request
```json
{ "status": "confirmed", "txHash": "0x<transaction-hash>" }
```

Response 200 OK
```json
{ "ok": true, "status": "confirmed", "txHash": "0x<transaction-hash>" }
```


### POST `/api/participants/register`

Registers a new participant on-chain with a specific role.

This API is typically used by the admin UI.
End users (drivers, warehouse staff) do not call this directly.

Request
```json
{
  "address": "0x<ethereum-address>",
  "role": 1  // 1=Producer, 2=Transporter, 3=Retailer, 4=Regulator
}
```

Response 200 OK
```json
{
  "ok": true,
  "txHash": "0x<transaction-hash>",
  "address": "0x1234...",
  "role": "Transporter"
}
```

The backend’s signer must be the admin (ORACLE_PK private key).

After registration, the participant can start calling /api/events/upload.


### POST `/api/auth/register-email`

Simple email/password registration backed by Firestore. This is used for frontend UX accounts; authorization for events remains wallet + on-chain role based.

Request
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

Response 200 OK
```json
{
  "ok": true,
  "email": "user@example.com"
}
```

Errors

* 400 – missing/invalid email or password (min length 6)
* 409 – email already registered


### POST `/api/auth/login-email`

Verify email/password against stored hash and return a lightweight profile. The frontend can cache this in localStorage; the backend still performs critical checks using wallet signatures and on-chain roles.

Request
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

Response 200 OK
```json
{
  "ok": true,
  "email": "user@example.com",
  "wallet": "0xabc...123",    // may be null if not linked
  "role": "Viewer"
}
```

Errors

* 400 – missing/invalid email/password
* 401 – invalid credentials


### POST `/api/auth/link-email`

Bind an email address to a specific wallet address using a simple EIP-191 signature. This is used to attach contact/profile data to an on-chain participant; authorization for events is still based on the wallet address and its on-chain role.

Request
```json
{
  "address": "0x<wallet-address>",
  "email": "user@example.com",
  "signature": "0x<signature-of-message>"
}
```

The signature MUST be produced by signing the UTF-8 string:

```text
Link email <email> to <address-lowered> for FoodTrace
```

For example, if:

- `address = 0xAbCd...1234`
- `email = user@example.com`

Then the message to sign (using `signMessage`) is:

```text
Link email user@example.com to 0xabcd...1234 for FoodTrace
```

Response 200 OK
```json
{
  "ok": true,
  "address": "0xabcd...1234",
  "email": "user@example.com"
}
```

Backend stores this mapping in Firestore under `users/{address}` with `email` and `wallet` fields. Frontend can use this to display profile info; event authorization remains wallet + on-chain role based.

### GET `/api/participants/:address/role`

Returns the registered role of a given participant.

Response
```json
{
  "address": "0x1234...",
  "roleId": 2,
  "role": "Transporter"
}
```


### Security & Verification Flow

- Backend verifies EIP-712 signature, role (Producer/Transporter/Retailer/Regulator), and computes salted hash: `sha256 = SHA256(canonicalJSON || salt)`.
- Optional encryption: If BACKEND_AES_KEY is set, canonical JSON is encrypted with AES-256-GCM.
- Backend stores the envelope off-chain (Firebase Storage) and writes Firestore metadata with `status: pending`.
- DApp submits the smart-contract tx from the user’s wallet using `cid` + `saltedHash`.
- DApp calls `/api/events/:cid/status` or `/api/batches/:batchId/status` to mark `confirmed` or `failed`.
- Audit: Anyone can fetch `/api/events/:batchId/:cid`, recompute hash, and confirm equality.

### Environment Variables
PORT=4000
FRONTEND_ORIGIN=http://localhost:5173

# Blockchain connection
RPC_URL=https://sepolia.infura.io/v3/...
ORACLE_PK=0x<private-key>
CONTRACT_ADDRESS=0x<FoodTraceability.sol deployed address>

# Firebase (Storage + Firestore)
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
FIREBASE_SERVICE_ACCOUNT_BASE64=<base64-of-service-account-json>  # or FIREBASE_SERVICE_ACCOUNT_JSON

# Optional encryption key (32 bytes hex → 64 chars)
BACKEND_AES_KEY=9f1d...

# Legacy/local storage (if not using Firebase)
STORAGE_DIR=storage

📋 Status Codes
Code	Meaning
200	Success
400	Bad request
401	Signature mismatch
403	Unauthorized role
404	File not found
500	Internal error


## Smart Contract ↔ Backend Interface

The backend prepares salted hashes and metadata for the **FoodTraceability** smart contract; the dApp submits transactions from the user’s wallet (e.g., MetaMask) on Ethereum/Sepolia.

### Contract → Backend API Expectations

When the contract is deployed and compiled (e.g. via Hardhat), export the artifact file: 
artifacts/contracts/FoodTraceability.sol/FoodTraceability.json 

and copy it into: 

backend/artifacts/FoodTraceability.json


This JSON must contain the **ABI** definition. The backend does **not** need
bytecode — only the ABI section is used.

---

### Backend → Contract API Calls

The backend uses `ethers.js` to call the following contract functions:

| Function | Solidity Signature | Purpose |
|----------|--------------------|---------|
| `registerParticipant(address user, uint8 role)` | `nonpayable` | Admin-only. Registers a participant and assigns a role (Manufacturer, Transporter, Warehouse, Inspector, Retailer). Called by backend endpoint `/api/participants/register`. |
| `participants(address addr)` | `view returns (bool enabled, uint8 role)` | Returns whether an address is registered and what role it holds. Backend uses this to validate `signer` during `/api/events/upload`. |
| `appendEvent(bytes32 batchId, uint8 eventType, bytes32 eventHash)` | `nonpayable` | Records a salted event hash for a batch. Backend calls this immediately after persisting the event envelope off-chain. Role checks are enforced by the contract. |
| `batchEvents(bytes32 batchId, uint256 index)` | `view returns (bytes32 eventHash)` | Reads an event hash by index. Backend uses this during `/api/events/verify` to confirm correctness of a recomputed salted hash. |
| (todo) `disableParticipant(address user)` | `nonpayable` | Admin-only. Marks a participant as inactive. The backend does not call this in MVP but the field is read via `participants()`. |

---

### Backend Contract Configuration

Set these environment variables in `.env` (or `docker-compose.yml → environment:`):

RPC_URL=https://sepolia.infura.io/v3/
<YOUR_KEY>
ORACLE_PK=0x<private-key> # backend's signing wallet

## Architecture FAQ

### On-Chain vs. Off-Chain
**On-Chain (Blockchain)**: Stores authoritative state including Batch ID, Creator, Custodian, Role Assignments, and Salted Hashes of events.
**Off-Chain (Backend/Firestore)**: Stores the full, rich JSON event envelopes (including the salt). The backend verifies signatures and computes hashes but does not act as the ledger.

### Purpose of Blockchain
The blockchain serves as the immutable "Rule Book" and "Proof Anchor". It ensures that history cannot be tampered with (as hashes wouldn't match) and provides a shared source of truth independent of the backend operator.

### Identity & Governance
In our prototype, we do not solve the real‑world identity problem algorithmically. Instead, we rely on a **Root of Trust** model: the smart contract enforces that only the **Admin** can assign roles (Producer, Transporter, Inspector, Regulator).

We assume the Admin follows an off-chain due diligence process to vet these entities before granting them privileges on-chain. In a production environment, we would replace this manual governance by connecting to: **Decentralized Identity (DID) providers, Verifiable Credentials (VCs), or existing GS1/GLN supply chain registries**.

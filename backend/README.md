# Backend API (Off-Chain Event Storage + Signature Verification)

The backend provides a secure off-chain service responsible for verifying signed supply-chain events, hashing and salting payloads, persisting encrypted event envelopes, and committing event hashes to the FoodTraceability smart contract.

It acts as the bridge between the front-end clients (transporters, inspectors, warehouses, retailers) and the on-chain traceability ledger.


## Folder Layout
backend/
│
├── src/
│   ├── server.ts                 # Express app bootstrap, middleware setup, route mounting
│   │
│   ├── routes/
│   │   └── events.ts             # All event-related API endpoints (create, upload, verify, fetch)
│   │
│   ├── services/
│   │   ├── chain.ts              # On-chain interaction (ethers): commitEvent(), getRoleOf(), getHash()
│   │   ├── storage.ts            # File persistence: save/load JSON envelopes from disk
│   │   ├── crypto.ts             # AES-256-GCM encryption utilities for event payloads
│   │   ├── hash.ts               # Canonical JSON hashing + salt handling
│   │   ├── signature.ts          # EIP-712 signature recovery and verification
│   │   └── types.ts              # Shared TS types: EventEnvelope, EventPayload, EventType, etc.
│   │
│   └── db/                       # Future SQLite/Prisma schema files
│
├── artifacts/
│   └── FoodTraceability.json     # Compiled contract ABI (required by chain.ts)
│
├── storage/                      # (legacy) local storage when using fs; Firebase Storage used now
│
├── Dockerfile                    # Backend Docker build
├── docker-compose.yml            # App + dependencies (e.g. IPFS/DB/future services)
│
├── tsconfig.json                 # TypeScript compiler configuration
├── package.json                  # Dependencies + scripts
├── package-lock.json
│
├── .env                          # Environment variables (RPC_URL, ORACLE_PK, CONTRACT_ADDRESS...)
│
└── README.md                     # Developer documentation


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
`SHA256(canonicalJSON || salt)`, stores the envelope off-chain, and commits the hash on-chain.

---

## Data Models

### `EventType`

"Create" | "Transport" | "Inspect"


### `EventPayload`
```json
{
  "batchId": "0x<32-byte-hex>",
  "eventType": "Storage",
  "data": { "...": "arbitrary event fields" }
}
```


Stored EventEnvelope (off-chain blob)
```json
{
  "payload": { "batchId": "0x...", "eventType": "Storage", "data": { ... } },
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

* On-chain commit includes only batchId, eventType, and sha256.

### POST `/api/batches/create`

Create a new food batch and record the first `Create` event on-chain.

This endpoint is typically used by **producers** (and optionally inspectors) to
register a new batch in the system. Internally it:

1. Verifies the EIP-712 signature of the caller.
2. Checks the caller’s role (must be allowed to create batches).
3. Computes a salted SHA-256 hash of the batch metadata.
4. Optionally encrypts the canonical JSON and stores it off-chain.
5. Commits the hash as a `Create` event for this `batchId` on the smart contract.

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


### POST `/api/events/upload`

Accepts a signed payload, verifies signature & role, hashes with salt, persists the envelope, and commits the hash on-chain.

Request
```json
{
  "batchId": "0x<32-byte-hex>",
  "eventType": "Storage",
  "data": { "temperature": 8.7, "ts": 1731599999 },
  "signature": "0x<eip712-signature>",
  "signer": "0x<address>"
}
```

Response 200 OK
```json
{
  "ok": true,
  "txHash": "0x<transaction-hash>",
  "batchId": "0x<...>",
  "sha256": "0x<hash>",
  "saltedHash": "0x<hash>",          // alias to match front-end
  "salt": "0x<32-byte-hex>",        // off-chain only; not stored on-chain
  "cid": "uuid-or-ipfs-cid.json",
  "uri": "/api/events/0xBATCHID/uuid-or-ipfs-cid.json",
  "metadataUri": "/api/events/0xBATCHID/uuid-or-ipfs-cid.json" // alias to match front-end
}
```

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


### POST `/api/participants/register`

Registers a new participant on-chain with a specific role
(e.g., Manufacturer, Transporter, Warehouse, Inspector, Retailer).

This API is typically used by the admin UI.
End users (drivers, warehouse staff) do not call this directly.

Request
```json
{
  "address": "0x<ethereum-address>",
  "role": "Manufacturer"  // or Transporter | Warehouse | Inspector | Retailer
}
```

Roles (string → uint8 mapping in Solidity)
```json
{
  "Manufacturer": 0,
  "Transporter": 1,
  "Warehouse": 2,
  "Inspector": 3,
  "Retailer": 4
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

### GET `/api/participants/:address/role`

Returns the registered role of a given participant.

Response
```json
{
  "address": "0x1234...",
  "roleId": 2,
  "role": "Warehouse"
}
```


### Security & Verification Flow

Signature check: Backend verifies EIP-712 signature using the on-chain Role Registry.

Salted hash: sha256 = SHA256(canonicalJSON || salt); salt stored only off-chain.

Optional encryption: If BACKEND_AES_KEY is set, canonical JSON encrypted with AES-256-GCM.

On-chain commit: Backend calls appendEvent(batchId, eventType, sha256).

Audit: Anyone can fetch /api/events/:batchId/:cid, recompute hash, and confirm equality.

### Environment Variables
PORT=4000
FRONTEND_ORIGIN=http://localhost:5173

# Blockchain connection
RPC_URL=https://sepolia.infura.io/v3/...
ORACLE_PK=0x<private-key>
CONTRACT_ADDRESS=0x<FoodTraceability.sol deployed address>

# Local storage
STORAGE_DIR=storage

# Optional encryption key (32 bytes hex → 64 chars)
BACKEND_AES_KEY=9f1d...

# Optional IPFS
IPFS_API_URL=http://127.0.0.1:5001

📋 Status Codes
Code	Meaning
200	Success
400	Bad request
401	Signature mismatch
403	Unauthorized role
404	File not found
500	Internal error


## Smart Contract ↔ Backend Interface

The backend communicates with the **FoodTraceability** smart contract to record
verifiable supply-chain events on Ethereum (or a compatible testnet such as
Sepolia).

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
CONTRACT_ADDRESS=0x<deployed-contract> # FoodTraceability.sol deployed address

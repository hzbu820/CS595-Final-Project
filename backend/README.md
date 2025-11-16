# Backend API (Off-Chain Storage)

This package exposes the /upload and /verify endpoints required by the front-end flows. It stores JSON event payloads on disk (or any pluggable storage provider) and returns deterministic hashes and pseudo-CIDs.


## Folder Layout
- src/server.ts – Express bootstrap and dependency wiring
- src/routes – Route definitions (events.ts)
- src/services/storageService.ts – File persistence + hash helpers
- storage/ – Local folder containing uploaded JSON files (gitignored)

## Integration Contract
- Upload from UI → returns { cid, sha256, size }
- Verify JSON → returns { sha256, matches }
- Files saved under storage/<batchId>/<cid> enabling manual inspection during demos

Extend this service with authentication, S3/IPFS adapters, or database persistence as needed.

# Backend API (Events)

**Base URL:** `http://localhost:4000/api`

All endpoints use **JSON** (`Content-Type: application/json`).

The backend verifies EIP-712 signatures, adds a random 32-byte salt, computes  
`SHA256(canonicalJSON || salt)`, stores the envelope off-chain, and commits the hash on-chain.

---

## Data Models

### `EventType`

"Create" | "ShipOut" | "ShipIn" | "Storage" | "Inspect" | "Sell" | "Recall"


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

### POST /api/events/upload

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
  "salt": "0x<32-byte-hex>",        // off-chain only; not stored on-chain
  "cid": "uuid-or-ipfs-cid.json",
  "uri": "/api/events/0xBATCHID/uuid-or-ipfs-cid.json"
}
```

Errors

* 400 – missing fields (batchId, eventType, data, signature, signer)

* 401 – signature mismatch (recovered address ≠ signer)

* 403 – signer not registered / role not permitted

* 500 – storage or chain error


### POST /api/events/verify

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

### GET /api/events/:batchId/:cid

Returns the stored JSON blob for the event (either { envelope, canonical } or { envelope, ciphertext }).

Response 200 OK


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
|-----------|--------------------|----------|
| `appendEvent(bytes32 batchId, uint8 eventType, bytes32 eventHash)` | `nonpayable` | Records an event hash for a given batch ID. Called by the backend when a new event is uploaded. |
| `batchEvents(bytes32 batchId, uint256 index)` | `view` | Reads an event hash by index for verification. |
| `participants(address addr)` | `view` | Checks participant registration and role. Used by backend for signature/authorization verification. |

---

### Backend Contract Configuration

Set these environment variables in `.env` (or `docker-compose.yml → environment:`):

RPC_URL=https://sepolia.infura.io/v3/
<YOUR_KEY>
ORACLE_PK=0x<private-key> # backend's signing wallet
CONTRACT_ADDRESS=0x<deployed-contract> # FoodTraceability.sol deployed address




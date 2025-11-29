# Front-End (React + Vite)

Role-aware dashboard for the FoodTraceability contract + Express backend. MetaMask drives on-chain calls; the backend salts/hashes JSON payloads and tracks pending/confirmed status.

## Prereqs
- Node.js 20+
- MetaMask on Sepolia (or point to a local chain)
- Backend running: `cd ../backend && npm install && npm run dev`

## Setup
```bash
cd frontend
cp .env.example .env   # fill values below
npm install
npm run dev
```

## Environment variables
```
VITE_BACKEND_URL=http://localhost:4000/api   # your backend base URL
VITE_CONTRACT_ADDRESS=0x4382a00d63e5ddf23652a70d4bab49279ee2a206   # Sepolia deployment from Etherscan
VITE_CHAIN_ID=11155111                        # Sepolia

# Optional Firebase (legacy; not required with wallet-first auth). Leave blank to use local fallback.
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

## Auth & roles
- Wallet connection is required for on-chain actions. On-chain role (from `roles(address)`) is authoritative.
- Login/Profile tab stores an email locally or links it to the backend via wallet signature; it does not grant permissions.
- Tabs are gated by on-chain role; email does not affect access.

## Screens
- **Login / Profile** — Set a local email profile and connect wallet; on-chain role enforced by the contract.
- **Create Batch (Producer)** — EIP-712 sign payload → POST `/batches/create` (salted hash) → MetaMask `createBatch` → POST `/batches/:batchId/status`.
- **Append Event (Producer/Transporter/Regulator)** — EIP-712 sign payload → POST `/events/upload` → MetaMask `appendEvent` → POST `/events/:cid/status`.
- **Transfer Custody** — Calls `transferCustody`.
- **Recall (Regulator)** — Calls `setRecall`.
- **Inspector (Regulator)** — Load batch, auto-flag anomalies (temperature threshold) from stored events, and trigger recall with a reason.
- **Verify Hashes** — Ask backend to recompute salted hash by batchId + CID; optional local SHA-256 of a JSON file.
- **Viewer** — `getBatchSummary` + timeline; fetch stored JSON/envelope; shows recompute status.
- **QR Connect** — Generate/scan QR payloads (batchId/CID/saltedHash) for mobile handoff.

## Scripts
- `npm run dev` — start Vite dev server
- `npm run build` — type-check + production build
- `npm run preview` — serve built assets

## Refreshing the ABI
```bash
cd ../smart-contracts
npx hardhat compile
# copy artifacts/contracts/FoodTraceability.sol/FoodTrace.json -> frontend/src/abi/FoodTrace.json (abi array only)
```
`src/abi/foodTrace.ts` re-exports `FoodTrace.json`, so copying keeps the UI synced.

## Notes based on teammate feedback
- On-chain role display comes from the Sepolia contract; connect MetaMask to fetch it.
- Email/profile is local-only; permissions are enforced by contract roles/admin backend flows.
- Firebase is optional/legacy; wallet-first auth is recommended.

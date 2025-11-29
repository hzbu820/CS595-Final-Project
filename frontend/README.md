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
VITE_CONTRACT_ADDRESS=0x4382a00d63e5ddf23652a70dbab49279ee2a206   # Sepolia deployment from Etherscan
VITE_CHAIN_ID=11155111                        # Sepolia

# Optional Firebase (for shared login/role storage). Leave blank to use local fallback.
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

## Auth & roles
- UI role is selectable in the Login tab (local fallback if Firebase is not configured). The "Load Demo User" button uses `demo@trace.local / password123` and sets the UI role to Transporter.
- On-chain role is fetched from the contract (`roles(address)`), shown in the Wallet panel. This is authoritative for what the contract enforces.
- Current limitation: changing the UI role is unrestricted; to enforce role changes, back it with Firebase or the backend/contract admin flow.

## Screens
- **Login / Profile** — UI role selection, demo user loader, optional Firebase sign-in.
- **Create Batch (Producer)** — EIP-712 sign payload → POST `/batches/create` (salted hash) → MetaMask `createBatch` → POST `/batches/:batchId/status`.
- **Append Event (Producer/Transporter/Regulator)** — EIP-712 sign payload → POST `/events/upload` → MetaMask `appendEvent` → POST `/events/:cid/status`.
- **Transfer Custody** — Calls `transferCustody`.
- **Recall (Regulator)** — Calls `setRecall`.
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
# copy artifacts/contracts/FoodTraceability.sol/FoodTraceability.json -> frontend/src/abi/FoodTrace.json (abi array only)
```
`src/abi/foodTrace.ts` re-exports `FoodTrace.json`, so copying keeps the UI synced.

## Notes based on teammate feedback
- On-chain role display comes from the Sepolia contract; connect MetaMask to fetch it.
- Firebase visibility depends on supplying Firebase keys in `.env`; without them, auth uses local storage only (nothing will appear in Firebase).
- UI role switching is intentionally lenient for demos; real enforcement should happen via contract roles + backend admin flows.

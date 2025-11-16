# Front-End (React + Vite)

Everything runs locally—I built this UI so we can drive the FoodTraceability contract and the Express storage API entirely from my laptop.

## What I still need from the team
- **Deployed contract details**: final Sepolia address + compiled ABI JSON (copy into `src/abi/FoodTrace.json`, update `.env`).
- **Role test accounts**: wallets for Producer / Transporter / Retailer / Regulator to verify role-gated tabs.
- **Backend URL confirmation**: keep `http://localhost:4000/api` or point to another host.
- **Sample JSON payloads**: production, transport, inspection files for the live demo.

## Local prerequisites
- Node.js 20+
- MetaMask (Sepolia enabled, or point it to a local Hardhat node for offline demos)
- Backend API running (`cd ../backend && npm install && npm run dev`)

## How to check and verify
```bash
cd frontend
cp .env.example .env   # fill in VITE_CONTRACT_ADDRESS / VITE_BACKEND_URL, copy in Windows(first time only)
npm install

#If you have node.js in your path, you can start from here.
npm run dev            # launches http://localhost:5173
# in the dev console, press `o` + Enter to open the browser automatically
```
Other scripts:
- `npm run build` – type-check + production build
- `npm run preview` – serve the built assets after `npm run build`

### Refreshing the ABI from Hardhat
```bash
cd ../smart-contracts
npm install            # first time only
npx hardhat compile
# copy artifacts/contracts/FoodTraceability.sol/FoodTraceability.json -> frontend/src/abi/FoodTrace.json (abi array only)
```
`src/abi/foodTrace.ts` already re-exports `FoodTrace.json`, so recompiling the Solidity contract + copying the ABI keeps the UI in sync.

### Required environment variables
```
VITE_CHAIN_ID=11155111
VITE_CONTRACT_ADDRESS=0xYourSepoliaContract
VITE_BACKEND_URL=http://localhost:4000/api
```

## Screens in this demo
- **Create Batch** – Upload genesis JSON → backend stores the file, generates a 32-byte salt, and returns both the raw SHA-256 and the salted hash. The UI passes the salted hash to `createBatch`.
- **Append Event** – Custodian uploads logistics/inspection JSON and commits the salted hash via `appendEvent`. The callout shows `{ cid, sha256, saltedHash, salt }` so we can verify later.
- **Transfer Custody** – Move the batch to the next authorized address via `transferCustody`.
- **Recall** – Regulator sets recall status + reason (`setRecall`).
- **Verify File** – Re-upload JSON, supply its salt, and confirm the salted hash matches `getEvent` (raw hash comparison optional).
- **Viewer** – Fetches `getBatchSummary`, shows the timeline + recall flag, and lets you download both the JSON and its metadata (`sha256`, `saltedHash`, `salt`) so the Verify tab can recompute the same values.

Every upload reflects the salted hashing workflow, answering the professor’s questions about pre-image hiding and verification. Each transaction still surfaces Sepolia links.

## Integration notes
- ABI comes directly from the Hardhat artifact (`frontend/src/abi/FoodTrace.json`).
- Backend helpers are in `src/lib/api.ts`; hashing helpers sit in `src/lib/hash.ts`.
- Wallet context lives in `src/context/walletContext.tsx`; styling/layout lives in `src/App.css` + `src/components/layout/*`.

## Next polish items on my list
1. Wire up the QR scanner + generator for Batch IDs (libs already installed).
2. Add proper toast notifications and disable role-inappropriate tabs automatically.
3. Bundle a few sample JSON files + a scripted flow so the presentation is smooth even if MetaMask hiccups.

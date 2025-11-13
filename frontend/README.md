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
cp .env.example .env   # fill in VITE_CONTRACT_ADDRESS / VITE_BACKEND_URL
npm install
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
- **Create Batch** – Upload genesis JSON, store via `/events/upload`, then call `createBatch`.
- **Append Event** – Custodian uploads logistics/inspection JSON and calls `appendEvent`.
- **Transfer Custody** – Move the batch to the next authorized address via `transferCustody`.
- **Recall** – Regulator sets recall status + reason (`setRecall`).
- **Verify File** – Re-upload any JSON and verify its SHA-256 hash against `getEvent`.
- **Viewer** – Fetch `getBatchSummary`, show the timeline + recall flag, and download stored JSON via CID.

Each action shows the backend CID/hash response and links to the Sepolia transaction for transparency.

## Integration notes
- ABI comes directly from the Hardhat artifact (`frontend/src/abi/FoodTrace.json`).
- Backend helpers are in `src/lib/api.ts`; hashing helpers sit in `src/lib/hash.ts`.
- Wallet context lives in `src/context/walletContext.tsx`; styling/layout lives in `src/App.css` + `src/components/layout/*`.

## Next polish items on my list
1. Wire up the QR scanner + generator for Batch IDs (libs already installed).
2. Add proper toast notifications and disable role-inappropriate tabs automatically.
3. Bundle a few sample JSON files + a scripted flow so the presentation is smooth even if MetaMask hiccups.

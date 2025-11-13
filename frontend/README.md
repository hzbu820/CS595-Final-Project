# Front-End (React + Vite)

Everything runs locally

## What I still need from the team
- **Deployed contract artifacts**: final Sepolia address + compiled ABI JSON (drop into `src/abi/FoodTrace.json`, update `.env`).
- **Role test accounts**: wallets for Producer / Transporter / Retailer / Regulator so I can verify the role gating.
- **Backend URL confirmation**: sticking with `http://localhost:4000/api` or moving it elsewhere.
- **Sample JSON payloads**: production, transport, inspection files we can upload during the presentation.

## Local prerequisites
- Node.js 20+
- MetaMask (Sepolia enabled, or point to a local Hardhat node if we want everything offline)
- Backend API (`../backend`) running via `npm run dev`

## How to check and verify
```bash
cd frontend
cp .env.example .env   # fill in VITE_CONTRACT_ADDRESS / VITE_BACKEND_URL
npm install
npm run dev            # http://localhost:5173
press o + enter        # To open in browser
```
Other scripts:
- `npm run build` – type-check + production build
- `npm run preview` – serve the built assets after `npm run build`

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
- Smart-contract glue lives in `src/abi/foodTrace.ts` and the wallet context (`src/context/walletContext.tsx`).
- Backend helpers are in `src/lib/api.ts`; hashing helpers sit in `src/lib/hash.ts`.
- Styling/layout lives in `src/App.css` and `src/components/layout/*`.

## Next polish items on my list
1. Wire up the QR scanner + generator for Batch IDs (libs already installed).
2. Add proper toast notifications and disable role-inappropriate tabs automatically.
3. Bundle a few sample JSON files + a scripted flow so the presentation is smooth even if MetaMask hiccups.

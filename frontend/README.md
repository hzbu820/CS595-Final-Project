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

## User Manual: Role-Based Workflows

### 1. Admin (Contract Owner)
*   **Goal:** Manage the workforce. You decide who is allowed to participate.
*   **Flow:**
    1.  Login with **Owner Wallet**.
    2.  Go to **Admin** tab.
    3.  Enter a wallet address.
    4.  Select a Role (Producer, Transporter, Retailer, Regulator).
    5.  Click **Grant Role**.
    *   *Result:* That wallet can now perform actions for that role.

### 2. Producer (e.g., Farmer)
*   **Goal:** Start the supply chain by creating a new batch of food.
*   **Flow:**
    1.  Login with **Producer Wallet**.
    2.  Go to **Create Batch** tab.
    3.  Enter details (Product Name, Origin, Temperature).
    4.  Click **Create Batch**.
    *   *Result:* A new Batch ID is minted on the blockchain. You are the current custodian.
    5.  **Handover:** When the truck arrives, go to **Transfer Custody**, enter Batch ID and the **Transporter's address**, and click **Transfer**.

### 3. Transporter (e.g., Truck Driver)
*   **Goal:** Move the goods and record conditions (temperature, location).
*   **Flow:**
    1.  Login with **Transporter Wallet**.
    2.  Receive custody (Producer must transfer it to you first).
    3.  Go to **Append Event** tab.
    4.  Enter Batch ID. Select Event Type: **Transport**.
    5.  Enter data (e.g., "Arrived at Distribution Center", Temp: 4°C).
    6.  Click **Submit Event**.
    *   *Result:* A permanent record of the journey is added.
    7.  **Handover:** When delivering to the store, go to **Transfer Custody** and send it to the **Retailer**.

### 4. Retailer (e.g., Supermarket)
*   **Goal:** Receive goods, stock shelves, and sell to consumers.
*   **Flow:**
    1.  Login with **Retailer Wallet**.
    2.  Receive custody (from Transporter).
    3.  (Optional) **Append Event**: "Stocked on Shelf".
    4.  **Sell:** When a customer buys it, you can (optionally) mark the batch as **Sold** (if you implemented `markBatchSold`, otherwise just leave it).

### 5. Regulator (e.g., Food Safety Inspector)
*   **Goal:** Audit the supply chain and protect the public.
*   **Flow:**
    1.  Login with **Regulator Wallet**.
    2.  Go to **Inspector** tab (or Viewer).
    3.  Check a Batch ID. Look for red flags (e.g., Temperature > 10°C).
    4.  **Emergency:** If unsafe, go to **Recall** tab.
    5.  Enter Batch ID and Reason ("E. coli detected"). Click **Recall**.
    *   *Result:* The batch is flagged as **RECALLED** globally. The Viewer will show a big warning.

### 6. Consumer (Public)
*   **Goal:** Verify their food is safe and authentic.
*   **Flow:**
    1.  No login required.
    2.  Go to **Viewer** tab (or scan a QR code).
    3.  Enter Batch ID.
    4.  **View History:** See the entire timeline: Farm -> Truck -> Store.
    5.  **Check Safety:** Verify it is **NOT** recalled.

# Blockchain-Based Food Traceability System (Frontend)

A React + Vite application for tracking food batches from "Farm to Fork" using Ethereum smart contracts. This frontend interacts with the `FoodTraceability` smart contract and a backend API to ensure data integrity, transparency, and role-based access control.

## Key Features
*   **Role-Based Access:** Distinct interfaces for Producers, Transporters, Retailers, Regulators, and Consumers.
*   **Data Integrity:** Uses EIP-712 signatures and SHA-256 hashing (with salt) to secure off-chain data.
*   **Privacy:** Sensitive data (like exact location) is stored off-chain; only the hash is on-chain.
*   **QR Code Integration:** Generate and scan QR codes for easy batch tracking.
*   **Automated System Test:** Built-in "System Test" tab to simulate a full supply chain lifecycle in one click.
*   **Recall Mechanism:** Regulators can instantly flag unsafe batches.

## Prerequisites
*   **Node.js:** v18+
*   **MetaMask:** Browser extension installed.
*   **Backend:** Must be running (see `../backend/README.md`).
*   **Blockchain:** Sepolia Testnet (or local Hardhat node).

## Setup & Installation

1.  **Navigate to frontend:**
    ```bash
    cd frontend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure Environment:**
    Create a `.env` file (copy from `.env.example`):
    ```bash
    cp .env.example .env
    ```
    **Required Variables:**
    ```env
    VITE_BACKEND_URL=http://localhost:4000/api
    VITE_CONTRACT_ADDRESS=0x4382a00d63e5ddf23652a70d4bab49279ee2a206  # Your deployed contract
    VITE_CHAIN_ID=11155111  # 11155111 for Sepolia, 31337 for Localhost
    ```

4.  **Run Development Server:**
    ```bash
    npm run dev
    ```
    Open [http://localhost:5173](http://localhost:5173) in your browser.

## User Manual: Role-Based Workflows

### 1. Admin (Contract Owner)
*   **Goal:** Manage the workforce. You decide who is allowed to participate.
*   **Action:**
    1.  Login with the **Owner Wallet**.
    2.  Go to **Admin** tab.
    3.  Enter a wallet address and select a Role (Producer, Transporter, etc.).
    4.  Click **Grant Role**.

### 2. Producer (e.g., Farmer)
*   **Goal:** Start the supply chain by creating a new batch.
*   **Action:**
    1.  Login with a **Producer Wallet**.
    2.  Go to **Create Batch** tab.
    3.  Enter details (Product Name, Origin, Temperature).
    4.  Click **Create Batch**. (This mints a new Batch ID on-chain).
    5.  **Handover:** Go to **Transfer Custody**, enter Batch ID and the **Transporter's address**, and click **Transfer**.

### 3. Transporter (e.g., Truck Driver)
*   **Goal:** Move the goods and record conditions.
*   **Action:**
    1.  Login with a **Transporter Wallet**.
    2.  Go to **Append Event** tab.
    3.  Enter Batch ID and select Event Type: **Transport**.
    4.  Enter data (e.g., "Arrived at DC", Temp: 4°C).
    5.  Click **Submit Event**.
    6.  **Handover:** Transfer custody to the **Retailer** when delivered.

### 4. Retailer (e.g., Supermarket)
*   **Goal:** Receive goods and sell to consumers.
*   **Action:**
    1.  Login with a **Retailer Wallet**.
    2.  Accept custody.
    3.  (Optional) Append "Stocked" event.
    4.  **Sell:** Mark the batch as **Sold** (if feature enabled) or simply provide the QR code to customers.

### 5. Regulator (e.g., Food Safety Inspector)
*   **Goal:** Audit the supply chain and protect the public.
*   **Action:**
    1.  Login with a **Regulator Wallet**.
    2.  Go to **Recall** tab.
    3.  Enter a Batch ID and a reason for the recall.
    4.  Click **Trigger Recall** to flag the batch globally.

### 6. Consumer (Public)
*   **Goal:** Verify food safety.
*   **Action:**
    1.  No login required.
    2.  Go to **Viewer** tab (or scan a QR code).
    3.  Enter Batch ID to see the full "Farm-to-Fork" timeline.
    4.  **Verify:** Check if the batch is marked as **RECALLED**.

## Advanced Features

### Automated System Test
*   Located in the **System Test** tab.
*   **Purpose:** Simulates the entire lifecycle (Create -> Transfer -> Transport -> Recall) in one click.
*   **Requirement:** Your wallet must have the **Producer** role (use Admin tab to grant it to yourself).

### Verify Hashes
*   Located in the **Verify Hashes** tab.
*   **Purpose:** Cryptographically prove that the data shown in the UI matches the immutable hash on the blockchain.
*   **How:** Enter Batch ID and CID (Content ID). The system re-computes the SHA-256 hash of the off-chain JSON and compares it with the on-chain record.

### QR Connect
*   Located in the **QR Connect** tab.
*   **Purpose:** Generate QR codes for physical labels or scan them to load batch data.

## Troubleshooting

### "Signature Mismatch" Error
*   **Cause:** The Chain ID in your `.env` file does not match the network your wallet is connected to.
*   **Fix:** Ensure `VITE_CHAIN_ID` in `frontend/.env` matches `CHAIN_ID` in `backend/.env`. (Default: `11155111` for Sepolia).


### "Role Not Allowed" Error
*   **Cause:** Your wallet address does not have the required role for the action (e.g., trying to Create Batch as a Transporter).
*   **Fix:** Use the **Admin** tab (with the Owner wallet) to grant the correct role to your address.

## Identity & Governance (Prototype Disclaimer)

In our prototype, we do not solve the real‑world identity problem algorithmically. Instead, we rely on a **Root of Trust** model: the smart contract enforces that only the **Admin** can assign roles (Producer, Transporter, Inspector, Regulator).

We assume the Admin follows an off-chain due diligence process to vet these entities before granting them privileges on-chain. In a production environment, we would replace this manual governance by connecting to: **Decentralized Identity (DID) providers, Verifiable Credentials (VCs), or existing GS1/GLN supply chain registries**.

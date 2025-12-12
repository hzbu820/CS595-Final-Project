# CS595 – Blockchain-Based Food Traceability

Repository scaffold for the CS595 final project: a blockchain-backed food batch traceability system with smart contracts, an off-chain storage API, and a React front-end.

## Repository Layout
```
├─ backend/             # Node/Express API for JSON storage + hash verification
├─ docs/                # Architecture notes, API contract, planning artifacts
├─ frontend/            # Vite/React workspace (implementation handled separately)
├─ smart-contracts/     # Hardhat project with FoodTraceability.sol

```


## Build & Run Guide (Local Testing)

Follow these steps to spin up the entire system locally (Blockchain Node + Backend + Frontend).

### 1. Install Dependencies
Open 3 separate terminals.
**Terminal 1 (Root):**
```bash
cd smart-contracts && npm install
cd ../backend && npm install
cd ../frontend && npm install
```

### 2. Configure Environment

**Backend (.env)**
Create `backend/.env` with the following:
```env
PORT=4000
FRONTEND_ORIGIN=http://localhost:5173
RPC_URL=http://127.0.0.1:8545
ORACLE_PK=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
CONTRACT_ADDRESS=will_update_later
CHAIN_ID=31337
```

**Frontend (.env)**
Create `frontend/.env` with the following:
```env
VITE_BACKEND_URL=http://localhost:4000/api
VITE_CONTRACT_ADDRESS=will_update_later
VITE_CHAIN_ID=31337
```

### 3. Start Services
**Terminal 1 (Blockchain Node):**
```bash
cd smart-contracts
npx hardhat node
```
*Keep this running. It creates a local blockchain at http://127.0.0.1:8545*

**Terminal 2 (Backend):**
```bash
cd backend
npm run dev
```

**Terminal 3 (Frontend):**
```bash
cd frontend
npm run dev
```

### 4. Deploy Contract & Update Configs
Open a **Terminal 4**:
```bash
cd smart-contracts
npx hardhat run scripts/deploy.ts --network localhost
```
**Output:** `Contract address: 0x...` (e.g., `0xe7f17...`)

**Action:**
1. Copy the address.
2. Update `backend/.env`: `CONTRACT_ADDRESS=0xe7f17...`
3. Update `frontend/.env`: `VITE_CONTRACT_ADDRESS=0xe7f17...`
4. **Restart Backend & Frontend** terminals to pick up changes.

### 5. Setup Roles (Crucial Step)
Grant privileges to the test accounts. In **Terminal 4**:
```bash
npx hardhat console --network localhost
```
Paste these commands inside the console:
```javascript
// Replace with YOUR deployed contract address
const Addr = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"; 
const contract = await ethers.getContractAt("FoodTraceability", Addr);

// Grant Inspector Role (3) to Backend Oracle
await contract.setRole("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", 3);

// Grant Producer Role (0) to default Test User
await contract.setRole("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", 0);
```

### 6. Verify
Open `http://localhost:5173`. You should be able to "Create Batch" immediately without errors.


In our prototype, we do not solve the real‑world identity problem algorithmically. Instead, we rely on a **Root of Trust** model: the smart contract enforces that only the **Admin** can assign roles (Producer, Transporter, Inspector, Regulator).

We assume the Admin follows an off-chain due diligence process to vet these entities before granting them privileges on-chain. In a production environment, we would replace this manual governance by connecting to: **Decentralized Identity (DID) providers, Verifiable Credentials (VCs), or existing GS1/GLN supply chain registries**.

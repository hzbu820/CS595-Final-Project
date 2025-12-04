# Smart Contracts

Solidity contracts, tests, and deployment scripts for the CS595 food traceability system. Built with Hardhat + ethers v6.

## Key Commands
`ash
cd smart-contracts
npm install
npm run build
npm test
npm run deploy:sepolia
`

## Setup Local Testing Fully
## 1: Install
# Install all dependencies
cd smart-contracts && npm install && cd ..
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

## 2: config Backend
Create backend/.env
cd backend
touch .env
```

**Paste this into `backend/.env`:**
```
PORT=4000
FRONTEND_ORIGIN=http://localhost:5173
RPC_URL=http://127.0.0.1:8545
ORACLE_PK=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
CONTRACT_ADDRESS=will_update_later
CHAIN_ID=31337

## 3 config Frontend
Create frontend/.env file:
cd ../frontend
touch .env
```

**Paste this into `frontend/.env`:**
```
VITE_BACKEND_URL=http://localhost:4000/api
VITE_CONTRACT_ADDRESS=will_update_later
VITE_CHAIN_ID=31337


## 4: Start all servers 
Terminal 1:
cd smart-contracts
npx hardhat node

Terminal 2:
cd backend
npm run dev

Terminal 3:
cd frontend
npm run dev

## 5: Deploy Contract Locally
cd smart-contracts
npm run build
cp artifacts/contracts/FoodTraceability.sol/FoodTraceability.json ../backend/ABI/
npx hardhat run scripts/deploy.ts --network localhost
```

**You'll see output like:**
```
Contract address: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
```

**Copy this address (yours will be different).**

---

## Step 6: Update Config Files

**Edit `backend/.env`:** (Copy from terminal not here)
```
CONTRACT_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
```
(Paste your contract address)

**Edit `frontend/.env`:** (Copy from terminal not here)
```
VITE_CONTRACT_ADDRESS=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512


## 7 Grant roles
New Terminal:

npx hardhat console --network localhost

Paste these commands (one at a time):
javascriptconst contract = await ethers.getContractAt("FoodTraceability", "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512");

(Use your contract address)
javascriptawait contract.setRole("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", 3);
(Grants Inspector role to backend)

javascriptawait contract.setRole("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", 0);
(Grants Producer role to test account)


## Configuration
- Duplicate .env.example → .env
- Provide SEPOLIA_RPC_URL, PRIVATE_KEY, ETHERSCAN_API_KEY, optional OWNER_ADDRESS

## Artifacts
- contracts/FoodTraceability.sol – main contract with role-based access control and event hashing API
- scripts/deploy.ts – saves metadata in deployments/
- 	est/ – minimal regression suite (extend with more scenarios)

After running 
pm run build, copy rtifacts/contracts/FoodTraceability.sol/FoodTraceability.json to the front-end src/abi/ folder.

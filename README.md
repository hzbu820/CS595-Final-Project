# CS595 – Blockchain-Based Food Traceability

Repository scaffold for the CS595 final project: a blockchain-backed food batch traceability system with smart contracts, an off-chain storage API, and a React front-end.

## Repository Layout
```
├─ backend/             # Node/Express API for JSON storage + hash verification
├─ docs/                # Architecture notes, API contract, planning artifacts
├─ frontend/            # Vite/React workspace (implementation handled separately)
├─ smart-contracts/     # Hardhat project with FoodTraceability.sol
├─ CS595 Project Proposal – Blockchains and their Applications.txt   (local only)
└─ FrontEnd_Guide_and_Prompt.txt                                    (local only)
```

The two `.txt` files are kept locally for reference and are ignored via `.gitignore` so they never reach GitHub.

## Getting Started
1. **Clone & Install** – `npm install` in both `backend` and `smart-contracts` when you are ready to run each workspace. (Front-end setup: follow `frontend/README.md`.)
2. **Environment Variables**
   - `backend/.env` → see `.env.example` for `PORT`, `STORAGE_DIR`, etc.
   - `smart-contracts/.env` → RPC URL, deployer key, and Etherscan key.
   - `frontend/.env` → contract address, chain ID, backend URL.
3. **Docs First** – Read `docs/architecture.md` for an overview and `docs/backend-api.md` for the off-chain service contract.

## Workstreams
- **Smart Contracts (`smart-contracts/`)** – Hardhat + TypeScript tooling; main contract `FoodTraceability.sol` implements role management, batch creation, event logging, custody transfer, and recall flags. Deployment metadata saved under `deployments/`.
- **Backend API (`backend/`)** – Express server exposing `/api/events/upload`, `/api/events/verify`, and `/api/events/:batchId/:cid`. Stores JSON payloads in `backend/storage/` (gitignored) and returns SHA-256 hashes to be recorded on-chain.
- **Front-End (`frontend/`)** – Placeholder workspace with guidance for spinning up a Vite + React + ethers v6 UI. Tabs: Create, Append, Transfer, Recall, Verify, Viewer, each wired to MetaMask and the backend API.

## Next Steps
1. Finalize contract ABI + deployment on Sepolia, then drop the compiled JSON into `frontend/src/abi/`.
2. Flesh out backend routes with persistence provider of choice (IPFS/S3) once credentials are ready.
3. Implement the React flows per `FrontEnd_Guide_and_Prompt.txt`, consuming the backend API and smart-contract functions.

Keep all new documentation in `docs/` so the whole team can iterate without touching the local-only proposal/guides.

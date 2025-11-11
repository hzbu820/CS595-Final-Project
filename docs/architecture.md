# Architecture Overview

## Goal
Provide transparent, tamper-resistant food batch tracking using an Ethereum smart contract, a lightweight API for off-chain JSON storage, and a React front-end for role-based interactions.

## High-Level Components
1. **Smart Contracts (Sepolia, Solidity/Hardhat)**
   - Role registry (producer, transporter, retailer, regulator, public).
   - Batch lifecycle management (create, append event, transfer custody, recall flag).
   - Event integrity via SHA-256 hashes stored on-chain with IPFS/GitHub-style CIDs for retrieval.
2. **Backend API (Node/Express)**
   - Accepts signed JSON payloads from the front-end.
   - Persists files to private storage (local filesystem by default, swappable for S3/IPFS later).
   - Returns deterministic CID/URI and hash so the UI can send them on-chain.
   - Supports verification endpoint that recomputes hashes for uploaded files.
3. **Front-End (React/Vite, handled separately)**
   - Wallet connection, role-based UI flows (Create, Append, Transfer, Recall, Verify, Viewer).
   - QR/JSON helpers, transaction activity toasts, Etherscan links.

## Data Flow (Happy Path)
1. Producer scans QR (Batch ID) and fills metadata.
2. Front-end generates SHA-256 hash + uploads JSON to backend /upload.
3. Backend stores JSON, returns cid + hash.
4. Front-end sends createBatch(batchId, cid, hash, initialCustodian) transaction via MetaMask.
5. Custodian repeats steps 2-4 for each new event using ppendEvent.
6. Transfer action updates custodian on-chain and in UI.
7. Regulator sets recall status; viewer tab surfaces recall flag and timeline.
8. Verification flow: user re-uploads JSON → backend recompute hash → compare with getEvent response.

## Environment & Tooling
- **Sepolia chain ID**: 11155111.
- **Hardhat** for compilation, testing, deployment (with scripts for local + Sepolia).
- **Node 20+** recommended for backend + frontend.
- **.env files** (not committed) store RPC URLs, private keys, storage paths, API secrets.

## Open Questions
- Final choice of off-chain storage provider (IPFS gateway vs private repo).
- Whether to integrate ZK-proof placeholder UI with real verifier contract.
- Need sample accounts/keys from backend & smart-contract teams for integration testing.

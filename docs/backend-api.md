# Backend API Contract

## Base URL
http://localhost:4000/api

## Health Check
- **GET** /health
- Response: { "status": "ok", "timestamp": "2025-11-11T13:00:00Z" }

## Upload Event JSON
- **POST** /events/upload
- Body: multipart/form-data with ile (JSON), atchId, eventType (create|append|transfer|recall|verify), ctor (wallet address).
- Response: { "cid": "local:uuid.json", "sha256": "0x...", "size": 1234 }
- Notes: backend stores file under ackend/storage/<batchId>/<cid>, returns deterministic hash used for on-chain transactions.

## Verify File
- **POST** /events/verify
- Body: multipart/form-data ile, expectedHash.
- Response: { "sha256": "0x...", "matches": true }.

## Retrieve Stored JSON (optional for demo)
- **GET** /events/:cid
- Response: raw JSON file; use for viewer tab to reconstruct timeline.

## Auth & Security (Future)
- Basic API key in headers.
- Signature verification for uploaded payloads.
- Replace local storage with S3/IPFS using same CID naming convention.

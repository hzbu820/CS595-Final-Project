# Backend API (Off-Chain Storage)

This package exposes the /upload and /verify endpoints required by the front-end flows. It stores JSON event payloads on disk (or any pluggable storage provider) and returns deterministic hashes and pseudo-CIDs.

## Quick Start
1. cd backend
2. 
pm install
3. Copy .env.example to .env and update values
4. 
pm run dev to start the watcher server on port 4000

## Folder Layout
- src/server.ts – Express bootstrap and dependency wiring
- src/routes – Route definitions (events.ts)
- src/services/storageService.ts – File persistence + hash helpers
- storage/ – Local folder containing uploaded JSON files (gitignored)

## Integration Contract
- Upload from UI → returns { cid, sha256, size }
- Verify JSON → returns { sha256, matches }
- Files saved under storage/<batchId>/<cid> enabling manual inspection during demos

Extend this service with authentication, S3/IPFS adapters, or database persistence as needed.

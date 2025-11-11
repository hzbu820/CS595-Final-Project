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

## Configuration
- Duplicate .env.example → .env
- Provide SEPOLIA_RPC_URL, PRIVATE_KEY, ETHERSCAN_API_KEY, optional OWNER_ADDRESS

## Artifacts
- contracts/FoodTraceability.sol – main contract with role-based access control and event hashing API
- scripts/deploy.ts – saves metadata in deployments/
- 	est/ – minimal regression suite (extend with more scenarios)

After running 
pm run build, copy rtifacts/contracts/FoodTraceability.sol/FoodTraceability.json to the front-end src/abi/ folder.

import { ethers } from "ethers";
import * as dotenv from "dotenv";

dotenv.config();

// ```
// TO RUN DEMO: Start Backend localhost -- npm run dev
// cd smart-contracts
// and run: npx ts-node scripts/demo.ts
// ```

const RPC_URL = process.env.SEPOLIA_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

const CONTRACT_ADDRESS = "0x65569C9724CFfEeE33dCdc07DBd8b546fD447f86";
// Change Batch id before running, can't create same batches
const BATCH_ID = "TEST-006";

const ROLE_PRODUCER = 0;
const ROLE_INSPECTOR = 3;
const ROLE_REGULATOR = 4;

// Hardhat test address used as example
const NEW_CUSTODIAN = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

const BACKEND_VERIFY_URL = "http://localhost:4000/api/compliance/verify";

const ABI = [
  "function setRole(address user, uint8 role) public",
  "function createBatch(string batchId, address firstCustodian, string contentId, bytes32 dataHash) public",
  "function getBatchState(string batchId) public view returns(uint8)",
  "function getCurrentCustodian(string batchId) public view returns(address)",
  "function setRecall(string batchId, string reason) public",
  "function transferCustody(string batchId, address newCustodian) public"
];

async function main() {
  console.log("\n===== FoodTraceability Demo on Sepolia =====\n");

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY!, provider);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);

  console.log("Using wallet:", wallet.address, "\n");

  // 1. Grant Producer role
  console.log("[1] Granting PRODUCER role to create batches...");
  let tx = await contract.setRole(wallet.address, ROLE_PRODUCER);
  console.log("  Tx:", tx.hash);
  console.log("  https://sepolia.etherscan.io/tx/" + tx.hash);
  await tx.wait();
  console.log();

  // 2. Create batch
  console.log("[2] Creating batch TEST-003...");
  const dataHash =
    "0x1234567890123456789012345678901234567890123456789012345678901234";

  tx = await contract.createBatch(BATCH_ID, wallet.address, "cid123", dataHash);
  console.log("  Tx:", tx.hash);
  console.log("  https://sepolia.etherscan.io/tx/" + tx.hash);
  await tx.wait();
  console.log();

  // 3. Check state
  console.log("[3] Checking batch state...");
  const state = await contract.getBatchState(BATCH_ID);
  console.log("  State =", state.toString(), "(0 = Active)\n");

  // 4. Grant Inspector role
  console.log("[4] Granting INSPECTOR role...");
  tx = await contract.setRole(wallet.address, ROLE_INSPECTOR);
  console.log("  Tx:", tx.hash);
  console.log("  https://sepolia.etherscan.io/tx/" + tx.hash);
  await tx.wait();
  console.log();

  // 5. Backend verification
  console.log("[5] Running backend compliance verification...");

  const response = await fetch(BACKEND_VERIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ batchId: BATCH_ID })
  });

  const compliance = await response.json();
  console.log("  Backend result:", compliance);

  if (compliance.txHash) {
    console.log("  Compliance Tx:", compliance.txHash);
    console.log(
      "  https://sepolia.etherscan.io/tx/" + compliance.txHash
    );
  }

  console.log();

  // 6. Transfer custody
  console.log("[6] Transferring custody...");
  tx = await contract.transferCustody(BATCH_ID, NEW_CUSTODIAN);
  console.log("  Tx:", tx.hash);
  console.log("  https://sepolia.etherscan.io/tx/" + tx.hash);
  await tx.wait();

  const custodian = await contract.getCurrentCustodian(BATCH_ID);
  console.log("  New custodian:", custodian, "\n");

  // 7. Set recall
  console.log("[7] Setting recall...");

  tx = await contract.setRole(wallet.address, ROLE_REGULATOR);
  await tx.wait();

  tx = await contract.setRecall(BATCH_ID, "Contamination detected");
  console.log("  Tx:", tx.hash);
  console.log("  https://sepolia.etherscan.io/tx/" + tx.hash);
  await tx.wait();

  const finalState = await contract.getBatchState(BATCH_ID);
  console.log("  Final state:", finalState.toString(), "(2 = Recalled)\n");

  console.log("===== Demo Complete! Check Etherscan for all txs. =====\n");
}

main().catch(console.error);

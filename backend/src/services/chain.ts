import { Contract, Wallet, JsonRpcProvider } from "ethers";
import type { InterfaceAbi } from "ethers";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Resolve artifacts path relative to this file (works in ESM and Docker)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const abiPath = path.resolve(__dirname, "../../../frontend/src/abi/FoodTrace.json");
const abiRaw = readFileSync(abiPath, "utf8").replace(/^\uFEFF/, "");
const abiJson = JSON.parse(abiRaw);
const abi = (Array.isArray(abiJson) ? abiJson : abiJson.abi) as InterfaceAbi;

const provider = new JsonRpcProvider(process.env.RPC_URL!);
const signer = new Wallet(process.env.ORACLE_PK!, provider);
const contract = new Contract(
  process.env.CONTRACT_ADDRESS!,
  abi,
  signer
);

export async function registerParticipant(address: string, role: number) {
  const tx = await contract.setRole(address, role);
  return await tx.wait();
}

export async function createBatch(
  batchId: string,
  firstCustodian: string,
  cid: string,
  dataHash: string,
) {
  const tx = await contract.createBatch(
    batchId,
    firstCustodian,
    cid,
    dataHash as `0x${string}`,
  );
  return await tx.wait();
}

export async function commitEvent(batchId: string, eventType: string, cid: string, hash: string) {
  const tx = await contract.appendEvent(
    batchId,
    eventType,
    cid,
    hash as `0x${string}`,
  );
  return await tx.wait();
}

export async function getOnChainEvent(batchId: string, idx: number) {
  const ev = await (contract as any).getEvent(batchId, idx);
  return ev;
}

export async function getRoleOf(address: `0x${string}`): Promise<number> {
  const role = await (contract as any).getRole(address);
  return Number(role);
}

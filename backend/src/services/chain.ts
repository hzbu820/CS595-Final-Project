import { Contract, Wallet, JsonRpcProvider } from "ethers";
import type { InterfaceAbi } from "ethers";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Resolve ABI path relative to this file (works in ESM and Docker)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// backend/ABI/FoodTraceability.json (Hardhat artifact)
const abiPath = path.resolve(__dirname, "../../ABI/FoodTraceability.json");
const abiRaw = readFileSync(abiPath, "utf8").replace(/^\uFEFF/, "");
const abiJson = JSON.parse(abiRaw);
const abi = (Array.isArray(abiJson) ? abiJson : abiJson.abi) as InterfaceAbi;

const provider = new JsonRpcProvider(process.env.RPC_URL!);
const contract = new Contract(
  process.env.CONTRACT_ADDRESS!,
  abi,
  provider
);

const getSignerContract = (): any => {
  const pk = process.env.ORACLE_PK;
  if (!pk) {
    throw new Error("ORACLE_PK is required for write operations (e.g. registerParticipant)");
  }
  const signer = new Wallet(pk, provider);
  return contract.connect(signer) as any;
};

export async function registerParticipant(address: string, role: number) {
  const signerContract = getSignerContract();
  const tx = await signerContract.setRole(address, role);
  return await tx.wait();
}

export async function createBatch(
  batchId: string,
  firstCustodian: string,
  cid: string,
  dataHash: string,
) {
  const signerContract = getSignerContract();
  const tx = await signerContract.createBatch(
    batchId,
    firstCustodian,
    cid,
    dataHash as `0x${string}`,
  );
  return await tx.wait();
}

export async function commitEvent(batchId: string, eventType: string, cid: string, hash: string) {
  const signerContract = getSignerContract();
  const tx = await signerContract.appendEvent(
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
  // ABI currently exposes roles(address) view, not getRole(address)
  const value = await (contract as any).roles(address);
  return Number(value);
}

export async function submitCompliance(
  batchId: string,
  condition: string,
  passed: boolean
) {
  const signerContract = getSignerContract();
  const tx = await signerContract.submitCompliance(batchId, condition, passed);
  return await tx.wait();
}

export async function getCompliance(batchId: string) {
  return await (contract as any).getCompliance(batchId);
}
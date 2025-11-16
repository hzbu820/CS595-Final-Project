import { Contract, Wallet, JsonRpcProvider } from "ethers";
import type { InterfaceAbi } from "ethers";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

// Resolve artifacts path relative to this file (works in ESM and Docker)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const abiPath = path.resolve(__dirname, "../../artifacts/FoodTraceability.json");
const abiJson = JSON.parse(readFileSync(abiPath, "utf8"));

const provider = new JsonRpcProvider(process.env.RPC_URL!);
const signer = new Wallet(process.env.ORACLE_PK!, provider);
const contract = new Contract(
  process.env.CONTRACT_ADDRESS!,
  (abiJson.abi as InterfaceAbi),
  signer
);

export async function commitEvent(batchId: string, eventType: string, hash: string) {
  const et = { Create:0, ShipOut:1, ShipIn:2, Storage:3, Inspect:4, Sell:5, Recall:6 }[eventType]!;
  const tx = await contract.appendEvent(batchId as `0x${string}`, et, hash as `0x${string}`);
  return await tx.wait();
}

export async function getOnChainEventHash(batchId: string, idx: number) {
  const ev = await (contract as any).batchEvents(batchId, idx);
  return ev.eventHash as string;
}

export async function getRoleOf(address: `0x${string}`): Promise<number> {
  const p = await (contract as any).participants(address);
  if (!p.enabled) throw new Error("address not registered");
  return Number(p.role);
}

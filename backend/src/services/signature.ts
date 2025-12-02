import { verifyTypedData, TypedDataDomain, TypedDataField } from "ethers";

const chainId = process.env.CHAIN_ID ? BigInt(process.env.CHAIN_ID) : 11155111n;
const domain: TypedDataDomain = { name: "FoodTrace", version: "1", chainId }; // Match frontend chainId
const types: Record<string, TypedDataField[]> = {
  EventPayload: [
    { name: "batchId", type: "bytes32" },
    { name: "eventType", type: "string" },
    { name: "data", type: "string" }, // pass JSON.stringify(data)
  ],
};

export async function recoverSigner(payload: {
  batchId: `0x${string}`; eventType: string; data: string;
}, signature: `0x${string}`): Promise<`0x${string}`> {
  return verifyTypedData(domain, types, payload, signature) as `0x${string}`;
}

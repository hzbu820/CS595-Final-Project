import { verifyTypedData, TypedDataDomain, TypedDataField } from "ethers";

const domain: TypedDataDomain = { name: "FoodTrace", version: "1", chainId: 11155111n }; // Match frontend chainId
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

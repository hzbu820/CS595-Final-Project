export type EventType = "Create" | "Transport" | "Inspect" | "Temperature";

export interface EventPayload {
  batchId: `0x${string}`;
  eventType: EventType;
  // your app fields (temp, gps, etc.)
  data: Record<string, unknown>;
}

export interface EventEnvelope {
  payload: EventPayload;           // canonicalized before hashing
  signer: `0x${string}`;           // participant address
  signature: `0x${string}`;        // EIP-712 or EIP-191 signature
  salt: `0x${string}`;             // 32-byte random
  sha256: `0x${string}`;           // SHA256(canonical || salt)
  enc?: {                          // optional encryption metadata
    alg: "AES-256-GCM";
    iv: `0x${string}`;
    tag: `0x${string}`;
  };
  cid?: string;                    // optional IPFS CID
  createdAt: number;               // unix seconds
}

// mirror Solidity roles (contract Role enum is 0..3)
export enum RoleId {
  Producer = 0,
  Transporter = 1,
  Retailer = 2,
  Regulator = 3,
}

// which roles are allowed for each eventType
export const AllowedRoles: Record<EventType, number[]> = {
  Create: [RoleId.Producer],                           // aligns with contract onlyRole(Producer)
  Transport: [RoleId.Producer, RoleId.Transporter],       // moving through the chain
  Inspect: [RoleId.Regulator],                          // inspections performed by regulators
  Temperature: [RoleId.Producer, RoleId.Transporter, RoleId.Retailer],
};

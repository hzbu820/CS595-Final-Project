export type EventType = "Create"|"ShipOut"|"ShipIn"|"Storage"|"Inspect"|"Sell"|"Recall";

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

// mirror Solidity roles
export enum RoleId {
  Manufacturer = 0,
  Transporter = 1,
  Storage = 2,
  Inspector = 3,
  Retailer = 4,
}

// which roles are allowed for each eventType
export const AllowedRoles: Record<EventType, number[]> = {
  Create:   [RoleId.Manufacturer, RoleId.Inspector],         // only producer/inspector can create batch
  ShipOut:  [RoleId.Transporter, RoleId.Manufacturer],       // leaving a location
  ShipIn:   [RoleId.Transporter, RoleId.Storage, RoleId.Retailer], // arriving at a node
  Storage:  [RoleId.Storage],                                // warehouse temp logs
  Inspect:  [RoleId.Inspector],                              // third-party checks
  Sell:     [RoleId.Retailer],                               // supermarket/retailer
  Recall:   [RoleId.Manufacturer, RoleId.Inspector],         // recall initiated by producer/inspector
};
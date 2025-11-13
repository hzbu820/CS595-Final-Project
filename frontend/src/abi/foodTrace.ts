export const foodTraceAbi = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "roles",
    "outputs": [
      {
        "internalType": "enum FoodTraceability.Role",
        "name": "",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "string", "name": "batchId", "type": "string" },
      { "internalType": "address", "name": "firstCustodian", "type": "address" },
      { "internalType": "string", "name": "cid", "type": "string" },
      { "internalType": "bytes32", "name": "dataHash", "type": "bytes32" }
    ],
    "name": "createBatch",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "string", "name": "batchId", "type": "string" },
      { "internalType": "string", "name": "eventType", "type": "string" },
      { "internalType": "string", "name": "cid", "type": "string" },
      { "internalType": "bytes32", "name": "dataHash", "type": "bytes32" }
    ],
    "name": "appendEvent",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "string", "name": "batchId", "type": "string" },
      { "internalType": "address", "name": "newCustodian", "type": "address" }
    ],
    "name": "transferCustody",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "string", "name": "batchId", "type": "string" },
      { "internalType": "bool", "name": "recalled", "type": "bool" },
      { "internalType": "string", "name": "reason", "type": "string" }
    ],
    "name": "setRecall",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "string", "name": "batchId", "type": "string" }
    ],
    "name": "getBatchSummary",
    "outputs": [
      {
        "components": [
          { "internalType": "string", "name": "batchId", "type": "string" },
          { "internalType": "address", "name": "creator", "type": "address" },
          {
            "internalType": "address",
            "name": "currentCustodian",
            "type": "address"
          },
          { "internalType": "bool", "name": "exists", "type": "bool" },
          { "internalType": "bool", "name": "recalled", "type": "bool" },
          { "internalType": "string", "name": "recallReason", "type": "string" },
          { "internalType": "uint256", "name": "createdAt", "type": "uint256" }
        ],
        "internalType": "struct FoodTraceability.Batch",
        "name": "summary",
        "type": "tuple"
      },
      {
        "components": [
          { "internalType": "string", "name": "eventType", "type": "string" },
          { "internalType": "address", "name": "actor", "type": "address" },
          { "internalType": "string", "name": "cid", "type": "string" },
          { "internalType": "bytes32", "name": "dataHash", "type": "bytes32" },
          { "internalType": "uint256", "name": "timestamp", "type": "uint256" }
        ],
        "internalType": "struct FoodTraceability.EventRecord[]",
        "name": "events",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "string", "name": "batchId", "type": "string" },
      { "internalType": "uint256", "name": "index", "type": "uint256" }
    ],
    "name": "getEvent",
    "outputs": [
      { "internalType": "string", "name": "eventType", "type": "string" },
      { "internalType": "address", "name": "actor", "type": "address" },
      { "internalType": "string", "name": "cid", "type": "string" },
      { "internalType": "bytes32", "name": "dataHash", "type": "bytes32" },
      { "internalType": "uint256", "name": "timestamp", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export const ROLE_LABELS = {
  0: 'Unregistered',
  1: 'Producer',
  2: 'Transporter',
  3: 'Retailer',
  4: 'Regulator',
} as const;

export type RoleId = keyof typeof ROLE_LABELS;

export const getRoleLabel = (role?: number | bigint | null) => {
  if (role === undefined || role === null) return ROLE_LABELS[0];
  const numeric = Number(role);
  return ROLE_LABELS[numeric as RoleId] ?? ROLE_LABELS[0];
};

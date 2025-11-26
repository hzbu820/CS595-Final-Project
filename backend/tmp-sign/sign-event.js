"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const ethers_1 = require("ethers");
const envPk = process.env.SIGNER_PK;
if (!envPk) {
    throw new Error("SIGNER_PK missing in .env");
}
const privateKey = envPk;
const domain = { name: "FoodTrace", version: "1", chainId: 0 };
const types = {
    EventPayload: [
        { name: "batchId", type: "bytes32" },
        { name: "eventType", type: "string" },
        { name: "data", type: "string" },
    ],
};
// 和你 Postman 里要发的一致
const batchId = "0x1111111111111111111111111111111111111111111111111111111111111111";
const eventType = "Transport";
const dataObj = { temperature: 4.5, ts: 1731599999, test: true };
const value = {
    batchId,
    eventType,
    data: JSON.stringify(dataObj),
};
async function main() {
    const wallet = new ethers_1.Wallet(privateKey);
    const signature = await wallet.signTypedData(domain, types, value);
    console.log("signer:", wallet.address);
    console.log("signature:", signature);
}
main().catch(console.error);

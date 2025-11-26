import 'dotenv/config';
import { Wallet } from 'ethers';

const privateKey = process.env.SIGNER_PK;
if (!privateKey) {
  throw new Error('SIGNER_PK missing in .env');
}

const domain = { name: 'FoodTrace', version: '1', chainId: 0 };
const types = {
  EventPayload: [
    { name: 'batchId', type: 'bytes32' },
    { name: 'eventType', type: 'string' },
    { name: 'data', type: 'string' },
  ],
};

// Must match the body you send to /api/events/upload
const batchId =
  '0x1111111111111111111111111111111111111111111111111111111111111111';
const eventType = 'Transport';
const dataObj = { temperature: 4.5, ts: 1731599999, test: true };

const value = {
  batchId,
  eventType,
  data: JSON.stringify(dataObj),
};

async function main() {
  const wallet = new Wallet(privateKey);
  const signature = await wallet.signTypedData(domain, types, value);
  console.log('signer:', wallet.address);
  console.log('signature:', signature);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});


import { BrowserProvider, type TypedDataDomain, type TypedDataField } from 'ethers';
import { TARGET_CHAIN_ID } from './ethereum';

const typedDomain: TypedDataDomain = { name: 'FoodTrace', version: '1', chainId: TARGET_CHAIN_ID };
const typedFields: Record<string, TypedDataField[]> = {
  EventPayload: [
    { name: 'batchId', type: 'bytes32' },
    { name: 'eventType', type: 'string' },
    { name: 'data', type: 'string' },
  ],
};

export const signEventPayload = async (provider: BrowserProvider, payload: {
  batchId: string;
  eventType: string;
  data: string;
}) => {
  const signer = await provider.getSigner();
  return signer.signTypedData(typedDomain, typedFields, payload);
};

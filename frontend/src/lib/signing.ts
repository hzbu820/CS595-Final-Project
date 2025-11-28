import { BrowserProvider, type TypedDataDomain, type TypedDataField } from 'ethers';

const normalize = (value: any): any => {
  if (Array.isArray(value)) {
    return value.map(normalize);
  }
  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((acc, key) => {
        acc[key] = normalize(value[key]);
        return acc;
      }, {} as Record<string, any>);
  }
  return value;
};

export const canonicalStringify = (value: unknown) => JSON.stringify(normalize(value));

const typedDomain: TypedDataDomain = { name: 'FoodTrace', version: '1' };
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

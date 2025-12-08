const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:4000/api';

const jsonHeaders = {
  'Content-Type': 'application/json',
};

const toJson = async (response: Response) => {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Backend request failed');
  }
  return response.json();
};

export const createBatchEnvelope = async (params: {
  batchId: string;
  meta: Record<string, unknown>;
  signature: string;
  signer: string;
  custodian?: string;
}) => {
  const res = await fetch(`${BACKEND_URL}/batches/create`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(params),
  });
  return toJson(res);
};

export const uploadSignedEvent = async (params: {
  batchId: string;
  eventType: string;
  data: Record<string, unknown>;
  signature: string;
  signer: string;
}) => {
  const res = await fetch(`${BACKEND_URL}/events/upload`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(params),
  });
  return toJson(res);
};

export const updateEventStatus = async (
  cid: string,
  status: 'confirmed' | 'failed',
  txHash?: string,
  metrics?: { latencyMs?: number; gasUsed?: string },
) => {
  const res = await fetch(`${BACKEND_URL}/events/${cid}/status`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({
      status,
      txHash,
      latencyMs: metrics?.latencyMs,
      gasUsed: metrics?.gasUsed,
    }),
  });
  return toJson(res);
};

export const updateBatchStatus = async (
  batchId: string,
  status: 'confirmed' | 'failed',
  txHash?: string,
  metrics?: { latencyMs?: number; gasUsed?: string },
) => {
  const res = await fetch(`${BACKEND_URL}/batches/${batchId}/status`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({
      status,
      txHash,
      latencyMs: metrics?.latencyMs,
      gasUsed: metrics?.gasUsed,
    }),
  });
  return toJson(res);
};

export const verifyStoredEvent = async (batchId: string, cid: string) => {
  const res = await fetch(`${BACKEND_URL}/events/verify`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ batchId, cid }),
  });
  return toJson(res);
};

export const fetchStoredEvent = async (batchId: string, cid: string) => {
  const res = await fetch(`${BACKEND_URL}/events/${batchId}/${cid}`);
  if (!res.ok) {
    throw new Error('Unable to download stored JSON');
  }
  return res.json();
};

export const linkEmailToWallet = async (params: { address: string; email: string; signature: string }) => {
  const res = await fetch(`${BACKEND_URL}/auth/link-email`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify(params),
  });
  return toJson(res);
};

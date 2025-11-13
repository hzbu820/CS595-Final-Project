const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:4000/api';

const toJson = async (response: Response) => {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Backend request failed');
  }
  return response.json();
};

export const uploadEventFile = async (params: {
  file: File;
  batchId: string;
  eventType: string;
  actor?: string;
}) => {
  const form = new FormData();
  form.append('file', params.file);
  form.append('batchId', params.batchId);
  form.append('eventType', params.eventType);
  if (params.actor) {
    form.append('actor', params.actor);
  }

  const res = await fetch(`${BACKEND_URL}/events/upload`, {
    method: 'POST',
    body: form,
  });

  return toJson(res);
};

export const verifyEventFile = async (params: { file: File; expectedHash?: string }) => {
  const form = new FormData();
  form.append('file', params.file);
  if (params.expectedHash) {
    form.append('expectedHash', params.expectedHash);
  }

  const res = await fetch(`${BACKEND_URL}/events/verify`, {
    method: 'POST',
    body: form,
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

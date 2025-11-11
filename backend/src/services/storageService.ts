import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT_STORAGE_DIR = path.resolve(process.cwd(), process.env.STORAGE_DIR ?? 'storage');

interface PersistResult {
  cid: string;
  sha256: string;
  size: number;
  filePath: string;
}

export const ensureStorageReady = async () => {
  await fs.mkdir(ROOT_STORAGE_DIR, { recursive: true });
};

const sha256Hex = (buffer: Buffer) =>
  '0x' + crypto.createHash('sha256').update(buffer).digest('hex');

export const persistEventFile = async (
  buffer: Buffer,
  batchId: string,
): Promise<PersistResult> => {
  if (!batchId) {
    throw new Error('batchId is required');
  }

  const hash = sha256Hex(buffer);
  const cid = ${crypto.randomUUID()}.json;
  const batchDir = path.join(ROOT_STORAGE_DIR, batchId);
  await fs.mkdir(batchDir, { recursive: true });
  const filePath = path.join(batchDir, cid);
  await fs.writeFile(filePath, buffer);

  return { cid, sha256: hash, size: buffer.length, filePath };
};

export const verifyBuffer = (buffer: Buffer, expected?: string) => {
  const sha256 = sha256Hex(buffer);
  const matches = expected ? sha256.toLowerCase() === expected.toLowerCase() : undefined;
  return { sha256, matches };
};

export const readStoredEvent = async (batchId: string, cid: string) => {
  const filePath = path.join(ROOT_STORAGE_DIR, batchId, cid);
  const file = await fs.readFile(filePath, { encoding: 'utf8' });
  return { file, filePath };
};

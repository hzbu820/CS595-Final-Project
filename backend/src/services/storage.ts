import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import stringify from "json-stable-stringify";

const ROOT_STORAGE_DIR = path.resolve(process.cwd(), process.env.STORAGE_DIR ?? 'storage');

interface PersistResult {
  cid: string;
  sha256: string;
  size: number;
  filePath: string;
}

const BATCH_ID_RE = /^0x[0-9a-fA-F]{64}$/;       // keccak256-style
const CID_RE = /^[a-zA-Z0-9._-]+$/;              // simple filename allowlist
const MAX_BYTES = Number(process.env.MAX_EVENT_BYTES ?? 256 * 1024); // 256KB default

// ---- Helpers
const sha256Hex = (buf: Buffer): `0x${string}` =>
  ("0x" + crypto.createHash("sha256").update(buf).digest("hex")) as `0x${string}`;

const safeJoin = (...parts: string[]) => {
  const p = path.join(...parts);
  const abs = path.resolve(p);
  if (!abs.startsWith(ROOT_STORAGE_DIR)) {
    throw new Error("Unsafe path resolution");
  }
  return abs;
};

// ---- API
export const ensureStorageReady = async () => {
  await fs.mkdir(ROOT_STORAGE_DIR, { recursive: true });
};

// Persist an arbitrary Buffer (e.g., already-canonicalized JSON)
export const persistEventFile = async (buffer: Buffer, batchId: string): Promise<PersistResult> => {
  if (!batchId || !BATCH_ID_RE.test(batchId)) throw new Error("Invalid batchId");
  if (buffer.byteLength > MAX_BYTES) throw new Error("Payload too large");

  const hash = sha256Hex(buffer);
  const cid = `${crypto.randomUUID()}.json`;                // (bugfix) proper template string
  const batchDir = safeJoin(ROOT_STORAGE_DIR, batchId);
  await fs.mkdir(batchDir, { recursive: true });
  const filePath = safeJoin(batchDir, cid);
  await fs.writeFile(filePath, buffer, { encoding: "utf8" });

  return { cid, sha256: hash, size: buffer.length, filePath };
};

// Persist a JS object as canonical JSON to guarantee stable hashing
export const persistJson = async (obj: unknown, batchId: string): Promise<PersistResult> => {
  if (obj === undefined) {
    throw new Error("persistJson: payload is undefined");
  }

  // stringify(...) returns string | undefined if value could be undefined — we just guarded it.
  const canonical = stringify(obj)!;          // non-null assertion is safe after the guard
  const buf = Buffer.from(canonical, "utf8");
  return persistEventFile(buf, batchId);
};

export const verifyBuffer = (buffer: Buffer, expected?: string) => {
  const sha256 = sha256Hex(buffer);
  const matches = expected ? sha256.toLowerCase() === expected.toLowerCase() : undefined;
  return { sha256, matches };
};

export const readStoredEvent = async (batchId: string, cid: string) => {
  if (!BATCH_ID_RE.test(batchId)) throw new Error("Invalid batchId");
  if (!CID_RE.test(cid)) throw new Error("Invalid cid");
  const filePath = safeJoin(ROOT_STORAGE_DIR, batchId, cid);
  const buf = await fs.readFile(filePath);                  // return raw buffer
  return { buffer: buf, text: buf.toString("utf8"), filePath };
};

// Convenience parser for JSON files you wrote with persistJson
export const readStoredJson = async <T = unknown>(batchId: string, cid: string) => {
  const { text, filePath } = await readStoredEvent(batchId, cid);
  return { json: JSON.parse(text) as T, filePath };
};
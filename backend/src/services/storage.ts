import crypto from "node:crypto";
import admin from "firebase-admin";
import stringify from "json-stable-stringify";

// Firebase bootstrap
const getFirebaseApp = () => {
  if (admin.apps.length) return admin.app();

  const bucket = process.env.FIREBASE_STORAGE_BUCKET;
  if (!bucket) {
    throw new Error("FIREBASE_STORAGE_BUCKET not set");
  }

  const svcB64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  const svcJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const credential = svcB64
    ? admin.credential.cert(JSON.parse(Buffer.from(svcB64, "base64").toString("utf8")))
    : svcJson
      ? admin.credential.cert(JSON.parse(svcJson))
      : admin.credential.applicationDefault();

  return admin.initializeApp({
    credential,
    storageBucket: bucket,
  });
};

const getBucket = () => getFirebaseApp().storage().bucket();

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

// ---- API
export const ensureStorageReady = async () => {
  getBucket(); // will throw if env is missing
};

// Persist an arbitrary Buffer (e.g., already-canonicalized JSON)
export const persistEventFile = async (buffer: Buffer, batchId: string): Promise<PersistResult> => {
  if (!batchId || !BATCH_ID_RE.test(batchId)) throw new Error("Invalid batchId");
  if (buffer.byteLength > MAX_BYTES) throw new Error("Payload too large");

  const hash = sha256Hex(buffer);
  const cid = `${crypto.randomUUID()}.json`;
  const objectPath = `${batchId}/${cid}`;
  const bucket = getBucket();

  await bucket.file(objectPath).save(buffer, {
    resumable: false,
    contentType: "application/json",
  });

  const filePath = `gs://${bucket.name}/${objectPath}`;
  return { cid, sha256: hash, size: buffer.length, filePath };
};

// Persist a JS object as canonical JSON to guarantee stable hashing
export const persistJson = async (obj: unknown, batchId: string): Promise<PersistResult> => {
  if (obj === undefined) {
    throw new Error("persistJson: payload is undefined");
  }

  const canonical = stringify(obj)!;
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

  const objectPath = `${batchId}/${cid}`;
  const bucket = getBucket();
  const [buf] = await bucket.file(objectPath).download();
  const filePath = `gs://${bucket.name}/${objectPath}`;

  return { buffer: buf, text: buf.toString("utf8"), filePath };
};

// Convenience parser for JSON files you wrote with persistJson
export const readStoredJson = async <T = unknown>(batchId: string, cid: string) => {
  const { text, filePath } = await readStoredEvent(batchId, cid);
  return { json: JSON.parse(text) as T, filePath };
};

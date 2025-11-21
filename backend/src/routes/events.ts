import { Router } from 'express';
import multer from 'multer';
import { getFirestore } from 'firebase-admin/firestore';
import {
  persistEventFile,
  readStoredEvent,
  verifyBuffer,
} from '../services/storage.js';
import { AllowedRoles, EventEnvelope, EventPayload, EventType, RoleId } from '../types.js';
import { registerParticipant, getRoleOf } from '../services/chain.js';
import { recoverSigner } from '../services/signature.js';
import { hashWithSalt, rand32 } from '../services/hash.js';
import { maybeEncrypt } from '../services/crypto.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
});

// POST /batches/create
// create a new batch (by farmer)
router.post("/batches/create", async (req, res, next) => {
  try {
    const { batchId, meta, signature, signer, custodian } = req.body as {
      batchId: `0x${string}`;
      meta: Record<string, unknown>;
      signature: `0x${string}`;
      signer: `0x${string}`;
      custodian?: `0x${string}`;
    };
    const firstCustodian = (custodian ?? signer) as `0x${string}`;

    const eventType: EventType = "Create";
    const data = meta;

    // 1) verify signature
    const recovered = await recoverSigner(
      { batchId, eventType, data: JSON.stringify(data ?? {}) },
      signature,
    );
    if (recovered.toLowerCase() !== signer.toLowerCase()) {
      return res.status(401).json({ message: "signature mismatch" });
    }

    // only Producer is allowed to create batch
    const role = await getRoleOf(signer);
    if (role !== RoleId.Producer) {
      return res.status(403).json({ message: "role not allowed to create batches" });
    }

    // 3) generate salted hash
    const salt = rand32();
    const payload: EventPayload = { batchId, eventType, data };
    const { canonical, sha256 } = hashWithSalt(payload, salt);

    const { ciphertext, ivHex, tagHex } = maybeEncrypt(canonical);
    const envelope: EventEnvelope = {
      payload,
      signer,
      signature,
      salt,
      sha256,
      enc: ciphertext
        ? {
            alg: "AES-256-GCM",
            iv: ivHex! as `0x${string}`,
            tag: tagHex! as `0x${string}`,
          }
        : undefined,
      createdAt: Math.floor(Date.now() / 1000),
    };

    const bodyToStore = ciphertext
      ? JSON.stringify({ envelope, ciphertext })
      : JSON.stringify({ envelope, canonical });

    // 5) persistoff-chain
    const stored = await persistEventFile(
      Buffer.from(bodyToStore, "utf8"),
      batchId,
    );

    // 6) persist metadata to Firestore (status pending until on-chain tx confirmed by client)
    const db = getFirestore();
    await db.collection("batches").doc(batchId).set({
      batchId,
      custodian: firstCustodian,
      cid: stored.cid,
      filePath: stored.filePath,
      sha256,
      saltedHash: sha256,
      salt,
      signer,
      signature,
      enc: envelope.enc ?? null,
      createdAt: Date.now(),
      eventType,
      meta: data,
      status: "pending",
      txHash: null,
    });

    return res.json({
      ok: true,
      batchId,
      custodian: firstCustodian,
      sha256,
      saltedHash: sha256, // alias for front-end expectation
      salt,
      cid: stored.cid,
      uri: `/api/events/${batchId}/${stored.cid}`,
      metadataUri: `/api/events/${batchId}/${stored.cid}`, // alias
      status: "pending",
    });
  } catch (e) {
    next(e);
  }
});


// POST /events/upload
router.post("/events/upload", async (req, res, next) => {
  try {
    const { batchId, eventType, data, signature, signer } = req.body as {
      batchId: `0x${string}`;
      eventType: EventType;
      data: Record<string, unknown>;
      signature: `0x${string}`;
      signer: `0x${string}`;
    };

    // 1) verify signature
    const recovered = await recoverSigner(
      { batchId, eventType, data: JSON.stringify(data ?? {}) },
      signature,
    );
    if (recovered.toLowerCase() !== signer.toLowerCase()) {
      return res.status(401).json({ message: "signature mismatch" });
    }

    // 2) role check
    const roleId = await getRoleOf(signer);
    const allowed = AllowedRoles[eventType] ?? [];

    if (!allowed.includes(roleId)) {
      return res.status(403).json({
        message: `role ${roleId} not allowed to emit eventType ${eventType}`,
      });
    }

    // 3) salted hash
    const salt = rand32();
    const payload: EventPayload = { batchId, eventType, data };
    const { canonical, sha256 } = hashWithSalt(payload, salt);

    // 4) optional encryption
    const { ciphertext, ivHex, tagHex } = maybeEncrypt(canonical);
    const envelope: EventEnvelope = {
      payload,
      signer,
      signature,
      salt,
      sha256,
      enc: ciphertext
        ? { alg: "AES-256-GCM", iv: ivHex! as `0x${string}`, tag: tagHex! as `0x${string}` }
        : undefined,
      createdAt: Math.floor(Date.now() / 1000),
    };

    // body to persist: ciphertext or canonical plaintext
    const bodyToStore = ciphertext ? JSON.stringify({ envelope, ciphertext }) 
                                   : JSON.stringify({ envelope, canonical });

    // 5) persist (fs or IPFS)
    const stored = await persistEventFile(Buffer.from(bodyToStore, "utf8"), batchId);

    // 6) save DB row (include signer/salt/enc fields) — status pending until client confirms on-chain
    const db = getFirestore();
    await db.collection("events").doc(stored.cid).set({
      batchId,
      eventType,
      cid: stored.cid,
      filePath: stored.filePath,
      sha256,
      saltedHash: sha256,
      salt,
      signer,
      signature,
      enc: envelope.enc ?? null,
      txHash: null,
      createdAt: Date.now(),
      data,
      status: "pending",
    });

    return res.json({
      ok: true,
      batchId,
      sha256,
      saltedHash: sha256,           // alias for front-end expectation
      salt,                // off-chain only; do NOT put salt on-chain
      cid: stored.cid,
      uri: `/api/events/${batchId}/${stored.cid}`,
      metadataUri: `/api/events/${batchId}/${stored.cid}`, // alias
      status: "pending",
    });
  } catch (e) { next(e); }
});


// POST /events/verify
// read stored envelope, reconstruct canonical string and salt, recompute hash, 
// compare with the on-chain hash, and (optionally) re-verify signature.
router.post("/events/verify", async (req, res, next) => {
  try {
    const { batchId, cid } = req.body as { batchId: `0x${string}`; cid: string };
    const { text } = await readStoredEvent(batchId, cid);
    const parsed = JSON.parse(text); // { envelope, canonical? , ciphertext? }
    const { envelope } = parsed as { envelope: EventEnvelope };

    // if encrypted, you can skip decrypt in MVP — verification uses salted hash
    const { sha256: recomputed } = hashWithSalt(envelope.payload, envelope.salt);

    // on-chain hash (compare against proper index if you store it)
    // or accept expectedHash as body param in MVP
    const match = recomputed.toLowerCase() === envelope.sha256.toLowerCase();
    return res.json({ ok: true, match, recomputed, recorded: envelope.sha256 });
  } catch (e) { next(e); }
});

// GET /events/:batchId/:cid — serves a previously stored JSON blob for authorized reads/view.
router.get("/events/:batchId/:cid", async (req, res, next) => {
  try {
    const { batchId, cid } = req.params;
    const { text } = await readStoredEvent(batchId, cid); // <-- text
    res.type("application/json");
    return res.send(text);
  } catch (error) {
    next(error);
  }
});

// POST /participants/register
router.post("/participants/register", async (req, res, next) => {
  try {
    const { address, role } = req.body;
    const receipt = await registerParticipant(address, role);
    return res.json({ ok: true, txHash: receipt.transactionHash, address, role });
  } catch (err) { next(err); }
});

// GET /participants/:address/role
router.get("/participants/:address/role", async (req, res, next) => {
  try {
    const { address } = req.params;
    const roleId = await getRoleOf(address as `0x${string}`);
    const roleNames: Record<number, string> = {
      1: "Producer",
      2: "Transporter",
      3: "Retailer",
      4: "Regulator",
    };
    return res.json({ address, roleId, role: roleNames[roleId] ?? "Unknown" });
  } catch (err) { next(err); }
});

// PATCH status for an uploaded event (after on-chain tx succeeds or fails)
router.post("/events/:cid/status", async (req, res, next) => {
  try {
    const { cid } = req.params;
    const { status, txHash } = req.body as { status?: string; txHash?: string };
    if (!status || !["confirmed", "failed"].includes(status)) {
      return res.status(400).json({ message: "status must be confirmed|failed" });
    }
    const db = getFirestore();
    const ref = db.collection("events").doc(cid);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ message: "event not found" });
    await ref.update({
      status,
      txHash: txHash ?? snap.get("txHash") ?? null,
      updatedAt: Date.now(),
    });
    return res.json({ ok: true, status, txHash: txHash ?? snap.get("txHash") ?? null });
  } catch (err) { next(err); }
});

// PATCH status for batch creation (after on-chain tx succeeds or fails)
router.post("/batches/:batchId/status", async (req, res, next) => {
  try {
    const { batchId } = req.params;
    const { status, txHash } = req.body as { status?: string; txHash?: string };
    if (!status || !["confirmed", "failed"].includes(status)) {
      return res.status(400).json({ message: "status must be confirmed|failed" });
    }
    const db = getFirestore();
    const ref = db.collection("batches").doc(batchId);
    const snap = await ref.get();
    if (!snap.exists) return res.status(404).json({ message: "batch not found" });
    await ref.update({
      status,
      txHash: txHash ?? snap.get("txHash") ?? null,
      updatedAt: Date.now(),
    });
    return res.json({ ok: true, status, txHash: txHash ?? snap.get("txHash") ?? null });
  } catch (err) { next(err); }
});

export default router;

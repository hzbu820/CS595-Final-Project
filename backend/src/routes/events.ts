import { Router } from 'express';
import multer from 'multer';
import {
  persistEventFile,
  readStoredEvent,
  verifyBuffer,
} from '../services/storage.js';
import { EventEnvelope, EventPayload, EventType } from '../types.js';
import { registerParticipant, commitEvent, getRoleOf } from '../services/chain.js';
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
    const { batchId, meta, signature, signer } = req.body as {
      batchId: `0x${string}`;
      meta: Record<string, unknown>;
      signature: `0x${string}`;
      signer: `0x${string}`;
    };

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

    // only Producer / Inspector are allowed to create batch
    const role = await getRoleOf(signer);
    // todo
    if (role !== 1 && role !== 4) {
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

    // 6) commit Create event on chain
    const receipt = await commitEvent(batchId, eventType, sha256);

    // todo: perhaps add batch meta in sqlite

    return res.json({
      ok: true,
      txHash: receipt.transactionHash,
      batchId,
      sha256,
      salt,
      cid: stored.cid,
      uri: `/api/events/${batchId}/${stored.cid}`,
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
    const roleId = await getRoleOf(signer);         // e.g. 2 = Storage
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
      payload, signer, signature, salt, sha256,
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

    // 6) commit on-chain
    const receipt = await commitEvent(batchId, eventType, sha256);

    // 7) save DB row (include signer/salt/enc fields)
    // ...insert into events(...)

    return res.json({
      ok: true,
      txHash: receipt.transactionHash,
      batchId,
      sha256,
      salt,                // off-chain only; do NOT put salt on-chain
      cid: stored.cid,
      uri: `/api/events/${batchId}/${stored.cid}`,
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
    const roleNames = ["Manufacturer", "Transporter", "Warehouse", "Inspector", "Retailer"];
    return res.json({ address, roleId, role: roleNames[roleId] });
  } catch (err) { next(err); }
});

export default router;

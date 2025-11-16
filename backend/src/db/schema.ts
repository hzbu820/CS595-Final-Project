import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const batches = sqliteTable("batches", {
  id: text("id").primaryKey(),        // hex 0x…32 bytes (BatchID)
  createdBy: text("created_by").notNull(), // eth address
  createdAt: integer("created_at").notNull().default(sql`(strftime('%s','now'))`),
  closed: integer("closed", { mode: "boolean" }).notNull().default(false),
  recall: integer("recall", { mode: "boolean" }).notNull().default(false),
  metaHash: text("meta_hash"),         // SHA-256 or IPFS CID for creation record
});

export const events = sqliteTable("events", {
  id: text("id").primaryKey(),         // uuid
  batchId: text("batch_id").notNull(), // FK -> batches.id
  idx: integer("idx").notNull(),       // event index (0..n)
  eventType: text("event_type").notNull(), // Create|ShipOut|ShipIn|Storage|Inspect|Sell|Recall
  actor: text("actor").notNull(),      // eth address (caller / custodian / oracle)
  sha256: text("sha256").notNull(),    // on-chain committed hash
  cid: text("cid"),                    // optional IPFS CID
  path: text("path"),                  // local file path (for private reads)
  createdAt: integer("created_at").notNull().default(sql`(strftime('%s','now'))`),
  signer: text("signer").notNull(),           // recovered address
    salt: text("salt").notNull(),               // 0x..32B
    encAlg: text("enc_alg"),                    // null if not encrypted
    encIv: text("enc_iv"),
    encTag: text("enc_tag"),
});
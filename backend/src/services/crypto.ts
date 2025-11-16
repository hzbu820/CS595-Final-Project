import crypto from "node:crypto";
const ENC_KEY = Buffer.from(process.env.BACKEND_AES_KEY ?? "", "hex"); // 32 bytes

export function maybeEncrypt(plainUtf8: string) {
  if (ENC_KEY.length !== 32) return { ciphertext: undefined, ivHex: undefined, tagHex: undefined };
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", ENC_KEY, iv);
  const ct = Buffer.concat([cipher.update(plainUtf8, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: "0x" + ct.toString("hex"),
    ivHex: "0x" + iv.toString("hex"),
    tagHex: "0x" + tag.toString("hex"),
  };
}

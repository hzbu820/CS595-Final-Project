import crypto from "crypto";
import stringify from "json-stable-stringify";

export function rand32(): `0x${string}` {
  return ("0x" + crypto.randomBytes(32).toString("hex")) as `0x${string}`;
}

export function hashWithSalt(obj: unknown, saltHex: `0x${string}`) {
  if (obj === undefined) throw new Error("hashWithSalt: undefined payload");
  const canonical = stringify(obj)!;
  const saltBuf = Buffer.from(saltHex.slice(2), "hex");
  const sha256 = crypto.createHash("sha256")
    .update(Buffer.from(canonical, "utf8"))
    .update(saltBuf)
    .digest("hex");
  return { canonical, sha256: ("0x" + sha256) as `0x${string}` };
}
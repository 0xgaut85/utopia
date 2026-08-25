/**
 * Writes sim/secrets/wallets.json. Never print keys. Never commit that file.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import { secp256k1 } from "@noble/curves/secp256k1.js";
import { keccak_256 } from "@noble/hashes/sha3.js";
import nacl from "tweetnacl";
import bs58 from "bs58";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../..");
const users = JSON.parse(
  readFileSync(join(root, "sim/plan/users.json"), "utf8")
);

function evmWallet() {
  const priv = randomBytes(32);
  const pub = secp256k1.getPublicKey(priv, false).subarray(1);
  const addr = keccak_256(pub).subarray(-20);
  return {
    evmPrivateKey: `0x${Buffer.from(priv).toString("hex")}`,
    evmAddress: `0x${Buffer.from(addr).toString("hex")}`,
  };
}

function solWallet() {
  const pair = nacl.sign.keyPair();
  return {
    solanaPrivateKey: bs58.encode(pair.secretKey),
    solanaAddress: bs58.encode(pair.publicKey),
  };
}

if (users.length !== 300) {
  throw new Error(`expected 300 users, got ${users.length}`);
}

const rows = users.map((user) => {
  if (
    typeof user.walletIndex !== "number" ||
    user.walletIndex < 0 ||
    user.walletIndex > 299
  ) {
    throw new Error(`bad walletIndex ${user.username}`);
  }
  return {
    walletIndex: user.walletIndex,
    username: user.username,
    ...evmWallet(),
    ...solWallet(),
  };
});

rows.sort((a, b) => a.walletIndex - b.walletIndex);
const indexes = new Set(rows.map((row) => row.walletIndex));
if (indexes.size !== 300) throw new Error("walletIndex collision");

const outDir = join(root, "sim/secrets");
mkdirSync(outDir, { recursive: true });
const outFile = join(outDir, "wallets.json");
writeFileSync(outFile, `${JSON.stringify(rows, null, 2)}\n`);

console.log(
  JSON.stringify({
    wallets: rows.length,
    file: "sim/secrets/wallets.json",
    evmSample: rows[0].evmAddress,
    solSample: rows[0].solanaAddress,
  })
);

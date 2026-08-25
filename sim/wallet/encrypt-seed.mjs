/**
 * Encrypts sim/secrets/wallets.json into the wallet Postgres.
 * Requires SIM_WALLET_DATABASE_URL and SIM_WALLET_SECRET.
 * Does not print keys.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createCipheriv, randomBytes, scryptSync } from "node:crypto";
import { PrismaClient } from "../../node_modules/.prisma/sim-wallet-client/index.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "../..");
const secret = process.env.SIM_WALLET_SECRET;
if (!secret || secret.length < 16) {
  throw new Error("SIM_WALLET_SECRET must be set (16+ chars)");
}
if (!process.env.SIM_WALLET_DATABASE_URL) {
  throw new Error("SIM_WALLET_DATABASE_URL must be set");
}

const wallets = JSON.parse(
  readFileSync(join(root, "sim/secrets/wallets.json"), "utf8")
);
if (!Array.isArray(wallets) || wallets.length !== 300) {
  throw new Error("sim/secrets/wallets.json must have 300 rows");
}

const key = scryptSync(secret, "utopia-sim-wallet", 32);

function seal(plain) {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  const ciphertext = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);
  return { ciphertext, nonce, tag: cipher.getAuthTag() };
}

const prisma = new PrismaClient();
let written = 0;
try {
  for (const row of wallets) {
    const evm = seal(row.evmPrivateKey);
    const sol = seal(row.solanaPrivateKey);
    await prisma.simWallet.upsert({
      where: { walletIndex: row.walletIndex },
      create: {
        walletIndex: row.walletIndex,
        evmAddress: row.evmAddress,
        solanaAddress: row.solanaAddress,
        evmKeyCipher: evm.ciphertext,
        evmKeyNonce: evm.nonce,
        evmKeyTag: evm.tag,
        solanaKeyCipher: sol.ciphertext,
        solanaKeyNonce: sol.nonce,
        solanaKeyTag: sol.tag,
      },
      update: {
        evmAddress: row.evmAddress,
        solanaAddress: row.solanaAddress,
        evmKeyCipher: evm.ciphertext,
        evmKeyNonce: evm.nonce,
        evmKeyTag: evm.tag,
        solanaKeyCipher: sol.ciphertext,
        solanaKeyNonce: sol.nonce,
        solanaKeyTag: sol.tag,
      },
    });
    written += 1;
  }
} finally {
  await prisma.$disconnect();
}

console.log(JSON.stringify({ seeded: written }));

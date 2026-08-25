import { createDecipheriv, scryptSync } from "node:crypto";
import { privateKeyToAccount } from "viem/accounts";
import { wallets } from "./db.mjs";

const SALT = "utopia-sim-wallet";

function keyMaterial() {
  const secret = process.env.SIM_WALLET_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("SIM_WALLET_SECRET must be set");
  }
  return scryptSync(secret, SALT, 32);
}

function open(cipher, nonce, tag) {
  const decipher = createDecipheriv("aes-256-gcm", keyMaterial(), nonce);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(cipher), decipher.final()]).toString(
    "utf8"
  );
}

export async function loadSimWallet(walletIndex) {
  const row = await wallets.simWallet.findUnique({
    where: { walletIndex },
  });
  if (!row) return null;
  return {
    walletIndex: row.walletIndex,
    evmAddress: row.evmAddress,
    solanaAddress: row.solanaAddress,
    evmPrivateKey: open(row.evmKeyCipher, row.evmKeyNonce, row.evmKeyTag),
    solanaPrivateKey: open(
      row.solanaKeyCipher,
      row.solanaKeyNonce,
      row.solanaKeyTag
    ),
  };
}

export function testSignEvm(privateKey) {
  const account = privateKeyToAccount(privateKey);
  return account.signMessage({ message: "utopia-sim-wallet-ok" });
}

export function publicAddresses(row) {
  return {
    wallet: row.evmAddress,
    payoutUsdcBase: row.evmAddress,
    payoutUsdgRobinhood: row.evmAddress,
    payoutSolanaUsdc: row.solanaAddress,
  };
}

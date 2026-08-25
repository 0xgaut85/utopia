import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createTransferCheckedInstruction,
  getAccount,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import bs58 from "bs58";
import {
  createPublicClient,
  createWalletClient,
  encodeFunctionData,
  http,
  keccak256,
  parseEther,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { app } from "./db.mjs";
import { logEvent, safeError } from "./log.mjs";
import {
  CHAINS,
  EVM_ESCROW,
  SOLANA_ESCROW,
  TOKEN_DECIMALS,
  USDC_SOLANA,
  bountyDepositTotal,
  chainOf,
  fromTokenUnits,
  rpcUrl,
  tokenUnits,
} from "./money.mjs";
import { testSignEvm } from "./wallet.mjs";

const ERC20_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "balance", type: "uint256" }],
  },
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "ok", type: "bool" }],
  },
];

const robinhood = {
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: {
      http: [rpcUrl("usdg-robinhood")],
    },
  },
};

function evmChain(chainId) {
  return chainId === "usdg-robinhood" ? robinhood : base;
}

function evmClients(chainId, privateKey) {
  const chain = evmChain(chainId);
  const transport = http(rpcUrl(chainId));
  const account = privateKeyToAccount(privateKey);
  return {
    account,
    publicClient: createPublicClient({ chain, transport }),
    walletClient: createWalletClient({ account, chain, transport }),
  };
}

function solanaConnection(chainId = "usdc-solana") {
  return new Connection(rpcUrl(chainId), "confirmed");
}

function solanaKeypair(secret) {
  const raw = secret.trim();
  if (raw.startsWith("[")) {
    return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)));
  }
  return Keypair.fromSecretKey(bs58.decode(raw));
}

export function escrowSigner(chainId) {
  const chain = chainOf(chainId);
  if (chain.kind === "evm") {
    const key = process.env.ESCROW_KEY_EVM?.trim();
    if (!key) throw new Error("ESCROW_KEY_EVM missing");
    return { kind: "evm", key, address: privateKeyToAccount(key).address };
  }
  const key = process.env.ESCROW_KEY_SOLANA?.trim();
  if (!key) throw new Error("ESCROW_KEY_SOLANA missing");
  const pair = solanaKeypair(key);
  return { kind: "solana", key, address: pair.publicKey.toBase58(), pair };
}

export async function nativeBalance(chainId, address) {
  const chain = chainOf(chainId);
  if (chain.kind === "evm") {
    const { publicClient } = evmClients(chainId, process.env.ESCROW_KEY_EVM);
    const wei = await publicClient.getBalance({ address });
    return Number(wei) / 1e18;
  }
  const lamports = await solanaConnection().getBalance(new PublicKey(address));
  return lamports / LAMPORTS_PER_SOL;
}

export async function tokenBalance(chainId, address) {
  const chain = chainOf(chainId);
  if (chain.kind === "evm") {
    const { publicClient } = evmClients(chainId, process.env.ESCROW_KEY_EVM);
    const raw = await publicClient.readContract({
      address: chain.token,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [address],
    });
    return fromTokenUnits(raw);
  }
  const connection = solanaConnection();
  const ata = getAssociatedTokenAddressSync(
    new PublicKey(USDC_SOLANA),
    new PublicKey(address)
  );
  try {
    const account = await getAccount(connection, ata);
    return fromTokenUnits(account.amount);
  } catch {
    return 0;
  }
}

export async function reservedRealDeposits(chainId) {
  const tasks = await app.task.findMany({
    where: {
      status: "open",
      isSynthetic: false,
      depositNetwork: chainId,
    },
    select: { priceUsdc: true },
  });
  return tasks.reduce((sum, task) => sum + bountyDepositTotal(task.priceUsdc), 0);
}

export async function spendable(chainId) {
  const onChain = await tokenBalance(chainId, chainOf(chainId).escrow);
  const reserved = await reservedRealDeposits(chainId);
  return onChain - reserved;
}

export async function assertSpendable(chainId, amount) {
  const free = await spendable(chainId);
  if (free + 0.001 < amount) {
    throw new Error(
      `spendable ${chainId} is ${free.toFixed(2)}, need ${amount}`
    );
  }
}

async function waitEvm(chainId, hash, ms = 120000) {
  const { publicClient } = evmClients(chainId, process.env.ESCROW_KEY_EVM);
  const receipt = await publicClient.waitForTransactionReceipt({
    hash,
    timeout: ms,
  });
  if (receipt.status !== "success") {
    throw new Error(`evm tx reverted ${hash}`);
  }
  return receipt;
}

async function waitSolana(signature, ms = 120000) {
  const connection = solanaConnection();
  const start = Date.now();
  while (Date.now() - start < ms) {
    const status = await connection.getSignatureStatus(signature, {
      searchTransactionHistory: true,
    });
    const value = status?.value;
    if (value?.err) throw new Error(`solana tx failed ${signature}`);
    if (
      value?.confirmationStatus === "confirmed" ||
      value?.confirmationStatus === "finalized"
    ) {
      return value;
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error(`solana tx not confirmed ${signature}`);
}

/** The stored signed tx can never land (its nonce or blockhash is spent). */
export class DeadRawError extends Error {}

async function evmTxKnown(chainId, hash) {
  const { publicClient } = evmClients(chainId, process.env.ESCROW_KEY_EVM);
  const tx = await publicClient
    .getTransaction({ hash })
    .catch(() => null);
  return Boolean(tx);
}

export async function confirmOrReplay(chainId, hash, raw) {
  if (!hash || hash === "skipped") return;
  const chain = chainOf(chainId);
  try {
    if (chain.kind === "evm") {
      await waitEvm(chainId, hash, 45000);
      return;
    }
    await waitSolana(hash, 45000);
    return;
  } catch (err) {
    if (!raw) throw err;
    await logEvent({
      kind: "fund",
      level: "warn",
      message: `rebroadcast ${chainId}`,
    });
    if (chain.kind === "evm") {
      const { publicClient } = evmClients(chainId, process.env.ESCROW_KEY_EVM);
      try {
        await publicClient.sendRawTransaction({ serializedTransaction: raw });
      } catch (sendErr) {
        const message = String(sendErr?.message || sendErr);
        const known = await evmTxKnown(chainId, hash);
        if (/nonce too low/i.test(message) && !known) {
          // A different tx consumed this nonce; this raw can never mine.
          throw new DeadRawError(`dead raw on ${chainId}: nonce consumed`);
        }
        if (!known && !/already known|already exists/i.test(message)) {
          throw sendErr;
        }
      }
      await waitEvm(chainId, hash, 120000);
      return;
    }
    const connection = solanaConnection();
    try {
      await connection.sendRawTransaction(Buffer.from(raw, "base64"), {
        skipPreflight: false,
      });
    } catch (sendErr) {
      const message = String(sendErr?.message || sendErr);
      if (/blockhash not found|block height exceeded/i.test(message)) {
        const status = await connection.getSignatureStatus(hash, {
          searchTransactionHistory: true,
        });
        if (!status?.value) {
          throw new DeadRawError(`dead raw on ${chainId}: blockhash expired`);
        }
      } else if (!/already been processed/i.test(message)) {
        throw sendErr;
      }
    }
    await waitSolana(hash, 120000);
  }
}

/**
 * Public RPCs are load balanced and can lag one tx behind. Within a job we
 * remember the last nonce each escrow-side tx used so the next signature
 * never reuses it, even if the RPC still reports the old count.
 */
function nextEscrowNonce(hashes) {
  const used = ["gasNonce", "escrowOutNonce", "payoutNonce"]
    .map((key) => hashes?.[key])
    .filter((value) => Number.isInteger(value));
  return used.length ? Math.max(...used) + 1 : 0;
}

async function evmNonce(chainId, address, minNonce = 0) {
  const { publicClient } = evmClients(chainId, process.env.ESCROW_KEY_EVM);
  const pending = await publicClient.getTransactionCount({
    address,
    blockTag: "pending",
  });
  return Math.max(pending, minNonce);
}

async function signEvmTransfer({ chainId, privateKey, to, amount, minNonce }) {
  const chain = chainOf(chainId);
  const { account, walletClient } = evmClients(chainId, privateKey);
  const nonce = await evmNonce(chainId, account.address, minNonce);
  const request = await walletClient.prepareTransactionRequest({
    to: chain.token,
    data: encodeFunctionData({
      abi: ERC20_ABI,
      functionName: "transfer",
      args: [to, tokenUnits(amount)],
    }),
    nonce,
  });
  const raw = await walletClient.signTransaction(request);
  return { hash: keccak256(raw), raw, nonce };
}

async function signEvmNative({ chainId, privateKey, to, eth, minNonce }) {
  const { account, walletClient } = evmClients(chainId, privateKey);
  const nonce = await evmNonce(chainId, account.address, minNonce);
  const request = await walletClient.prepareTransactionRequest({
    to,
    value: parseEther(String(eth)),
    nonce,
  });
  const raw = await walletClient.signTransaction(request);
  return { hash: keccak256(raw), raw, nonce };
}

async function broadcastEvm(chainId, raw) {
  const { publicClient } = evmClients(chainId, process.env.ESCROW_KEY_EVM);
  return publicClient.sendRawTransaction({ serializedTransaction: raw });
}

async function signSolanaTransfer({ fromKey, toAddress, amount }) {
  const connection = solanaConnection();
  const from = solanaKeypair(fromKey);
  const mint = new PublicKey(USDC_SOLANA);
  const dest = new PublicKey(toAddress);
  const fromAta = getAssociatedTokenAddressSync(mint, from.publicKey);
  const toAta = getAssociatedTokenAddressSync(mint, dest);
  const tx = new Transaction().add(
    createTransferCheckedInstruction(
      fromAta,
      mint,
      toAta,
      from.publicKey,
      tokenUnits(amount),
      TOKEN_DECIMALS,
      [],
      TOKEN_PROGRAM_ID
    )
  );
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;
  tx.lastValidBlockHeight = lastValidBlockHeight;
  tx.feePayer = from.publicKey;
  tx.sign(from);
  const raw = Buffer.from(tx.serialize()).toString("base64");
  return { hash: bs58.encode(tx.signature), raw };
}

async function signSolanaNative({ toAddress, sol }) {
  const connection = solanaConnection();
  const from = escrowSigner("usdc-solana").pair;
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: from.publicKey,
      toPubkey: new PublicKey(toAddress),
      lamports: Math.round(sol * LAMPORTS_PER_SOL),
    })
  );
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;
  tx.lastValidBlockHeight = lastValidBlockHeight;
  tx.feePayer = from.publicKey;
  tx.sign(from);
  const raw = Buffer.from(tx.serialize()).toString("base64");
  return { hash: bs58.encode(tx.signature), raw };
}

async function signSolanaAta({ ownerAddress }) {
  const connection = solanaConnection();
  const payer = escrowSigner("usdc-solana").pair;
  const owner = new PublicKey(ownerAddress);
  const mint = new PublicKey(USDC_SOLANA);
  const ata = getAssociatedTokenAddressSync(mint, owner);
  try {
    await getAccount(connection, ata);
    return { hash: "skipped" };
  } catch {
    /* create */
  }
  const tx = new Transaction().add(
    createAssociatedTokenAccountInstruction(
      payer.publicKey,
      ata,
      owner,
      mint
    )
  );
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;
  tx.lastValidBlockHeight = lastValidBlockHeight;
  tx.feePayer = payer.publicKey;
  tx.sign(payer);
  const raw = Buffer.from(tx.serialize()).toString("base64");
  return { hash: bs58.encode(tx.signature), raw };
}

async function broadcastSolana(raw) {
  const connection = solanaConnection();
  return connection.sendRawTransaction(Buffer.from(raw, "base64"), {
    skipPreflight: false,
  });
}

export async function broadcastSigned(chainId, raw) {
  if (chainOf(chainId).kind === "evm") return broadcastEvm(chainId, raw);
  return broadcastSolana(raw);
}

async function dropDeadRaw(hashes, hashKey, persist, err) {
  if (!(err instanceof DeadRawError)) throw err;
  await logEvent({
    kind: "fund",
    level: "warn",
    message: `re-signing ${hashKey}: ${err.message}`,
  });
  delete hashes[hashKey];
  delete hashes[`${hashKey}Raw`];
  delete hashes[`${hashKey}Nonce`];
  await persist(hashes, hashKey);
}

export async function ensureGas(chainId, userAddress, hashes, persist) {
  const chain = chainOf(chainId);
  if (chain.kind === "evm") {
    if (hashes.gas) {
      try {
        await confirmOrReplay(chainId, hashes.gas, hashes.gasRaw);
        return hashes;
      } catch (err) {
        await dropDeadRaw(hashes, "gas", persist, err);
      }
    }
    const eth = await nativeBalance(chainId, userAddress);
    if (eth >= 0.0003) {
      hashes.gas = "skipped";
      await persist(hashes, "gas");
      return hashes;
    }
    const signed = await signEvmNative({
      chainId,
      privateKey: process.env.ESCROW_KEY_EVM,
      to: userAddress,
      eth: 0.0004,
      minNonce: nextEscrowNonce(hashes),
    });
    hashes.gas = signed.hash;
    hashes.gasRaw = signed.raw;
    hashes.gasNonce = signed.nonce;
    await persist(hashes, "gas");
    await broadcastEvm(chainId, signed.raw);
    await waitEvm(chainId, signed.hash);
    return hashes;
  }

  if (hashes.gas) {
    try {
      await confirmOrReplay(chainId, hashes.gas, hashes.gasRaw);
    } catch (err) {
      await dropDeadRaw(hashes, "gas", persist, err);
    }
  }
  if (!hashes.gas) {
    const sol = await nativeBalance(chainId, userAddress);
    if (sol >= 0.002) {
      hashes.gas = "skipped";
      await persist(hashes, "gas");
    } else {
      const signed = await signSolanaNative({
        toAddress: userAddress,
        sol: 0.005,
      });
      hashes.gas = signed.hash;
      hashes.gasRaw = signed.raw;
      await persist(hashes, "gas");
      await broadcastSolana(signed.raw);
      await waitSolana(signed.hash);
    }
  }

  if (hashes.ata) {
    try {
      await confirmOrReplay(chainId, hashes.ata, hashes.ataRaw);
      return hashes;
    } catch (err) {
      await dropDeadRaw(hashes, "ata", persist, err);
    }
  }
  const ata = await signSolanaAta({ ownerAddress: userAddress });
  hashes.ata = ata.hash;
  if (ata.raw) hashes.ataRaw = ata.raw;
  await persist(hashes, "ata");
  if (ata.hash !== "skipped") {
    await broadcastSolana(ata.raw);
    await waitSolana(ata.hash);
  }
  return hashes;
}

export async function sendToken({
  chainId,
  fromKey,
  toAddress,
  amount,
  hashes,
  hashKey,
  persist,
}) {
  const rawKey = `${hashKey}Raw`;
  if (hashes[hashKey]) {
    try {
      await confirmOrReplay(chainId, hashes[hashKey], hashes[rawKey]);
      return hashes;
    } catch (err) {
      await dropDeadRaw(hashes, hashKey, persist, err);
    }
  }
  const chain = chainOf(chainId);
  const fromEscrow = fromKey === escrowKeyFor(chainId);
  const signed =
    chain.kind === "evm"
      ? await signEvmTransfer({
          chainId,
          privateKey: fromKey,
          to: toAddress,
          amount,
          minNonce: fromEscrow ? nextEscrowNonce(hashes) : 0,
        })
      : await signSolanaTransfer({
          fromKey,
          toAddress,
          amount,
        });
  hashes[hashKey] = signed.hash;
  hashes[rawKey] = signed.raw;
  if (chain.kind === "evm" && fromEscrow) {
    hashes[`${hashKey}Nonce`] = signed.nonce;
  }
  await persist(hashes, hashKey);
  await broadcastSigned(chainId, signed.raw);
  if (chain.kind === "evm") await waitEvm(chainId, signed.hash);
  else await waitSolana(signed.hash);
  return hashes;
}

export async function testSignUser(chainId, keys) {
  const chain = chainOf(chainId);
  try {
    if (chain.kind === "evm") {
      await testSignEvm(keys.evmPrivateKey);
      return;
    }
    const pair = solanaKeypair(keys.solanaPrivateKey);
    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: pair.publicKey,
        toPubkey: pair.publicKey,
        lamports: 0,
      })
    );
    tx.recentBlockhash = "11111111111111111111111111111111";
    tx.feePayer = pair.publicKey;
    tx.sign(pair);
    if (!tx.signature) throw new Error("solana test-sign empty");
  } catch (err) {
    throw new Error(`test-sign failed: ${safeError(err)}`);
  }
}

export function userAddressFor(chainId, keys) {
  return chainOf(chainId).kind === "evm" ? keys.evmAddress : keys.solanaAddress;
}

export function userKeyFor(chainId, keys) {
  return chainOf(chainId).kind === "evm"
    ? keys.evmPrivateKey
    : keys.solanaPrivateKey;
}

export function escrowKeyFor(chainId) {
  return chainOf(chainId).kind === "evm"
    ? process.env.ESCROW_KEY_EVM
    : process.env.ESCROW_KEY_SOLANA;
}

export function escrowAddressFor(chainId) {
  return chainOf(chainId).escrow;
}

export { CHAINS, EVM_ESCROW, SOLANA_ESCROW };

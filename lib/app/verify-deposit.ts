import {
  EVM_DEPOSIT_ADDRESS,
  SOLANA_DEPOSIT_ADDRESS,
} from "@/lib/app/payments";

/**
 * Server-only on-chain check that a deposit tx actually paid the escrow.
 * Solana goes through Helius when HELIUS_RPC_URL is set, otherwise the
 * public mainnet RPC. Base goes through BASE_RPC_URL or the public one.
 */

const USDC_SOLANA_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const USDC_BASE_CONTRACT = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
// Global Dollar on Robinhood Chain. Only this contract counts: the chain also
// hosts a ticker squatter named USDG.
const USDG_ROBINHOOD_CONTRACT = "0x5fc5360d0400a0fd4f2af552add042d716f1d168";
const ERC20_TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

export type DepositCheck =
  | { ok: true; verified: boolean }
  | { ok: false; error: string };

function solanaRpcUrl() {
  return process.env.HELIUS_RPC_URL || "https://api.mainnet-beta.solana.com";
}

function baseRpcUrl() {
  return process.env.BASE_RPC_URL || "https://mainnet.base.org";
}

function robinhoodRpcUrl() {
  return (
    process.env.ROBINHOOD_RPC_URL || "https://rpc.mainnet.chain.robinhood.com"
  );
}

function solanaDepositAddress() {
  return process.env.SOLANA_DEPOSIT_ADDRESS || SOLANA_DEPOSIT_ADDRESS;
}

async function rpc<T>(url: string, method: string, params: unknown[]) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`RPC ${response.status}`);
  const data = (await response.json()) as { result?: T; error?: unknown };
  if (data.error) throw new Error(JSON.stringify(data.error));
  return data.result ?? null;
}

type SolanaTokenBalance = {
  mint: string;
  owner?: string;
  uiTokenAmount?: { uiAmount: number | null };
};

type SolanaTransaction = {
  meta: {
    err: unknown;
    preTokenBalances?: SolanaTokenBalance[];
    postTokenBalances?: SolanaTokenBalance[];
  } | null;
};

async function verifySolanaUsdc(
  hash: string,
  amountUsdc: number
): Promise<DepositCheck> {
  const tx = await rpc<SolanaTransaction>(solanaRpcUrl(), "getTransaction", [
    hash,
    {
      encoding: "jsonParsed",
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    },
  ]);

  if (!tx || !tx.meta) {
    return {
      ok: false,
      error:
        "Transaction not found on Solana yet. Wait for confirmation and paste it again.",
    };
  }
  if (tx.meta.err) {
    return { ok: false, error: "That Solana transaction failed on chain." };
  }

  const deposit = solanaDepositAddress();
  const sum = (balances: SolanaTokenBalance[] | undefined) =>
    (balances ?? [])
      .filter(
        (balance) =>
          balance.mint === USDC_SOLANA_MINT && balance.owner === deposit
      )
      .reduce(
        (total, balance) => total + (balance.uiTokenAmount?.uiAmount ?? 0),
        0
      );

  const received = sum(tx.meta.postTokenBalances) - sum(tx.meta.preTokenBalances);

  if (received <= 0) {
    return {
      ok: false,
      error: "That transaction did not send USDC to the Utopia Solana escrow.",
    };
  }
  if (received + 0.01 < amountUsdc) {
    return {
      ok: false,
      error: `That transaction sent ${received.toFixed(2)} USDC but the bounty needs ${amountUsdc}.`,
    };
  }
  return { ok: true, verified: true };
}

type EvmReceipt = {
  status: string;
  logs: Array<{ address: string; topics: string[]; data: string }>;
};

async function verifyEvmToken(options: {
  rpcUrl: string;
  chainName: string;
  tokenContract: string;
  tokenSymbol: string;
  hash: string;
  amount: number;
}): Promise<DepositCheck> {
  const receipt = await rpc<EvmReceipt>(
    options.rpcUrl,
    "eth_getTransactionReceipt",
    [options.hash]
  );

  if (!receipt) {
    return {
      ok: false,
      error: `Transaction not found on ${options.chainName} yet. Wait for confirmation and paste it again.`,
    };
  }
  if (receipt.status !== "0x1") {
    return { ok: false, error: "That transaction reverted on chain." };
  }

  const escrow = EVM_DEPOSIT_ADDRESS.toLowerCase().slice(2);
  const received = receipt.logs
    .filter(
      (log) =>
        log.topics[0] === ERC20_TRANSFER_TOPIC &&
        log.topics[2]?.toLowerCase().endsWith(escrow) &&
        log.address.toLowerCase() === options.tokenContract
    )
    .reduce((total, log) => total + Number(BigInt(log.data)) / 1e6, 0);

  if (received <= 0) {
    return {
      ok: false,
      error: `That transaction did not send ${options.tokenSymbol} to the Utopia escrow wallet.`,
    };
  }
  if (received + 0.01 < options.amount) {
    return {
      ok: false,
      error: `That transaction sent ${received.toFixed(2)} ${options.tokenSymbol} but the bounty needs ${options.amount}.`,
    };
  }
  return { ok: true, verified: true };
}

export async function verifyDeposit(
  networkId: string,
  hash: string,
  amountUsdc: number
): Promise<DepositCheck> {
  try {
    if (networkId === "usdc-solana") {
      return await verifySolanaUsdc(hash, amountUsdc);
    }
    if (networkId === "usdc-base") {
      return await verifyEvmToken({
        rpcUrl: baseRpcUrl(),
        chainName: "Base",
        tokenContract: USDC_BASE_CONTRACT,
        tokenSymbol: "USDC",
        hash,
        amount: amountUsdc,
      });
    }
    if (networkId === "usdg-robinhood") {
      return await verifyEvmToken({
        rpcUrl: robinhoodRpcUrl(),
        chainName: "Robinhood Chain",
        tokenContract: USDG_ROBINHOOD_CONTRACT,
        tokenSymbol: "USDG",
        hash,
        amount: amountUsdc,
      });
    }
    return { ok: false, error: "Unknown deposit network." };
  } catch {
    return {
      ok: false,
      error:
        "Could not reach the chain to verify the deposit. Try again in a moment.",
    };
  }
}

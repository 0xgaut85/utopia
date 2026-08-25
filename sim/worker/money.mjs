export const EVM_ESCROW = "0x8ac4F91442f4Ef4EfDa321d019A0B056fC3BF57E";
export const SOLANA_ESCROW = "DXszVtcKYSwi1hkMWCp8S2YmAN7UACau8sSHnaSbof8w";

export const USDC_BASE = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913";
export const USDG_ROBINHOOD = "0x5fc5360d0400a0fd4f2af552add042d716f1d168";
export const USDC_SOLANA = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

export const TOKEN_DECIMALS = 6;
export const PLATFORM_FEE_RATE = 0.1;

export const CHAINS = {
  "usdc-base": {
    id: "usdc-base",
    kind: "evm",
    chainId: 8453,
    token: USDC_BASE,
    escrow: EVM_ESCROW,
    maxPrice: 100000,
  },
  "usdg-robinhood": {
    id: "usdg-robinhood",
    kind: "evm",
    chainId: 4663,
    token: USDG_ROBINHOOD,
    escrow: EVM_ESCROW,
    maxPrice: 100,
  },
  "usdc-solana": {
    id: "usdc-solana",
    kind: "solana",
    token: USDC_SOLANA,
    escrow: SOLANA_ESCROW,
    maxPrice: 100,
  },
};

export function platformFeeOn(priceUsdc) {
  return Math.round(priceUsdc * PLATFORM_FEE_RATE * 100) / 100;
}

export function bountyDepositTotal(priceUsdc) {
  return Math.round((priceUsdc + platformFeeOn(priceUsdc)) * 100) / 100;
}

export function taskPoints(priceUsdc) {
  return Math.round(priceUsdc * 100);
}

/** Matches lib/app/points.ts. Worker bounties never use kind "user". */
export function creatorPoints(priceUsdc, kind) {
  if (kind !== "user") return 0;
  return Math.round(priceUsdc * 25);
}

export function chainOf(id) {
  const chain = CHAINS[id];
  if (!chain) throw new Error(`unknown chain ${id}`);
  return chain;
}

export function assertBountyChain(bounty) {
  const chain = chainOf(bounty.chain);
  if (bounty.priceUsdc > chain.maxPrice) {
    throw new Error(`${bounty.id} ${bounty.chain} over $${chain.maxPrice}`);
  }
}

export function tokenUnits(amount) {
  return BigInt(Math.round(Number(amount) * 10 ** TOKEN_DECIMALS));
}

export function fromTokenUnits(units) {
  return Number(units) / 10 ** TOKEN_DECIMALS;
}

export function rpcUrl(chainId) {
  if (chainId === "usdc-base") {
    return process.env.BASE_RPC_URL || "https://mainnet.base.org";
  }
  if (chainId === "usdg-robinhood") {
    return (
      process.env.ROBINHOOD_RPC_URL ||
      "https://rpc.mainnet.chain.robinhood.com"
    );
  }
  if (chainId === "usdc-solana") {
    return process.env.HELIUS_RPC_URL || "https://api.mainnet-beta.solana.com";
  }
  throw new Error(`no rpc for ${chainId}`);
}

export function escrowKeysReady() {
  const evm = process.env.ESCROW_KEY_EVM?.trim() || "";
  const sol = process.env.ESCROW_KEY_SOLANA?.trim() || "";
  return evm.startsWith("0x") && evm.length >= 66 && sol.length >= 32;
}

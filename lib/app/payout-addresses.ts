const EVM_ADDRESS = /^0x[a-fA-F0-9]{40}$/;
const SOLANA_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export type PayoutAddresses = {
  payoutSolanaUsdc: string | null;
  payoutUsdcBase: string | null;
  payoutUsdgRobinhood: string | null;
};

export function normalizeAddress(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim();
}

export function isValidEvmAddress(value: string) {
  return EVM_ADDRESS.test(value);
}

export function isValidSolanaAddress(value: string) {
  return SOLANA_ADDRESS.test(value);
}

export function payoutFieldFor(network: string | null) {
  if (network === "usdc-solana") return "payoutSolanaUsdc" as const;
  if (network === "usdc-base") return "payoutUsdcBase" as const;
  if (network === "usdg-robinhood") return "payoutUsdgRobinhood" as const;
  return null;
}

export function payoutAddressFor(
  network: string | null,
  user: Partial<PayoutAddresses> | null | undefined
) {
  const field = payoutFieldFor(network);
  if (!field || !user) return null;
  const value = user[field];
  if (typeof value !== "string" || !value.trim()) return null;
  const address = value.trim();
  if (network === "usdc-solana") {
    return isValidSolanaAddress(address) ? address : null;
  }
  return isValidEvmAddress(address) ? address : null;
}

export function samePayoutAddress(
  network: string | null,
  left: string,
  right: string
) {
  if (!left || !right) return false;
  if (network === "usdc-solana") return left === right;
  return left.toLowerCase() === right.toLowerCase();
}

export function payoutNetworkLabel(network: string | null) {
  if (network === "usdc-solana") return "USDC on Solana";
  if (network === "usdc-base") return "USDC on Base";
  if (network === "usdg-robinhood") return "USDG on Robinhood Chain";
  return "this network";
}

export function parsePayoutAddresses(body: {
  payoutSolanaUsdc?: unknown;
  payoutUsdcBase?: unknown;
  payoutUsdgRobinhood?: unknown;
}): { ok: true; data: PayoutAddresses } | { ok: false; error: string } {
  const solana = normalizeAddress(body.payoutSolanaUsdc);
  const base = normalizeAddress(body.payoutUsdcBase);
  const robinhood = normalizeAddress(body.payoutUsdgRobinhood);

  if (solana && !isValidSolanaAddress(solana)) {
    return { ok: false, error: "Solana USDC address does not look valid." };
  }
  if (base && !isValidEvmAddress(base)) {
    return { ok: false, error: "USDC Base address does not look valid." };
  }
  if (robinhood && !isValidEvmAddress(robinhood)) {
    return { ok: false, error: "USDG Robinhood address does not look valid." };
  }

  return {
    ok: true,
    data: {
      payoutSolanaUsdc: solana || null,
      payoutUsdcBase: base || null,
      payoutUsdgRobinhood: robinhood || null,
    },
  };
}

export const EVM_DEPOSIT_ADDRESS =
  "0x8ac4F91442f4Ef4EfDa321d019A0B056fC3BF57E";
export const SOLANA_DEPOSIT_ADDRESS =
  "DXszVtcKYSwi1hkMWCp8S2YmAN7UACau8sSHnaSbof8w";

export const DEPOSIT_NETWORKS = [
  {
    id: "usdc-solana",
    token: "USDC",
    network: "Solana",
    depositAddress: SOLANA_DEPOSIT_ADDRESS,
    txUrl: (hash: string) => `https://solscan.io/tx/${hash}`,
    addressUrl: (address: string) => `https://solscan.io/account/${address}`,
  },
  {
    id: "usdc-base",
    token: "USDC",
    network: "Base",
    depositAddress: EVM_DEPOSIT_ADDRESS,
    txUrl: (hash: string) => `https://basescan.org/tx/${hash}`,
    addressUrl: (address: string) => `https://basescan.org/address/${address}`,
  },
  {
    id: "usdg-robinhood",
    token: "USDG",
    network: "Robinhood",
    depositAddress: EVM_DEPOSIT_ADDRESS,
    txUrl: (hash: string) => `https://robinhoodchain.blockscout.com/tx/${hash}`,
    addressUrl: (address: string) =>
      `https://robinhoodchain.blockscout.com/address/${address}`,
  },
] as const;

export type DepositNetworkId = (typeof DEPOSIT_NETWORKS)[number]["id"];

export function depositAddressFor(id: DepositNetworkId | string) {
  return (
    DEPOSIT_NETWORKS.find((network) => network.id === id)?.depositAddress ??
    EVM_DEPOSIT_ADDRESS
  );
}

const EVM_TX = /^0x[a-fA-F0-9]{64}$/;
const SOLANA_TX = /^[1-9A-HJ-NP-Za-km-z]{32,88}$/;

export function normalizeTxHash(value: string) {
  return value.trim();
}

export function isValidTxHash(value: string) {
  const hash = normalizeTxHash(value);
  return EVM_TX.test(hash) || SOLANA_TX.test(hash);
}

/** Platform fee the buyer pays on top of the reward, per the docs. */
export const PLATFORM_FEE_RATE = 0.1;

/** 10% commission taken at bounty creation. */
export function platformFeeOn(priceUsdc: number) {
  return Math.round(priceUsdc * PLATFORM_FEE_RATE * 100) / 100;
}

/** What the buyer must actually deposit: reward plus the platform fee. */
export function bountyDepositTotal(priceUsdc: number) {
  return Math.round((priceUsdc + platformFeeOn(priceUsdc)) * 100) / 100;
}

export function shortTxHash(hash: string) {
  if (hash.length <= 12) return hash;
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
}

function networkById(id: string | null) {
  return DEPOSIT_NETWORKS.find((network) => network.id === id) ?? null;
}

/**
 * The funding transaction: the on-chain transfer of USDC/USDG to the Utopia
 * escrow that created this bounty. Falls back to the escrow wallet only for
 * legacy bounties recorded before deposits were verified.
 */
export function bountyProof(task: {
  depositNetwork: string | null;
  depositTxHash: string | null;
}) {
  const network = networkById(task.depositNetwork) ?? DEPOSIT_NETWORKS[1];
  const hash = task.depositTxHash ? normalizeTxHash(task.depositTxHash) : null;

  if (hash) {
    return {
      href: network.txUrl(hash),
      label: "Funding tx",
      detail: shortTxHash(hash),
    };
  }

  return {
    href: network.addressUrl(network.depositAddress),
    label: "Escrow",
    detail: shortTxHash(network.depositAddress),
  };
}

export function payoutProof(task: {
  depositNetwork: string | null;
  payoutTxHash: string | null;
}) {
  const network = networkById(task.depositNetwork) ?? DEPOSIT_NETWORKS[1];
  const hash = task.payoutTxHash ? normalizeTxHash(task.payoutTxHash) : null;
  if (!hash) return null;
  return {
    href: network.txUrl(hash),
    label: "Payout tx",
    detail: shortTxHash(hash),
  };
}

export function payoutHashFromJob(hashes: unknown) {
  if (!hashes || typeof hashes !== "object") return null;
  const row = hashes as { payout?: unknown; payoutTx?: unknown };
  const value =
    typeof row.payout === "string"
      ? row.payout
      : typeof row.payoutTx === "string"
        ? row.payoutTx
        : null;
  return value && isValidTxHash(value) ? normalizeTxHash(value) : null;
}

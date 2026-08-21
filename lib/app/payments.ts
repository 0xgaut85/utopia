export const DEPOSIT_ADDRESS = "0x8ac4F91442f4Ef4EfDa321d019A0B056fC3BF57E";

export const DEPOSIT_NETWORKS = [
  {
    id: "usdc-solana",
    token: "USDC",
    network: "Solana",
    txUrl: (hash: string) => `https://solscan.io/tx/${hash}`,
    addressUrl: (address: string) => `https://solscan.io/account/${address}`,
  },
  {
    id: "usdc-base",
    token: "USDC",
    network: "Base",
    txUrl: (hash: string) => `https://basescan.org/tx/${hash}`,
    addressUrl: (address: string) => `https://basescan.org/address/${address}`,
  },
  {
    id: "usdg-robinhood",
    token: "USDG",
    network: "Robinhood",
    txUrl: (hash: string) => `https://basescan.org/tx/${hash}`,
    addressUrl: (address: string) => `https://basescan.org/address/${address}`,
  },
] as const;

export type DepositNetworkId = (typeof DEPOSIT_NETWORKS)[number]["id"];

const EVM_TX = /^0x[a-fA-F0-9]{64}$/;
const SOLANA_TX = /^[1-9A-HJ-NP-Za-km-z]{32,88}$/;

export function normalizeTxHash(value: string) {
  return value.trim();
}

export function isValidTxHash(value: string) {
  const hash = normalizeTxHash(value);
  return EVM_TX.test(hash) || SOLANA_TX.test(hash);
}

export function shortTxHash(hash: string) {
  if (hash.length <= 12) return hash;
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
}

function networkById(id: string | null) {
  return DEPOSIT_NETWORKS.find((network) => network.id === id) ?? null;
}

/**
 * Prefer the recorded transaction. If a bounty was posted before we stored
 * hashes, fall back to the escrow address so the wallet is still public.
 */
export function bountyProof(task: {
  depositNetwork: string | null;
  depositTxHash: string | null;
}) {
  const network = networkById(task.depositNetwork) ?? DEPOSIT_NETWORKS[1];
  const hash = task.depositTxHash ? normalizeTxHash(task.depositTxHash) : null;

  if (hash) {
    const evm = EVM_TX.test(hash);
    const href =
      evm && task.depositNetwork === "usdc-solana"
        ? `https://basescan.org/tx/${hash}`
        : network.txUrl(hash);

    return {
      href,
      label: "Proof",
      detail: shortTxHash(hash),
    };
  }

  return {
    href: network.addressUrl(DEPOSIT_ADDRESS),
    label: "Escrow",
    detail: shortTxHash(DEPOSIT_ADDRESS),
  };
}

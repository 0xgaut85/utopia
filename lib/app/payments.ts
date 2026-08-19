export const DEPOSIT_ADDRESS = "0x8ac4F91442f4Ef4EfDa321d019A0B056fC3BF57E";

export const DEPOSIT_NETWORKS = [
  { id: "usdc-solana", token: "USDC", network: "Solana" },
  { id: "usdc-base", token: "USDC", network: "Base" },
  { id: "usdg-robinhood", token: "USDG", network: "Robinhood" },
] as const;

export type DepositNetworkId = (typeof DEPOSIT_NETWORKS)[number]["id"];

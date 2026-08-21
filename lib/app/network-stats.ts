/**
 * Temporary marketplace headline figures while the live pool is still small.
 * Open bounties sit in the $1–$20 band at a $12 average: 965 × 12 = 11,580.
 * 43 bounties are already settled, so the open count sits a bit under the total.
 */
export const NETWORK_STATS = {
  usdcOnOffer: 11580,
  openBounties: 965,
  totalBounties: 1008,
  settledBounties: 43,
  totalVolume: 12096,
} as const;

export const POINTS_PER_USDC = 100;
export const CREATOR_POINTS_PER_USDC = 25;

export function taskPoints(priceUsdc: number) {
  return Math.round(priceUsdc * POINTS_PER_USDC);
}

/** Points a buyer earns for posting and funding a bounty. */
export function creatorPoints(priceUsdc: number) {
  return Math.round(priceUsdc * CREATOR_POINTS_PER_USDC);
}

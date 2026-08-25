export const POINTS_PER_USDC = 100;
export const CREATOR_POINTS_PER_USDC = 25;

export function taskPoints(priceUsdc: number) {
  return Math.round(priceUsdc * POINTS_PER_USDC);
}

/** Points a buyer earns for posting as themselves. Other kinds stay at 0. */
export function creatorPoints(priceUsdc: number, kind?: string | null) {
  if (kind !== "user") return 0;
  return Math.round(priceUsdc * CREATOR_POINTS_PER_USDC);
}

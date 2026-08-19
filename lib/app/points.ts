export const POINTS_PER_USDC = 100;

export function taskPoints(priceUsdc: number) {
  return Math.round(priceUsdc * POINTS_PER_USDC);
}

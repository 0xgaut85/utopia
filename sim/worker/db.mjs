import { PrismaClient } from "@prisma/client";
import { PrismaClient as WalletClient } from "../../node_modules/.prisma/sim-wallet-client/index.js";

export const app = new PrismaClient();
export const wallets = new WalletClient();

export async function disconnect() {
  await Promise.all([app.$disconnect(), wallets.$disconnect()]);
}

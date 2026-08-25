import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const url = "http://127.0.0.1:8765/recording-screenshot.html";
const out = path.join(root, "public", "utopia-recording-teaser.png");

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 430, height: 932 },
  deviceScaleFactor: 3,
});
await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(2000);
await page.screenshot({ path: out, type: "png" });
await browser.close();

console.log(`Saved ${out}`);

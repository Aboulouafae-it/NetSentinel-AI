import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.NETSENTINEL_APP_URL || 'http://localhost:3001';
const outDir = path.join(process.cwd(), 'docs/pdf/assets');
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1500 }, deviceScaleFactor: 1 });

async function capture(route, fileName) {
  await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle', timeout: 45000 });
  await page.screenshot({
    path: path.join(outDir, fileName),
    fullPage: false,
  });
}

await capture('/', 'operations-center-dashboard.png');
await page.goto(`${baseUrl}/field-measurements`, { waitUntil: 'networkidle', timeout: 45000 });
await page.getByRole('button', { name: /New Measurement/i }).click();
await page.screenshot({
  path: path.join(outDir, 'wireless-field-measurements.png'),
  fullPage: false,
});

await browser.close();

console.log(JSON.stringify({
  baseUrl,
  screenshots: [
    path.join(outDir, 'operations-center-dashboard.png'),
    path.join(outDir, 'wireless-field-measurements.png'),
  ],
}, null, 2));

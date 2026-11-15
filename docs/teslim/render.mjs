// Renders docs/teslim/teslim.html to docs/Solbound_LoversGG.pdf (A4). Run from the repo root: node docs/teslim/render.mjs
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const dir = path.dirname(fileURLToPath(import.meta.url));
const b = await chromium.launch();
const p = await b.newPage();
await p.goto('file://' + path.join(dir, 'teslim.html'), { waitUntil: 'networkidle' });
await p.evaluate(() => document.fonts.ready);
await p.pdf({ path: path.join(dir, '..', 'Solbound_LoversGG.pdf'), format: 'A4', printBackground: true, preferCSSPageSize: true });
await b.close();

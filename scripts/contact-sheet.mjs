// Combine screenshots into one grid image: node scripts/contact-sheet.mjs <dir> <out.png> [cols]
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';
const [dir, out, cols = '4'] = process.argv.slice(2);
const files = readdirSync(dir).filter((f) => f.endsWith('.png')).sort();
const cells = files.map((f) => `<figure><img src="data:image/png;base64,${readFileSync(join(dir, f)).toString('base64')}"><figcaption>${f}</figcaption></figure>`).join('');
const html = `<style>body{margin:0;background:#111;color:#eee;font:14px sans-serif;display:grid;grid-template-columns:repeat(${cols},1fr);gap:4px}figure{margin:0}img{width:100%;display:block}figcaption{padding:2px 4px}</style>${cells}`;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
await p.setContent(html);
await p.screenshot({ path: out, fullPage: true });
await b.close();
console.log(`${files.length} images → ${out}`);

// Renders scripts/og/og.html to public/og.png (needs: npm i -D playwright && npx playwright install chromium).
import { chromium } from "playwright";
import { fileURLToPath, pathToFileURL } from "node:url";
const html = fileURLToPath(new URL("./og.html", import.meta.url));
const out = fileURLToPath(new URL("../../public/og.png", import.meta.url));
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await p.goto(pathToFileURL(html).href);
await p.evaluate(() => document.fonts.ready);
await p.screenshot({ path: out });
await b.close();
console.log("public/og.png written");

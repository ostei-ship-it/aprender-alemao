// Gera os PNGs do ícone a partir de icons/icone.svg (usa o Chromium do Playwright).
// Uso: node scripts/gerar-icones.mjs   — só é preciso rodar de novo se o SVG mudar.
import { readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require("playwright")); } catch { ({ chromium } = require("/opt/node22/lib/node_modules/playwright")); }

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const svg = await readFile(join(RAIZ, "icons/icone.svg"), "utf8");
const navegador = await chromium.launch();
for (const tamanho of [192, 512, 180]) {
  const page = await navegador.newPage({ viewport: { width: tamanho, height: tamanho } });
  await page.setContent(`<style>html,body{margin:0}svg{display:block;width:${tamanho}px;height:${tamanho}px}</style>${svg}`);
  const nome = tamanho === 180 ? "apple-touch-icon.png" : `icone-${tamanho}.png`;
  await page.screenshot({ path: join(RAIZ, "icons", nome), omitBackground: false });
  console.log("icons/" + nome);
}
await navegador.close();

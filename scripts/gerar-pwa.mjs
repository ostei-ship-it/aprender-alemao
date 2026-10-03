// Atualiza a lista de arquivos e a versão do cache offline em sw.js.
// Rode sempre que mudar qualquer arquivo do app (dados, JS, CSS):
//   node scripts/gerar-pwa.mjs              → reescreve sw.js
//   node scripts/gerar-pwa.mjs --verificar  → só confere (falha se sw.js estiver desatualizado)
import { readFile, writeFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join, dirname, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const FORA = new Set(["scripts", "README.md", "sw.js", ".gitignore"]);

async function listar(dir) {
  const saida = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const caminho = join(dir, e.name);
    const rel = relative(RAIZ, caminho).split(sep).join("/");
    if (FORA.has(rel) || e.name.startsWith(".")) continue;
    if (e.isDirectory()) saida.push(...(await listar(caminho)));
    else saida.push(rel);
  }
  return saida;
}

const arquivos = (await listar(RAIZ)).sort();
const hash = createHash("sha256");
for (const a of arquivos) hash.update(a).update(await readFile(join(RAIZ, a)));
const versao = hash.digest("hex").slice(0, 12);

const bloco = `// ---- início do bloco gerado ----
const VERSAO = "${versao}";
const ARQUIVOS = [
  "./",
${arquivos.map((a) => `  "./${a}",`).join("\n")}
];
// ---- fim do bloco gerado ----`;

const swPath = join(RAIZ, "sw.js");
const sw = await readFile(swPath, "utf8");
const novo = sw.replace(/\/\/ ---- início do bloco gerado ----[\s\S]*?\/\/ ---- fim do bloco gerado ----/, bloco);
if (process.argv.includes("--verificar")) {
  if (novo !== sw) {
    console.error("✗ sw.js desatualizado: rode  node scripts/gerar-pwa.mjs");
    process.exit(1);
  }
  console.log(`OK: cache offline em dia (versão ${versao}, ${arquivos.length + 1} entradas).`);
} else {
  await writeFile(swPath, novo);
  console.log(`sw.js atualizado: versão ${versao}, ${arquivos.length + 1} entradas.`);
}

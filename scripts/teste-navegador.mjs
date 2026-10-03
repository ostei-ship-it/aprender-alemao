// Teste de fumaça no navegador (Playwright + Chromium):
// sobe um servidor estático, abre cada seção, verifica erros de console e
// exercita os fluxos principais com a Web Speech API "espionada"/simulada.
// Uso: node scripts/teste-navegador.mjs   (requer o pacote playwright)
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  ({ chromium } = require("/opt/node22/lib/node_modules/playwright"));
}

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const TIPOS = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".webmanifest": "application/manifest+json", ".png": "image/png", ".svg": "image/svg+xml" };
const servidor = createServer(async (req, res) => {
  let caminho = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (caminho.endsWith("/")) caminho += "index.html";
  try {
    let corpo = await readFile(join(RAIZ, caminho));
    // Simula a publicação de uma versão nova do app (teste de atualização do PWA).
    if (caminho === "/sw.js" && globalThis.__versaoNova) corpo = corpo.toString().replace(/const VERSAO = "[^"]*"/, `const VERSAO = "${globalThis.__versaoNova}"`);
    res.writeHead(200, { "content-type": (TIPOS[extname(caminho)] || "application/octet-stream") + "; charset=utf-8" });
    res.end(corpo);
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((r) => servidor.listen(0, r));
const URL_BASE = `http://localhost:${servidor.address().port}/`;

// Espiona a síntese e simula o reconhecimento de fala (o headless não tem microfone).
const SIMULACAO = () => {
  window.__falas = [];
  window.__proximaFala = null; // texto que o "reconhecedor" vai devolver
  const voz = { name: "Teste Deutsch", lang: "de-DE", voiceURI: "teste-de", localService: true, default: false };
  const synth = {
    speaking: false,
    getVoices: () => [voz],
    speak(u) {
      window.__falas.push({ texto: u.text, lang: u.lang, rate: u.rate, voz: u.voice?.lang });
      setTimeout(() => u.onend?.(), 5);
    },
    cancel() {},
    addEventListener() {},
  };
  Object.defineProperty(window, "speechSynthesis", { value: synth });
  window.SpeechSynthesisUtterance = function (t) { this.text = t; };
  window.SpeechRecognition = window.webkitSpeechRecognition = function () {
    this.start = () => {
      window.__ultimoReconhecimento = { lang: this.lang };
      setTimeout(() => {
        this.onstart?.();
        const texto = window.__proximaFala ?? "";
        const alt = { transcript: texto, confidence: 0.9 };
        const res = [alt];
        this.onresult?.({ results: [res] });
        this.onend?.();
      }, 10);
    };
    this.abort = () => {};
  };
};

const erros = [];
const falhas = [];
const ok = (cond, msg) => { if (!cond) falhas.push(msg); else console.log("  ✓ " + msg); };

const navegador = await chromium.launch();
const ctx = await navegador.newContext({ viewport: { width: 390, height: 844 } });
await ctx.addInitScript(SIMULACAO);
const page = await ctx.newPage();
page.on("console", (m) => { if (m.type() === "error") erros.push(`console: ${m.text()}`); });
page.on("pageerror", (e) => erros.push(`pageerror: ${e.message}`));
page.on("dialog", (d) => d.accept());

async function ir(rota) {
  const destino = `${URL_BASE}#/${rota}`;
  if (page.url() === destino) await page.reload();
  else await page.goto(destino);
  await page.waitForSelector("#conteudo h2", { timeout: 5000 });
}
const falas = () => page.evaluate(() => window.__falas);
const limparFalas = () => page.evaluate(() => (window.__falas = []));

try {
  const rotas = await (async () => {
    await page.goto(`${URL_BASE}#/vocabulario`);
    await page.waitForSelector("#nav a");
    return page.$$eval("#nav a", (as) => as.map((a) => a.dataset.rota));
  })();

  console.log("Seções:");
  for (const r of rotas) {
    if (!existsSync(join(RAIZ, `js/modos/${r}.js`))) {
      console.log(`  - #/${r} ainda não implementada (pulada)`);
      continue;
    }
    await ir(r);
    const titulo = await page.textContent("#conteudo h2");
    const erroSecao = await page.$("#conteudo .fb-erro");
    ok(!erroSecao, `#/${r} abre sem erro ("${titulo}")`);
    const largura = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
    ok(largura, `#/${r} sem rolagem horizontal em 390px`);
  }

  console.log("Vocabulário:");
  await ir("vocabulario");
  const nItens = await page.$$eval(".vocab-item", (x) => x.length);
  ok(nItens >= 300, `lista mostra ${nItens} palavras`);
  const corDer = await page.$eval(".art-der", (e) => getComputedStyle(e).color);
  const corDie = await page.$eval(".art-die", (e) => getComputedStyle(e).color);
  const corDas = await page.$eval(".art-das", (e) => getComputedStyle(e).color);
  ok(corDer !== corDie && corDie !== corDas && corDer !== corDas, `artigos com cores distintas (${corDer} / ${corDie} / ${corDas})`);
  await limparFalas();
  await page.click(".vocab-item .btn-audio[title='Ouvir']");
  await page.click(".vocab-item .btn-audio[title='Ouvir devagar']");
  const f = await falas();
  ok(f.length === 2 && f.every((x) => x.lang === "de-DE" && x.voz === "de-DE"), "áudio usa lang/voz de-DE");
  ok(f[1].rate < f[0].rate, `velocidade lenta (${f[1].rate}) menor que a normal (${f[0].rate})`);

  console.log("Lições (aprender palavras novas):");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await ir("licoes");
  ok(/Primeiras palavras/.test(await page.textContent(".btn-primario.largo")), "Lições: botão principal leva à Lição 1 (Primeiras palavras)");
  await page.click(".btn-primario.largo");
  await page.waitForSelector(".licao-instrucao");
  ok((await page.textContent(".licao-instrucao")) === "Palavra nova", "a lição começa apresentando uma palavra nova");
  ok((await page.textContent(".licao-intro-palavra .palavra-de")) === "Hallo" && (await page.textContent(".imagem-grande")) === "👋", "apresenta Hallo com figura 👋");
  ok((await page.textContent(".licao-intro-palavra .soa-como")).includes("ha-LÔ"), "mostra como soa em português (ha-LÔ)");
  const { fazerLicao } = await import("./aluno-automatico.mjs");
  const log = await fazerLicao(page, { errarUmaVez: true });
  const repeticoes = Object.entries(log.tipos).map(([k, v]) => `${k}: ${v}`).join(" · ");
  ok(log.passos >= 6 * 4, `cada palavra aparece várias vezes (${log.passos} passos para 6 palavras — ${repeticoes})`);
  ok(Object.keys(log.tipos).length >= 4, "exercícios variados (figura, ouvir, traduzir, pares, digitar/falar)");
  ok(log.errou, `palavra errada de propósito: "${log.errou}"`);
  ok(/Lição concluída: Primeiras palavras/.test(await page.textContent(".licao-fim")), "tela de conclusão da lição");
  ok(/errou 1×/.test(await page.textContent(".licao-fim")), "a palavra errada voltou no fim e aparece marcada no resumo");
  const salvo = await page.evaluate(() => JSON.parse(localStorage.getItem("aprender-alemao:progresso:" + JSON.parse(localStorage.getItem("aprender-alemao:perfis")).ativo)));
  const cards = Object.values(salvo.cards);
  ok(cards.length === 6, "ao concluir, as 6 palavras entram nas revisões (SM-2)");
  ok(cards.every((c) => c.intervalo === 1), "SM-2: primeira revisão amanhã");
  ok(Object.values(salvo.historico)[0].novas === 6, "histórico conta 6 palavras novas hoje");

  console.log("Revisar (flashcards):");
  await ir("flashcards");
  await page.waitForSelector(".cartao-fim");
  ok(/Nada para revisar agora/.test(await page.textContent(".cartao-fim")) && (await page.$('.cartao-fim a[href="#/licoes"]')), "sem revisões vencidas: indica as Lições para palavras novas");
  // Simula o dia seguinte: as revisões vencem hoje.
  await page.evaluate(() => {
    const k = "aprender-alemao:progresso:" + JSON.parse(localStorage.getItem("aprender-alemao:perfis")).ativo;
    const e = JSON.parse(localStorage.getItem(k));
    const ontem = new Date(Date.now() - 86400000);
    const iso = `${ontem.getFullYear()}-${String(ontem.getMonth() + 1).padStart(2, "0")}-${String(ontem.getDate()).padStart(2, "0")}`;
    for (const c of Object.values(e.cards)) c.vencimento = iso;
    localStorage.setItem(k, JSON.stringify(e));
  });
  await page.reload();
  await page.waitForSelector(".flash-card");
  const status = await page.textContent(".flash-status");
  ok(/6 na fila/.test(status) && /revisão/.test(status), `no dia seguinte, as 6 palavras voltam para revisar (${status.trim()})`);
  ok(await page.$(".flash-frente .soa-como"), "revisão mostra o \"soa como\"");
  await page.keyboard.press(" ");
  await page.waitForSelector(".botoes-sm2");
  ok(await page.$(".flash-card .exemplo"), "verso mostra frase de exemplo");
  await page.click(".btn-bom");
  await page.keyboard.press(" ");
  await page.click(".btn-errei");
  const status2 = await page.textContent(".flash-status");
  ok(/5 na fila/.test(status2), `card errado volta para o fim da fila (${status2.trim()})`);
  const depois = await page.evaluate(() => Object.values(JSON.parse(localStorage.getItem("aprender-alemao:progresso:" + JSON.parse(localStorage.getItem("aprender-alemao:perfis")).ativo)).cards).map((c) => c.intervalo).sort().join(","));
  ok(/^1,.*6/.test(depois), `SM-2: "bom" na 2ª vez = 6 dias; "errei" = 1 dia (${depois})`);

  // ---- etapas seguintes acrescentam testes abaixo ----
  const extra = await import("./teste-fluxos.mjs").catch((e) => (e.code === "ERR_MODULE_NOT_FOUND" ? null : Promise.reject(e)));
  if (extra) await extra.testar({ page, ir, ok, falas, limparFalas });
} catch (e) {
  falhas.push("exceção: " + e.message);
} finally {
  await navegador.close();
  servidor.close();
}

if (erros.length) console.error("\nErros no console:\n  " + erros.join("\n  "));
if (falhas.length) console.error("\nFalhas:\n  ✗ " + falhas.join("\n  ✗ "));
if (erros.length || falhas.length) process.exit(1);
console.log("\nOK: nenhum erro de console e todos os fluxos passaram.");

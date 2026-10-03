// "Aluno automático" para os testes: faz uma lição inteira lendo cada exercício na tela.
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const index = JSON.parse(readFileSync(join(RAIZ, "data/vocab/index.json"), "utf8"));
const palavras = index.temas.flatMap((t) => JSON.parse(readFileSync(join(RAIZ, "data/vocab", t.arquivo), "utf8")).palavras);
const forma = (p) => (p.classe === "substantivo" ? `${p.artigo} ${p.alemao}` : p.alemao);
const textoDE = (p) => forma(p) + (p.so_plural ? " (só plural)" : "");
const porDE = new Map(palavras.map((p) => [textoDE(p), p]));
const porPT = new Map(palavras.map((p) => [p.portugues, p]));

// Responde todos os exercícios; com errarUmaVez, erra de propósito o 1º "O que significa?".
export async function fazerLicao(page, { errarUmaVez = false } = {}) {
  const log = { passos: 0, tipos: {}, errou: null, totalInicial: null, totalFinal: null };
  let errou = false;
  for (let guarda = 0; guarda < 120; guarda++) {
    await page.waitForSelector(".licao-instrucao, .licao-fim", { timeout: 10000 });
    if (await page.$(".licao-fim")) break;
    const instrucao = (await page.textContent(".licao-instrucao")).trim();
    log.tipos[instrucao] = (log.tipos[instrucao] || 0) + 1;
    log.passos++;
    const btnTexto = async (sel, texto) => {
      for (const b of await page.$$(sel)) if ((await b.textContent()).trim() === texto) return b;
      throw new Error(`opção "${texto}" não encontrada em ${instrucao}`);
    };
    if (instrucao === "Palavra nova") {
      await page.click(".btn-continuar");
      continue;
    } else if (instrucao === "O que significa?") {
      const p = porDE.get((await page.textContent(".licao-pergunta .palavra-de")).trim());
      const ops = await page.$$(".opcoes-grade .opcao");
      if (errarUmaVez && !errou) {
        for (const b of ops) if (!(await b.textContent()).includes(p.portugues)) { await b.click(); break; }
        errou = true;
        log.errou = p.alemao;
      } else {
        for (const b of ops) if ((await b.textContent()).endsWith(p.portugues)) { await b.click(); break; }
      }
    } else if (instrucao === "Toque na palavra que você ouviu") {
      const ultima = await page.evaluate(() => window.__falas.at(-1).texto);
      await (await btnTexto(".opcoes .opcao", textoDE(porDE.get(ultima) || { classe: "", alemao: ultima }))).click();
    } else if (instrucao === "Como se diz em alemão?") {
      const p = porPT.get((await page.textContent(".licao-pergunta .palavra-pt")).trim());
      await (await btnTexto(".opcoes .opcao", textoDE(p))).click();
    } else if (instrucao === "Escreva em alemão") {
      const p = porPT.get((await page.textContent(".licao-pergunta .palavra-pt")).trim());
      await page.fill(".licao input", forma(p));
      await page.keyboard.press("Enter");
    } else if (instrucao === "Fale em alemão") {
      const p = porDE.get((await page.textContent(".licao-pergunta .palavra-de")).trim());
      await page.evaluate((t) => (window.__proximaFala = t), forma(p));
      await page.click(".licao .btn-mic");
    } else if (instrucao === "Ligue os pares") {
      const esquerda = await page.$$(".pares-col:first-child .opcao");
      for (const b of esquerda) {
        const p = porDE.get((await b.textContent()).trim());
        await b.click();
        for (const d of await page.$$(".pares-col:last-child .opcao:not([disabled])")) if ((await d.textContent()).endsWith(p.portugues)) { await d.click(); break; }
      }
    } else throw new Error("exercício desconhecido: " + instrucao);
    await page.waitForSelector(".btn-continuar");
    if (log.passos === 3) log.totalInicial = await page.evaluate(() => document.querySelector(".licao-topo .progresso-barra span").style.width);
    await page.click(".btn-continuar");
  }
  return log;
}

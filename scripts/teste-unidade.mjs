// Testes de unidade das funções puras (SM-2 e comparação de respostas).
// Uso: node scripts/teste-unidade.mjs
import assert from "node:assert/strict";
import { aplicarSM2, cardNovo, somarDias, diferencaDias } from "../js/sm2.js";
import { avaliarDigitado } from "../js/modos/quiz.js";
import { numeroPorExtenso, normalizar, avaliarFala, avaliarEscrita, alinharPalavras } from "../js/comparar.js";

let n = 0;
const t = (nome, fn) => { fn(); n++; console.log("  ✓ " + nome); };

console.log("SM-2:");
t("sequência 'bom' dá 1, 6, 15 dias", () => {
  let c = cardNovo();
  const intervalos = [];
  for (let i = 0; i < 3; i++) { c = aplicarSM2(c, 4, "2026-01-01"); intervalos.push(c.intervalo); }
  assert.deepEqual(intervalos, [1, 6, 15]);
  assert.equal(c.ef, 2.5);
});
t("'errei' zera repetições e volta a 1 dia", () => {
  let c = { ef: 2.5, intervalo: 15, reps: 3, vencimento: null };
  c = aplicarSM2(c, 1, "2026-01-01");
  assert.equal(c.reps, 0);
  assert.equal(c.intervalo, 1);
  assert.equal(c.vencimento, "2026-01-02");
  assert.ok(c.ef < 2.5);
});
t("EF nunca fica abaixo de 1,3", () => {
  let c = cardNovo();
  for (let i = 0; i < 20; i++) c = aplicarSM2(c, 1, "2026-01-01");
  assert.equal(c.ef, 1.3);
});
t("'fácil' aumenta EF", () => assert.equal(aplicarSM2(cardNovo(), 5, "2026-01-01").ef, 2.6));
t("datas atravessam meses/anos", () => {
  assert.equal(somarDias("2026-12-30", 3), "2027-01-02");
  assert.equal(diferencaDias("2026-02-27", "2026-03-01"), 2);
});

console.log("Números por extenso:");
t("0–20 e dezenas", () => {
  assert.equal(numeroPorExtenso(0), "null");
  assert.equal(numeroPorExtenso(1), "eins");
  assert.equal(numeroPorExtenso(16), "sechzehn");
  assert.equal(numeroPorExtenso(17), "siebzehn");
  assert.equal(numeroPorExtenso(30), "dreißig");
});
t("compostos", () => {
  assert.equal(numeroPorExtenso(21), "einundzwanzig");
  assert.equal(numeroPorExtenso(58), "achtundfünfzig");
  assert.equal(numeroPorExtenso(100), "hundert");
  assert.equal(numeroPorExtenso(101), "hunderteins");
  assert.equal(numeroPorExtenso(234), "zweihundertvierunddreißig");
  assert.equal(numeroPorExtenso(1000), "tausend");
  assert.equal(numeroPorExtenso(2021), "zweitausendeinundzwanzig");
  assert.equal(numeroPorExtenso(21000), "einundzwanzigtausend");
});

console.log("Comparação:");
t("normaliza pontuação, aspas e dígitos", () => {
  assert.equal(normalizar("„Ich bin 20 Jahre alt.“"), "ich bin zwanzig jahre alt");
});
t("fala exata = acerto", () => assert.equal(avaliarFala("Ich trinke Wasser.", [{ texto: "ich trinke Wasser" }]).nivel, "acerto"));
t("fala com dígito = acerto", () => assert.equal(avaliarFala("drei", [{ texto: "3" }]).nivel, "acerto"));
t("fala sem o artigo = parcial", () => assert.equal(avaliarFala("der Apfel", [{ texto: "Apfel" }]).nivel, "parcial"));
t("fala diferente = erro", () => assert.equal(avaliarFala("der Bahnhof", [{ texto: "die Katze" }]).nivel, "erro"));
t("usa a melhor alternativa", () => assert.equal(avaliarFala("Tschüss", [{ texto: "Schuss" }, { texto: "tschüss" }]).nivel, "acerto"));
t("alinhamento marca palavras faltando", () => {
  const r = alinharPalavras("Ich gehe nach Hause", "ich gehe Hause");
  assert.deepEqual(r.map((x) => x.ok), [true, true, false, true]);
});
t("escrita: ae/oe/ue/ss aceito com aviso", () => {
  const r = avaliarEscrita("die Tür", "die Tuer");
  assert.equal(r.nivel, "acerto");
  assert.equal(r.notas.length, 1);
});
t("escrita: maiúscula errada é acerto com aviso", () => {
  const r = avaliarEscrita("der Tisch", "der tisch");
  assert.equal(r.nivel, "acerto");
  assert.match(r.notas[0], /maiúscula/);
});
t("escrita: erro de uma letra = parcial", () => assert.equal(avaliarEscrita("die Wohnung", "die Wonung").nivel, "parcial"));
t("escrita: outra palavra = erro", () => assert.equal(avaliarEscrita("das Haus", "der Hund").nivel, "erro"));

console.log("Quiz (digitar):");
const tisch = { alemao: "Tisch", artigo: "der", classe: "substantivo" };
t("artigo + substantivo = acerto", () => assert.equal(avaliarDigitado(tisch, "der Tisch").nivel, "acerto"));
t("sem artigo = parcial", () => assert.match(avaliarDigitado(tisch, "Tisch").titulo, /artigo/));
t("artigo errado = erro com explicação", () => {
  const r = avaliarDigitado(tisch, "die Tisch");
  assert.equal(r.nivel, "erro");
  assert.match(r.titulo, /Artigo errado/);
});
t("verbo digitado", () => assert.equal(avaliarDigitado({ alemao: "gehen", classe: "verbo" }, "gehen").nivel, "acerto"));

console.log(`\nOK: ${n} testes passaram.`);

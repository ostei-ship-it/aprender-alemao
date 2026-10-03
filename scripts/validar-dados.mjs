// Valida os dados do app: JSON bem formado, campos obrigatórios, artigos,
// ids únicos e lista os itens marcados com "revisar": true.
// Uso: node scripts/validar-dados.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const erros = [];
const revisar = [];
const ler = (rel) => {
  try {
    return JSON.parse(readFileSync(join(RAIZ, rel), "utf8"));
  } catch (e) {
    erros.push(`${rel}: JSON inválido (${e.message})`);
    return null;
  }
};

const CLASSES = ["substantivo", "verbo", "adjetivo", "advérbio", "expressão", "numeral", "pronome", "interrogativo", "conjunção", "outro"];
const OBRIGATORIOS = ["id", "alemao", "classe", "portugues", "exemplo", "exemplo_pt", "tema", "nivel"];

// --- vocabulário ---
const index = ler("data/vocab/index.json");
const ids = new Set();
let total = 0;
const porNivel = {};
if (index) {
  const temasVistos = new Set();
  for (const t of index.temas) {
    if (temasVistos.has(`${t.nivel}/${t.id}`)) erros.push(`index: tema repetido ${t.nivel}/${t.id}`);
    temasVistos.add(`${t.nivel}/${t.id}`);
    if (!index.niveis.includes(t.nivel)) erros.push(`index: nível desconhecido ${t.nivel}`);
    const arq = ler(`data/vocab/${t.arquivo}`);
    if (!arq) continue;
    if (arq.tema !== t.id || arq.nivel !== t.nivel) erros.push(`${t.arquivo}: tema/nível não batem com o index`);
    for (const p of arq.palavras) {
      const onde = `${t.arquivo} › ${p.id ?? p.alemao}`;
      for (const c of OBRIGATORIOS) if (!p[c] || typeof p[c] !== "string") erros.push(`${onde}: campo "${c}" ausente`);
      if (!CLASSES.includes(p.classe)) erros.push(`${onde}: classe inválida "${p.classe}"`);
      if (p.tema !== t.id) erros.push(`${onde}: tema "${p.tema}" diferente do arquivo`);
      if (p.nivel !== t.nivel) erros.push(`${onde}: nível "${p.nivel}" diferente do arquivo`);
      if (ids.has(p.id)) erros.push(`${onde}: id duplicado`);
      ids.add(p.id);
      if (p.classe === "substantivo") {
        if (!["der", "die", "das"].includes(p.artigo)) erros.push(`${onde}: substantivo sem artigo der/die/das`);
        if (!("plural" in p)) erros.push(`${onde}: substantivo sem campo "plural" (use null se não houver)`);
        if (p.so_plural && p.artigo !== "die") erros.push(`${onde}: palavra só no plural deve ter artigo "die"`);
        if (p.alemao[0] !== p.alemao[0].toUpperCase()) erros.push(`${onde}: substantivo deve começar com maiúscula`);
      } else if (p.artigo) {
        erros.push(`${onde}: só substantivos têm artigo`);
      }
      if (p.nivel === "A1" && (typeof p.pronuncia_pt !== "string" || !p.pronuncia_pt.trim())) erros.push(`${onde}: falta "pronuncia_pt" (como soa em português)`);
      if (p.pronuncia_pt && !/[A-ZÁÉÍÓÚÂÊÔÃÜÖ]/.test(p.pronuncia_pt)) erros.push(`${onde}: "pronuncia_pt" sem sílaba forte em MAIÚSCULAS`);
      if ("perfekt" in p && (p.classe !== "verbo" || !/^(hat|ist) \S/.test(p.perfekt))) erros.push(`${onde}: "perfekt" só para verbos, no formato "hat …" ou "ist …"`);
      if (p.nivel !== "A1" && p.classe === "verbo" && !p.perfekt) erros.push(`${onde}: verbo a partir do A2 precisa do campo "perfekt"`);
      if (!/[.!?“"]$/.test(p.exemplo.trim())) erros.push(`${onde}: exemplo sem pontuação final`);
      if (p.revisar) revisar.push(`${onde}: ${p.nota_revisao || "(sem nota)"}`);
      porNivel[p.nivel] = (porNivel[p.nivel] || 0) + 1;
      total++;
    }
  }
}

// --- diálogos ---
const dialogos = ler("data/dialogos.json");
if (dialogos) {
  const dids = new Set();
  for (const d of dialogos.dialogos) {
    if (dids.has(d.id)) erros.push(`dialogos: id duplicado ${d.id}`);
    dids.add(d.id);
    if (!d.titulo || !d.falas?.length) erros.push(`dialogos › ${d.id}: sem título ou falas`);
    d.falas.forEach((f, i) => {
      const onde = `dialogos › ${d.id} › fala ${i + 1}`;
      if (f.tipo === "ouvir") {
        if (!f.de || !f.pt || !f.falante) erros.push(`${onde}: fala "ouvir" precisa de de/pt/falante`);
      } else if (f.tipo === "responder") {
        if (!f.instrucao) erros.push(`${onde}: falta "instrucao"`);
        const corretas = (f.opcoes || []).filter((o) => o.correta);
        if (corretas.length !== 1) erros.push(`${onde}: precisa de exatamente 1 opção correta`);
        if ((f.opcoes || []).length < 2) erros.push(`${onde}: precisa de pelo menos 2 opções`);
        for (const o of f.opcoes || []) if (!o.de || !o.pt) erros.push(`${onde}: opção sem de/pt`);
      } else erros.push(`${onde}: tipo inválido "${f.tipo}"`);
      if (f.revisar) revisar.push(`${onde}: ${f.nota_revisao || "(sem nota)"}`);
    });
  }
}

// --- pronúncia ---
const pron = ler("data/pronuncia.json");
if (pron) {
  for (const s of pron.sons) {
    if (!s.id || !s.titulo || !s.explicacao || !s.exemplos?.length) erros.push(`pronuncia › ${s.id}: campos ausentes`);
    for (const e of s.exemplos || []) if (!e.de || !e.pt) erros.push(`pronuncia › ${s.id}: exemplo sem de/pt`);
    if (s.revisar) revisar.push(`pronuncia › ${s.id}: ${s.nota_revisao || "(sem nota)"}`);
    for (const e of s.exemplos || []) if (!e.soa) erros.push(`pronuncia › ${s.id} › ${e.de}: falta "soa"`);
  }
  if (!pron.legenda?.itens?.length) erros.push("pronuncia: falta a legenda");
  for (const t of pron.passo_a_passo || []) {
    if (!t.id || !t.titulo || !t.soa || !t.passos?.length) erros.push(`pronuncia › passo_a_passo › ${t.id}: campos ausentes`);
    for (const p of t.passos || []) if (!p.de || !p.soa || !p.pt) erros.push(`pronuncia › passo_a_passo › ${t.id}: passo sem de/soa/pt`);
  }
}

// --- trilha de iniciantes ---
const trilha = ler("data/trilha.json");
if (trilha) {
  const vistos = new Set();
  for (const l of trilha.licoes) {
    if (!l.id || !l.titulo || !l.dica || !l.palavras?.length) erros.push(`trilha › ${l.id}: campos ausentes`);
    for (const id of l.palavras || []) {
      if (!ids.has(id)) erros.push(`trilha › ${l.id}: palavra inexistente "${id}"`);
      if (vistos.has(id)) erros.push(`trilha › ${l.id}: "${id}" repetida em outra lição`);
      vistos.add(id);
    }
  }
  console.log(`Trilha: ${trilha.licoes.length} lições, ${vistos.size} palavras`);
}

console.log(`Palavras: ${total} (${Object.entries(porNivel).map(([n, q]) => `${n}: ${q}`).join(", ")})`);
if (dialogos) console.log(`Diálogos: ${dialogos.dialogos.length}`);
if (pron) console.log(`Sons de pronúncia: ${pron.sons.length}`);
if (revisar.length) {
  console.log(`\nItens marcados para revisão (${revisar.length}):`);
  for (const r of revisar) console.log("  ⚑ " + r);
}
if (erros.length) {
  console.error(`\n${erros.length} erro(s):`);
  for (const e of erros) console.error("  ✗ " + e);
  process.exit(1);
}
console.log("\nOK: dados válidos.");

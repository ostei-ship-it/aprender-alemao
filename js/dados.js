// Carregamento dos dados (JSON) e filtros por nível/tema.
import { config } from "./progresso.js";

let cache = null;

async function lerJSON(caminho) {
  const r = await fetch(caminho);
  if (!r.ok) throw new Error(`Não foi possível carregar ${caminho} (HTTP ${r.status}).`);
  return r.json();
}

export async function carregarDados() {
  if (cache) return cache;
  const index = await lerJSON("data/vocab/index.json");
  const arquivos = await Promise.all(index.temas.map((t) => lerJSON(`data/vocab/${t.arquivo}`)));
  const palavras = arquivos.flatMap((a) => a.palavras);
  const [dialogos, pronuncia, trilha] = await Promise.all([lerJSON("data/dialogos.json"), lerJSON("data/pronuncia.json"), lerJSON("data/trilha.json")]);
  const porId = new Map(palavras.map((p) => [p.id, p]));
  // Ordem de estudo das palavras novas: primeiro a trilha de iniciantes, depois das mais simples às mais longas.
  const posicaoTrilha = new Map();
  const licaoDaPalavra = new Map();
  for (const l of trilha.licoes) for (const id of l.palavras) {
    posicaoTrilha.set(id, posicaoTrilha.size);
    licaoDaPalavra.set(id, l);
  }
  const ordem = new Map(palavras.map((p, i) => [p.id, ordemEstudo(p, i, posicaoTrilha)]));
  cache = {
    index,
    temas: index.temas,
    palavras,
    porId,
    dialogos: dialogos.dialogos,
    sons: pronuncia.sons,
    pronuncia,
    licoes: trilha.licoes,
    licaoDaPalavra,
    ordem,
  };
  return cache;
}

const NIVEL = { A1: 0, A2: 1, B1: 2 };

// Número menor = estuda antes. Fora da trilha: nível, depois dificuldade (palavras na expressão,
// tamanho), mantendo a ordem do arquivo como desempate.
function ordemEstudo(p, indice, posicaoTrilha) {
  if (posicaoTrilha.has(p.id)) return posicaoTrilha.get(p.id);
  const palavrasNaExpressao = p.alemao.split(/\s+/).length;
  const dificuldade = (palavrasNaExpressao - 1) * 8 + Math.min(p.alemao.length, 16) + (p.classe === "expressão" ? 6 : 0);
  return 1000 + (NIVEL[p.nivel] ?? 3) * 100000 + dificuldade * 1000 + indice;
}

export const ordenarParaEstudo = (lista) => [...lista].sort((a, b) => cache.ordem.get(a.id) - cache.ordem.get(b.id));
export const licaoDe = (id) => cache.licaoDaPalavra.get(id) || null;

export const dados = () => cache;

export const nomeTema = (id) => cache.temas.find((t) => t.id === id)?.nome || id;

// Palavras dentro dos níveis e temas escolhidos nas configurações.
export function palavrasAtivas() {
  const { niveis, temas } = config();
  return cache.palavras.filter((p) => niveis.includes(p.nivel) && (!temas.length || temas.includes(p.tema)));
}

export function embaralhar(lista) {
  const a = [...lista];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Texto que deve ser falado/escrito para uma palavra: substantivos com artigo.
export function formaCompleta(p) {
  if (p.classe !== "substantivo") return p.alemao;
  return `${p.artigo} ${p.alemao}`;
}

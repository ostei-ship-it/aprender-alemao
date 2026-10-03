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
  const [dialogos, pronuncia] = await Promise.all([lerJSON("data/dialogos.json"), lerJSON("data/pronuncia.json")]);
  cache = {
    index,
    temas: index.temas,
    palavras,
    porId: new Map(palavras.map((p) => [p.id, p])),
    dialogos: dialogos.dialogos,
    sons: pronuncia.sons,
  };
  return cache;
}

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

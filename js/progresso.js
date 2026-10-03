// Progresso do aluno, persistido em localStorage, com exportação/importação em JSON.
import { aplicarSM2, cardNovo, hojeISO, somarDias } from "./sm2.js";
import { perfilAtivo, chaveProgresso } from "./perfis.js";

// Cada perfil tem seu próprio progresso (ver perfis.js).
const CHAVE = chaveProgresso(perfilAtivo().id);
const VERSAO = 1;

export const CONFIG_PADRAO = {
  metaDiaria: 15, // palavras novas por dia
  velocidade: 0.95, // velocidade normal da fala
  velocidadeLenta: 0.6,
  direcaoFlash: "de-pt", // "de-pt" | "pt-de" | "misto"
  autoAudio: true, // tocar o áudio automaticamente ao mostrar a palavra
  niveis: ["A1"],
  temas: [], // vazio = todos os temas
  vozURI: null,
};

function estadoVazio() {
  return { versao: VERSAO, config: { ...CONFIG_PADRAO }, cards: {}, stats: {}, historico: {}, dialogos: {} };
}

let estado = carregar();

function carregar() {
  if (typeof localStorage === "undefined") return estadoVazio(); // ex.: testes em Node
  try {
    const bruto = localStorage.getItem(CHAVE);
    if (bruto) return normalizar(JSON.parse(bruto));
  } catch (e) {
    console.warn("Não foi possível ler o progresso salvo:", e);
  }
  return estadoVazio();
}

function normalizar(obj) {
  if (!obj || typeof obj !== "object" || typeof obj.cards !== "object") throw new Error("Arquivo de progresso inválido.");
  const base = estadoVazio();
  return {
    ...base,
    ...obj,
    config: { ...base.config, ...(obj.config || {}) },
    cards: obj.cards || {},
    stats: obj.stats || {},
    historico: obj.historico || {},
    dialogos: obj.dialogos || {},
    versao: VERSAO,
  };
}

let avisouFalha = false;
function salvar() {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(estado));
  } catch (e) {
    if (!avisouFalha) {
      avisouFalha = true;
      console.warn("Não foi possível salvar o progresso (localStorage indisponível). Use Exportar para não perder dados.", e);
    }
  }
}

export const progresso = () => estado;
export const config = () => estado.config;

export function atualizarConfig(parcial) {
  estado.config = { ...estado.config, ...parcial };
  salvar();
}

function dia(data = hojeISO()) {
  if (!estado.historico[data]) estado.historico[data] = { novas: 0, revisoes: 0, acertos: 0, erros: 0 };
  return estado.historico[data];
}

// Registra acerto/erro de qualquer modo de estudo (quiz, fala, ditado, flashcard).
export function registrarResposta(id, correta) {
  const s = (estado.stats[id] ||= { acertos: 0, erros: 0 });
  if (correta) s.acertos++;
  else s.erros++;
  const d = dia();
  if (correta) d.acertos++;
  else d.erros++;
  salvar();
}

export function avaliarFlashcard(id, qualidade) {
  const hoje = hojeISO();
  const anterior = estado.cards[id];
  const novo = !anterior;
  const card = aplicarSM2(anterior || cardNovo(), qualidade, hoje);
  card.ultimaRevisao = hoje;
  card.introduzido = anterior?.introduzido || hoje;
  estado.cards[id] = card;
  const d = dia(hoje);
  if (novo) d.novas++;
  else d.revisoes++;
  registrarResposta(id, qualidade >= 3);
  return card;
}

// Prévia do intervalo de cada botão, sem salvar.
export function previaIntervalo(id, qualidade) {
  return aplicarSM2(estado.cards[id] || cardNovo(), qualidade, hojeISO()).intervalo;
}

export const cardDe = (id) => estado.cards[id] || null;
export const ehAprendida = (id) => (estado.cards[id]?.reps || 0) >= 2;
export const novasHoje = () => estado.historico[hojeISO()]?.novas || 0;

export function devidas(palavras, hoje = hojeISO()) {
  return palavras
    .filter((p) => estado.cards[p.id] && estado.cards[p.id].vencimento <= hoje)
    .sort((a, b) => estado.cards[a.id].vencimento.localeCompare(estado.cards[b.id].vencimento));
}

export function novasDisponiveis(palavras) {
  const restante = Math.max(0, estado.config.metaDiaria - novasHoje());
  return palavras.filter((p) => !estado.cards[p.id]).slice(0, restante);
}

const estudou = (h) => h && h.novas + h.revisoes + h.acertos + h.erros > 0;

export function sequenciaDias(hoje = hojeISO()) {
  let data = estudou(estado.historico[hoje]) ? hoje : somarDias(hoje, -1);
  let n = 0;
  while (estudou(estado.historico[data])) {
    n++;
    data = somarDias(data, -1);
  }
  return n;
}

export const totalDiasEstudados = () => Object.values(estado.historico).filter(estudou).length;

export function registrarDialogo(id, acertos, total) {
  const ant = estado.dialogos[id] || { vezes: 0, melhor: 0 };
  estado.dialogos[id] = { vezes: ant.vezes + 1, melhor: Math.max(ant.melhor, total ? acertos / total : 0), ultima: hojeISO() };
  salvar();
}

export function exportar() {
  return JSON.stringify({ app: "aprender-alemao", perfil: perfilAtivo().nome, exportadoEm: new Date().toISOString(), ...estado }, null, 2);
}

export function importar(texto) {
  const obj = JSON.parse(texto);
  if (obj.app && obj.app !== "aprender-alemao") throw new Error("Este arquivo não é um progresso deste app.");
  delete obj.app;
  delete obj.perfil;
  delete obj.exportadoEm;
  estado = normalizar(obj);
  salvar();
}

export function resetar() {
  estado = estadoVazio();
  salvar();
}

// Algoritmo SM-2 (SuperMemo 2, P. Wozniak, 1987), adaptado a 4 botões.
// Qualidade q de 0 a 5: q < 3 = falha (recomeça), q >= 3 = acerto.

export const BOTOES = [
  { id: "errei", rotulo: "Errei", qualidade: 1, tecla: "1" },
  { id: "dificil", rotulo: "Difícil", qualidade: 3, tecla: "2" },
  { id: "bom", rotulo: "Bom", qualidade: 4, tecla: "3" },
  { id: "facil", rotulo: "Fácil", qualidade: 5, tecla: "4" },
];

export const EF_INICIAL = 2.5;
export const EF_MINIMO = 1.3;

export function cardNovo() {
  return { ef: EF_INICIAL, intervalo: 0, reps: 0, vencimento: null };
}

// Retorna um NOVO estado do card (não altera o original).
export function aplicarSM2(card, qualidade, hoje) {
  const c = { ...cardNovo(), ...card };
  if (qualidade < 3) {
    c.reps = 0;
    c.intervalo = 1;
  } else {
    if (c.reps === 0) c.intervalo = 1;
    else if (c.reps === 1) c.intervalo = 6;
    else c.intervalo = Math.round(c.intervalo * c.ef);
    c.reps += 1;
  }
  // Fórmula original do SM-2; o EF é atualizado mesmo em caso de falha.
  c.ef = Math.max(EF_MINIMO, c.ef + (0.1 - (5 - qualidade) * (0.08 + (5 - qualidade) * 0.02)));
  c.ef = Math.round(c.ef * 1000) / 1000;
  c.vencimento = somarDias(hoje, c.intervalo);
  return c;
}

// Datas sempre no formato local YYYY-MM-DD (evita problemas de fuso com toISOString).
export function hojeISO(d = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function somarDias(iso, dias) {
  const [a, m, d] = iso.split("-").map(Number);
  return hojeISO(new Date(a, m - 1, d + dias));
}

export function diferencaDias(isoA, isoB) {
  const t = (iso) => { const [a, m, d] = iso.split("-").map(Number); return Date.UTC(a, m - 1, d); };
  return Math.round((t(isoB) - t(isoA)) / 86400000);
}

export function descreverIntervalo(dias) {
  if (dias <= 1) return "amanhã";
  if (dias < 30) return `${dias} dias`;
  if (dias < 365) return `${Math.round(dias / 30)} mês(es)`;
  return `${(dias / 365).toFixed(1).replace(".", ",")} ano(s)`;
}

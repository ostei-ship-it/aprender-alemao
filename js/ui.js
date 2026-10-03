// Utilitários de interface.
import { falar, sinteseSuportada } from "./audio.js";
import { config } from "./progresso.js";

// el("div", {class: "x", onclick: fn}, filho1, "texto", ...)
export function el(tag, attrs = {}, ...filhos) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k.startsWith("on") && typeof v === "function") e.addEventListener(k.slice(2), v);
    else if (k === "class") e.className = v;
    else if (k === "html") e.innerHTML = v;
    else e.setAttribute(k, v === true ? "" : v);
  }
  for (const f of filhos.flat(Infinity)) {
    if (f === null || f === undefined || f === false) continue;
    e.append(f instanceof Node ? f : document.createTextNode(String(f)));
  }
  return e;
}

export const NOMES_GENERO = { der: "masculino", die: "feminino", das: "neutro" };

export function artigo(art, { plural = false } = {}) {
  return el("span", { class: `art ${plural ? "art-pl" : `art-${art}`}`, title: plural ? "plural" : NOMES_GENERO[art] }, plural ? "die" : art);
}

// Palavra em alemão; substantivos sempre com artigo colorido.
export function palavraDE(p, { tamanho = "" } = {}) {
  const span = el("span", { class: `palavra-de ${tamanho}`, lang: "de" });
  if (p.classe === "substantivo") {
    span.append(artigo(p.artigo, { plural: !!p.so_plural }), " ");
  }
  span.append(p.alemao);
  if (p.so_plural) span.append(el("small", { class: "muted" }, " (só plural)"));
  return span;
}

export function pluralDE(p) {
  if (p.classe !== "substantivo" || p.so_plural) return null;
  if (!p.plural) return el("span", { class: "plural muted" }, "Plural: geralmente não se usa");
  return el("span", { class: "plural" }, "Plural: ", el("span", { lang: "de" }, artigo("die", { plural: true }), " ", p.plural));
}

// Botões de áudio: normal e lento.
export function botoesAudio(texto, { rotulo = "" } = {}) {
  const desab = !sinteseSuportada();
  return el(
    "span",
    { class: "audio-btns" },
    el("button", { class: "btn-audio", type: "button", title: "Ouvir", "aria-label": `Ouvir ${rotulo || texto}`, disabled: desab, onclick: (e) => { e.stopPropagation(); falar(texto); } }, "🔊"),
    el("button", { class: "btn-audio", type: "button", title: "Ouvir devagar", "aria-label": `Ouvir devagar ${rotulo || texto}`, disabled: desab, onclick: (e) => { e.stopPropagation(); falar(texto, { lento: true }); } }, "🐢"),
  );
}

// Como a palavra soa, lida em português (ex.: rechts → RRÉRHTS). Substantivos levam o artigo.
const ARTIGO_PT = { der: "dêa", die: "di", das: "das" };
export function textoSoaComo(p) {
  if (!p.pronuncia_pt) return null;
  if (p.classe !== "substantivo") return p.pronuncia_pt;
  return `${ARTIGO_PT[p.so_plural ? "die" : p.artigo]} ${p.pronuncia_pt}`;
}
export function imagemDe(p) {
  return p.imagem ? el("span", { class: "op-img", "aria-hidden": "true" }, p.imagem) : null;
}

export function soaComo(p, { forcar = false } = {}) {
  const t = textoSoaComo(p);
  if (!t || (!forcar && config().mostrarPronuncia === false)) return null;
  return el("span", { class: "soa-como", title: "Como soa, lido em português. Sílaba em MAIÚSCULAS = forte. Legenda em Pronúncia." },
    el("span", { class: "muted" }, "soa: "), t);
}

// Perfekt (passado composto) dos verbos que têm o campo, ex.: "ist abgefahren".
export function perfektDE(p) {
  if (!p.perfekt) return null;
  return el("span", { class: "plural" }, "Perfekt: ", el("span", { lang: "de", class: "palavra-de" }, p.perfekt), botoesAudio(p.perfekt));
}

export function badgeRevisar(p) {
  if (!p.revisar) return null;
  return el("span", { class: "badge-revisar", title: p.nota_revisao || "Item marcado para revisão" }, "⚑ revisar");
}

let toastTimer;
export function toast(msg, tipo = "") {
  let t = document.getElementById("toast");
  if (!t) {
    t = el("div", { id: "toast", role: "status", "aria-live": "polite" });
    document.body.append(t);
  }
  t.textContent = msg;
  t.className = `toast mostrar ${tipo}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.className = "toast"), 3500);
}

export function feedback(nivel, titulo, ...detalhes) {
  const icone = { acerto: "✓", parcial: "≈", erro: "✗" }[nivel] || "";
  return el("div", { class: `feedback fb-${nivel}`, role: "status" }, el("strong", {}, `${icone} ${titulo}`), ...detalhes);
}

// Exercícios usam, por padrão, só palavras já vistas nos flashcards (para não assustar no começo).
export function avisoSemEstudadas(usarTodas) {
  return feedback("parcial", "Você ainda não estudou palavras suficientes para este exercício.",
    el("span", {}, "Comece pelos flashcards: as palavras aparecem aos poucos, das mais simples para as mais difíceis."),
    el("span", { class: "grupo-botoes" },
      el("a", { class: "btn btn-primario", href: "#/flashcards" }, "Ir para os flashcards"),
      el("button", { class: "btn btn-secundario", onclick: usarTodas }, "Usar todas as palavras mesmo assim")));
}

export function porcentagem(a, total) {
  return total ? Math.round((a / total) * 100) : 0;
}

// Teclado de letras especiais para campos de texto.
export function tecladoEspecial(input) {
  return el(
    "div",
    { class: "teclado-especial" },
    ["ä", "ö", "ü", "ß", "Ä", "Ö", "Ü"].map((c) =>
      el("button", {
        type: "button",
        class: "btn-letra",
        onclick: () => {
          const ini = input.selectionStart ?? input.value.length;
          const fim = input.selectionEnd ?? input.value.length;
          input.value = input.value.slice(0, ini) + c + input.value.slice(fim);
          input.focus();
          input.setSelectionRange(ini + 1, ini + 1);
        },
      }, c),
    ),
  );
}

export function seletorTema(temas, valor, onchange, { incluirTodos = true } = {}) {
  return el(
    "select",
    { class: "select", onchange: (e) => onchange(e.target.value), "aria-label": "Tema" },
    incluirTodos ? el("option", { value: "" }, "Todos os temas ativos") : null,
    temas.map((t) => el("option", { value: t.id, selected: t.id === valor }, `${t.nome} (${t.nivel})`)),
  );
}

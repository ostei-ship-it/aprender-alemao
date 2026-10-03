// Lista navegável do vocabulário, com busca e filtro por tema.
import { el, palavraDE, pluralDE, perfektDE, botoesAudio, badgeRevisar, seletorTema } from "../ui.js";
import { dados, formaCompleta } from "../dados.js";
import { cardDe, ehAprendida } from "../progresso.js";

const semAcento = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function render(raiz) {
  let tema = "";
  let busca = "";
  let soRevisar = false;
  const lista = el("div", { class: "vocab-lista" });
  const contador = el("p", { class: "muted" });

  raiz.append(
    el("div", { class: "cabecalho-modo" },
      el("h2", {}, "Vocabulário"),
      el("p", { class: "muted" }, "Todas as palavras do banco. ",
        el("span", { class: "art art-der" }, "der"), " masculino · ",
        el("span", { class: "art art-die" }, "die"), " feminino · ",
        el("span", { class: "art art-das" }, "das"), " neutro · ",
        el("span", { class: "art art-pl" }, "die"), " plural"),
      el("div", { class: "linha-controles" },
        el("input", { class: "input", type: "search", placeholder: "Buscar em alemão ou português…", oninput: (e) => { busca = e.target.value; desenhar(); } }),
        seletorTema(dados().temas, tema, (v) => { tema = v; desenhar(); }),
        el("label", { class: "check" }, el("input", { type: "checkbox", onchange: (e) => { soRevisar = e.target.checked; desenhar(); } }), " só itens marcados ⚑")),
      contador),
    lista,
  );

  function desenhar() {
    const q = semAcento(busca.trim());
    const itens = dados().palavras.filter((p) =>
      (!tema || p.tema === tema) && (!soRevisar || p.revisar) &&
      (!q || semAcento(p.alemao).includes(q) || semAcento(p.portugues).includes(q)));
    contador.textContent = `${itens.length} palavra(s)`;
    lista.replaceChildren(...itens.slice(0, 300).map(item));
    if (itens.length > 300) lista.append(el("p", { class: "muted" }, "Mostrando as 300 primeiras. Refine a busca."));
  }

  function item(p) {
    const estado = ehAprendida(p.id) ? "aprendida" : cardDe(p.id) ? "estudando" : "";
    return el("details", { class: "vocab-item" },
      el("summary", {},
        palavraDE(p), botoesAudio(formaCompleta(p)),
        el("span", { class: "vocab-pt" }, p.portugues),
        estado ? el("span", { class: `etiqueta et-${estado}` }, estado) : null,
        badgeRevisar(p)),
      el("div", { class: "vocab-detalhe" },
        el("div", { class: "muted" }, `${p.classe} · ${p.nivel}`),
        pluralDE(p),
        perfektDE(p),
        el("div", { class: "exemplo" }, el("span", { lang: "de" }, p.exemplo), botoesAudio(p.exemplo, { rotulo: "exemplo" }), el("div", { class: "muted" }, p.exemplo_pt)),
        p.nota ? el("div", { class: "nota" }, "💡 ", p.nota) : null,
        p.revisar ? el("div", { class: "nota nota-revisar" }, "⚑ Para revisão: ", p.nota_revisao) : null));
  }

  desenhar();
}

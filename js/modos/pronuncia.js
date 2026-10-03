// Dicas de pronúncia: legenda de leitura, treinos passo a passo e sons difíceis para brasileiros.
import { el, botoesAudio } from "../ui.js";
import { dados } from "../dados.js";

// Exemplo com a palavra, como soa e o áudio.
function exemplo(de, soa, pt) {
  return el("span", { class: "exemplo-som" },
    el("span", { lang: "de", class: "palavra-de" }, de),
    soa ? el("span", { class: "soa-como" }, soa) : null,
    pt ? el("small", {}, pt) : null,
    botoesAudio(de));
}

export function render(raiz) {
  const { legenda, passo_a_passo: treinos = [] } = dados().pronuncia;
  const indice = el("nav", { class: "chips", "aria-label": "Atalhos" },
    el("a", { class: "chip", href: "#/pronuncia", onclick: (e) => { e.preventDefault(); document.getElementById("legenda")?.scrollIntoView({ behavior: "smooth" }); } }, "Como ler"),
    el("a", { class: "chip", href: "#/pronuncia", onclick: (e) => { e.preventDefault(); document.getElementById("passo-a-passo")?.scrollIntoView({ behavior: "smooth" }); } }, "Passo a passo"),
    ...dados().sons.map((s) => el("a", { class: "chip", href: "#/pronuncia", onclick: (e) => { e.preventDefault(); document.getElementById(`som-${s.id}`)?.scrollIntoView({ behavior: "smooth" }); } }, s.titulo.split(" ")[0])));

  raiz.append(
    el("div", { class: "cabecalho-modo" }, el("h2", {}, "Pronúncia"),
      el("p", { class: "muted" }, "Como as palavras soam lidas em português, treinos passo a passo e os sons mais difíceis para brasileiros. Ouça sempre o áudio e repita em voz alta (🐢 = devagar)."),
      indice),

    legenda ? el("section", { class: "cartao som", id: "legenda" },
      el("h3", {}, "📖 Como ler o \"soa como\""),
      el("p", {}, legenda.intro),
      el("dl", { class: "legenda" }, legenda.itens.map((i) => [el("dt", {}, i.simbolo), el("dd", {}, i.explicacao)]))) : null,

    el("section", { class: "cartao som", id: "passo-a-passo" },
      el("h3", {}, "🧩 Passo a passo: palavras difíceis"),
      el("p", { class: "muted" }, "Monte a palavra a partir de palavras mais fáceis. Ouça cada passo, repita 3 vezes e só então avance."),
      treinos.map((t) => el("details", { class: "treino", id: `treino-${t.id}` },
        el("summary", {}, el("strong", { lang: "de" }, t.titulo), " ", el("span", { class: "soa-como" }, t.soa)),
        el("p", { class: "muted" }, t.dica),
        el("ol", { class: "passos" }, t.passos.map((p) => el("li", {}, exemplo(p.de, p.soa, p.pt))))))),

    ...dados().sons.map((s) =>
      el("section", { class: "cartao som", id: `som-${s.id}` },
        el("h3", {}, el("span", { lang: "de" }, s.titulo), el("small", { class: "muted" }, s.ipa)),
        el("p", {}, s.explicacao),
        s.erro_comum ? el("p", { class: "nota" }, "⚠️ Erro comum: ", s.erro_comum) : null,
        el("div", { class: "exemplos-som" }, s.exemplos.map((e) => exemplo(e.de, e.soa, e.pt))),
        s.pares?.length ? el("div", { class: "secao" }, el("strong", {}, "Compare:"),
          el("div", { class: "exemplos-som" }, s.pares.map((p) =>
            el("span", { class: "par-som" }, exemplo(p.a, p.a_soa, p.a_pt), el("span", { class: "muted" }, "×"), exemplo(p.b, p.b_soa, p.b_pt))))) : null,
        s.revisar ? el("p", { class: "nota nota-revisar" }, "⚑ Para revisão: ", s.nota_revisao) : null)),
  );
}

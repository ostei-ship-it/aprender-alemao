// Dicas de pronúncia: sons difíceis para brasileiros, com exemplos em áudio.
import { el, botoesAudio } from "../ui.js";
import { dados } from "../dados.js";

export function render(raiz) {
  raiz.append(
    el("div", { class: "cabecalho-modo" }, el("h2", {}, "Dicas de pronúncia"),
      el("p", { class: "muted" }, "Sons do alemão padrão que costumam ser difíceis para brasileiros. As comparações com o português são aproximações: confie sempre no áudio e repita junto (use 🐢 para ouvir devagar).")),
    ...dados().sons.map((s) =>
      el("section", { class: "cartao som", id: `som-${s.id}` },
        el("h3", {}, el("span", { lang: "de" }, s.titulo), el("small", { class: "muted" }, s.ipa)),
        el("p", {}, s.explicacao),
        s.erro_comum ? el("p", { class: "nota" }, "⚠️ Erro comum: ", s.erro_comum) : null,
        el("div", { class: "exemplos-som" }, s.exemplos.map((e) =>
          el("span", { class: "exemplo-som" }, el("span", { lang: "de" }, e.de), el("small", {}, e.pt), botoesAudio(e.de)))),
        s.pares?.length ? el("div", { class: "secao" }, el("strong", {}, "Compare:"),
          el("div", { class: "exemplos-som" }, s.pares.map((p) =>
            el("span", { class: "exemplo-som" },
              el("span", { lang: "de" }, p.a), el("small", {}, p.a_pt), botoesAudio(p.a),
              el("span", { class: "muted" }, " × "),
              el("span", { lang: "de" }, p.b), el("small", {}, p.b_pt), botoesAudio(p.b))))) : null,
        s.revisar ? el("p", { class: "nota nota-revisar" }, "⚑ Para revisão: ", s.nota_revisao) : null)),
  );
}

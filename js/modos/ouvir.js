// Ouvir e escrever (ditado): o app fala, o aluno digita.
import { el, feedback, avisoSemEstudadas, seletorTema, tecladoEspecial, palavraDE, soaComo, botoesAudio } from "../ui.js";
import { dados, palavrasAtivas, embaralhar, formaCompleta } from "../dados.js";
import { falar } from "../audio.js";
import { config, registrarResposta, cardDe } from "../progresso.js";
import { avaliarEscrita, alinharPalavras, normalizar } from "../comparar.js";
import { avaliarDigitado } from "./quiz.js";

export function render(raiz) {
  const opcoes = { conteudo: "palavras", tema: "", soEstudadas: true };
  const corpo = el("div");
  raiz.append(
    el("div", { class: "cabecalho-modo" }, el("h2", {}, "Ouvir e escrever"),
      el("p", { class: "muted" }, "Ouça e escreva o que entendeu. Substantivos com o artigo. Use 🐢 para ouvir devagar.")),
    corpo);

  function telaInicial() {
    const temas = dados().temas.filter((t) => config().niveis.includes(t.nivel));
    corpo.replaceChildren(el("div", { class: "cartao config-grade" },
      el("div", {}, el("strong", {}, "O que ouvir"), el("div", { class: "chips" },
        [["palavras", "Palavras"], ["frases", "Frases de exemplo"]].map(([v, r]) =>
          el("button", { type: "button", class: "chip", "aria-pressed": String(opcoes.conteudo === v), onclick: () => { opcoes.conteudo = v; telaInicial(); } }, r)))),
      el("label", {}, "Tema", seletorTema(temas, opcoes.tema, (v) => (opcoes.tema = v))),
      el("label", { class: "check" }, el("input", { type: "checkbox", checked: opcoes.soEstudadas, onchange: (e) => (opcoes.soEstudadas = e.target.checked) }), " Só palavras que já estudei"),
      el("button", { class: "btn btn-primario", onclick: iniciar }, "Começar")));
  }

  function iniciar() {
    let lista = palavrasAtivas();
    if (opcoes.tema) lista = lista.filter((p) => p.tema === opcoes.tema);
    if (opcoes.soEstudadas) lista = lista.filter((p) => cardDe(p.id));
    if (!lista.length) {
      if (opcoes.soEstudadas) return corpo.prepend(avisoSemEstudadas(() => { opcoes.soEstudadas = false; iniciar(); }));
      return corpo.prepend(feedback("parcial", "Nenhuma palavra com esses filtros."));
    }
    rodar(embaralhar(lista).slice(0, 10));
  }

  function rodar(itens) {
    let i = 0;
    let acertos = 0;

    function mostrar() {
      const p = itens[i];
      const frase = opcoes.conteudo === "frases";
      const texto = frase ? p.exemplo : formaCompleta(p);
      let respondida = false;
      const input = el("input", { class: "input input-grande", lang: "de", autocomplete: "off", autocapitalize: "off", spellcheck: "false", placeholder: frase ? "Escreva a frase" : "Escreva a palavra (com artigo)" });
      const area = el("div");
      const proximo = el("button", { class: "btn btn-primario", hidden: true, onclick: () => { i++; i < itens.length ? mostrar() : fim(); } }, i + 1 < itens.length ? "Próxima" : "Ver resultado");

      const verificar = (desistiu = false) => {
        if (respondida) return;
        const digitado = input.value.trim();
        if (!digitado && !desistiu) return input.focus();
        respondida = true;
        input.disabled = true;
        let r;
        if (desistiu) r = { nivel: "erro", titulo: "Resposta:", notas: [] };
        else if (frase) {
          const a = avaliarEscrita(texto, digitado);
          r = { nivel: a.nivel, titulo: a.nivel === "acerto" ? "Certo!" : a.nivel === "parcial" ? "Quase!" : "Confira as palavras destacadas.", notas: a.notas };
        } else r = avaliarDigitado(p, digitado);
        if (r.nivel === "acerto") acertos++;
        registrarResposta(p.id, r.nivel === "acerto");
        const marcado = alinharPalavras(texto, desistiu ? "" : digitado);
        area.append(feedback(r.nivel, r.titulo,
          el("span", { lang: "de" }, frase ? textoMarcado(texto, marcado) : palavraDE(p), botoesAudio(texto)),
          frase ? null : soaComo(p),
          el("span", { class: "muted" }, frase ? p.exemplo_pt : p.portugues),
          ...r.notas.map((n) => el("span", {}, n))));
        proximo.hidden = false;
        proximo.focus();
      };
      input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); verificar(); } });

      corpo.replaceChildren(el("div", { class: "quiz-card" },
        el("div", { class: "flash-status" }, el("span", { class: "muted" }, `${i + 1} de ${itens.length}`), el("span", { class: "muted" }, `${acertos} acerto(s)`)),
        el("div", { class: "quiz-pergunta" },
          el("button", { class: "btn-mic", style: "border-color:var(--der)", "aria-label": "Ouvir de novo", onclick: () => falar(texto) }, "🔊"),
          el("button", { class: "btn", onclick: () => falar(texto, { lento: true }) }, "🐢 Ouvir devagar")),
        input, tecladoEspecial(input),
        el("div", { class: "grupo-botoes" },
          el("button", { class: "btn", onclick: () => verificar() }, "Verificar"),
          el("button", { class: "btn btn-secundario", onclick: () => verificar(true) }, "Não sei")),
        area, proximo));
      falar(texto);
      setTimeout(() => input.focus(), 50);
    }

    function fim() {
      corpo.replaceChildren(el("div", { class: "cartao-fim" },
        el("h3", {}, `${acertos} de ${itens.length} corretas`),
        el("div", { class: "grupo-botoes", style: "justify-content:center" },
          el("button", { class: "btn btn-primario", onclick: iniciar }, "De novo"),
          el("button", { class: "btn", onclick: telaInicial }, "Mudar opções"))));
    }

    mostrar();
  }

  telaInicial();
}

// Texto esperado com palavras certas em verde e faltantes/erradas sublinhadas.
export function textoMarcado(texto, marcado) {
  const palavras = texto.split(/\s+/);
  let k = 0;
  return el("span", {}, palavras.map((w, idx) => {
    // Cada palavra original pode virar 0 (pontuação solta) ou vários tokens normalizados (números).
    const n = normalizar(w).split(" ").filter(Boolean).length;
    const marcas = marcado.slice(k, k + n);
    k += n;
    const classe = !n ? "" : marcas.every((m) => m.ok) ? "tok-ok" : "tok-falta";
    return [el("span", { class: classe }, w), idx < palavras.length - 1 ? " " : ""];
  }));
}

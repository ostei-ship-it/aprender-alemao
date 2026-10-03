// Treino de fala: o aluno fala, o reconhecedor (de-DE) transcreve e o app compara.
import { el, feedback, seletorTema, palavraDE, botoesAudio, toast } from "../ui.js";
import { dados, palavrasAtivas, embaralhar, formaCompleta } from "../dados.js";
import { falar, ouvirFala, pararEscuta, reconhecimentoSuportado, gravacaoSuportada, iniciarGravacao } from "../audio.js";
import { config, registrarResposta, cardDe } from "../progresso.js";
import { avaliarFala } from "../comparar.js";
import { textoMarcado } from "./ouvir.js";

const TITULOS = { acerto: "Muito bem! Pronúncia reconhecida.", parcial: "Quase! Parte da fala foi reconhecida.", erro: "Não reconheci o texto esperado." };

export function render(raiz) {
  const opcoes = { conteudo: "frases", tema: "", soEstudadas: false };
  const corpo = el("div");
  const suportado = reconhecimentoSuportado();

  raiz.append(
    el("div", { class: "cabecalho-modo" }, el("h2", {}, "Treino de fala"),
      el("p", { class: "muted" }, "Leia em voz alta. O reconhecimento de voz transcreve o que entendeu e compara com o texto esperado."),
      suportado ? null : avisoSemSuporte()),
    corpo);

  function avisoSemSuporte() {
    return feedback("parcial", "Seu navegador não suporta reconhecimento de fala.",
      el("span", {}, "Use o Google Chrome (computador ou Android) para ter a correção automática."),
      el("span", {}, gravacaoSuportada()
        ? "Alternativa disponível aqui: grave sua voz, compare com o modelo e avalie você mesmo."
        : "Alternativa: ouça o modelo, repita em voz alta e avalie você mesmo."));
  }

  function telaInicial() {
    const temas = dados().temas.filter((t) => config().niveis.includes(t.nivel));
    corpo.replaceChildren(el("div", { class: "cartao config-grade" },
      el("div", {}, el("strong", {}, "O que falar"), el("div", { class: "chips" },
        [["frases", "Frases de exemplo"], ["palavras", "Palavras"]].map(([v, r]) =>
          el("button", { type: "button", class: "chip", "aria-pressed": String(opcoes.conteudo === v), onclick: () => { opcoes.conteudo = v; telaInicial(); } }, r))),
        el("small", { class: "muted" }, "Dica: frases costumam ser reconhecidas melhor que palavras isoladas.")),
      el("label", {}, "Tema", seletorTema(temas, opcoes.tema, (v) => (opcoes.tema = v))),
      el("label", { class: "check" }, el("input", { type: "checkbox", checked: opcoes.soEstudadas, onchange: (e) => (opcoes.soEstudadas = e.target.checked) }), " Só palavras que já estudei"),
      el("button", { class: "btn btn-primario", onclick: iniciar }, "Começar")));
  }

  function iniciar() {
    let lista = palavrasAtivas();
    if (opcoes.tema) lista = lista.filter((p) => p.tema === opcoes.tema);
    if (opcoes.soEstudadas) lista = lista.filter((p) => cardDe(p.id));
    if (!lista.length) return corpo.prepend(feedback("parcial", "Nenhuma palavra com esses filtros."));
    rodar(embaralhar(lista).slice(0, 10));
  }

  function rodar(itens) {
    let i = 0;
    let acertos = 0;

    function mostrar() {
      const p = itens[i];
      const frase = opcoes.conteudo === "frases";
      const texto = frase ? p.exemplo : formaCompleta(p);
      let melhor = null; // melhor resultado entre as tentativas
      const area = el("div");
      const proximo = el("button", { class: "btn btn-primario", onclick: () => {
        pararEscuta();
        registrarResposta(p.id, melhor === "acerto");
        if (melhor === "acerto") acertos++;
        i++;
        i < itens.length ? mostrar() : fim();
      } }, i + 1 < itens.length ? "Próxima" : "Ver resultado");

      const alvo = el("div", { class: "quiz-pergunta" },
        frase ? el("div", { class: "palavra-de grande", lang: "de" }, texto) : palavraDE(p, { tamanho: "grande" }),
        el("p", { class: "muted" }, frase ? p.exemplo_pt : p.portugues),
        el("div", { class: "grupo-botoes", style: "justify-content:center" },
          el("button", { class: "btn", onclick: () => falar(texto) }, "🔊 Ouvir modelo"),
          el("button", { class: "btn", onclick: () => falar(texto, { lento: true }) }, "🐢 Devagar")));

      const controles = suportado ? controlesReconhecimento(texto, area, (nivel) => {
        const ordem = { erro: 0, parcial: 1, acerto: 2 };
        if (!melhor || ordem[nivel] > ordem[melhor]) melhor = nivel;
      }) : controlesAlternativos(texto, area, (nivel) => (melhor = nivel));

      corpo.replaceChildren(el("div", { class: "quiz-card" },
        el("div", { class: "flash-status" }, el("span", { class: "muted" }, `${i + 1} de ${itens.length}`), el("span", { class: "muted" }, `${acertos} acerto(s)`)),
        alvo, controles, area, proximo));
    }

    function fim() {
      corpo.replaceChildren(el("div", { class: "cartao-fim" },
        el("h3", {}, `${acertos} de ${itens.length} reconhecidas`),
        el("div", { class: "grupo-botoes", style: "justify-content:center" },
          el("button", { class: "btn btn-primario", onclick: iniciar }, "De novo"),
          el("button", { class: "btn", onclick: telaInicial }, "Mudar opções"))));
    }

    mostrar();
  }

  function controlesReconhecimento(texto, area, aoAvaliar) {
    const status = el("p", { class: "muted", style: "text-align:center" }, "Toque no microfone e fale.");
    const mic = el("button", { class: "btn-mic", "aria-label": "Falar", onclick: async () => {
      if (mic.classList.contains("ouvindo")) return pararEscuta();
      mic.classList.add("ouvindo");
      status.textContent = "Ouvindo… fale agora.";
      area.replaceChildren();
      try {
        const { alternativas } = await ouvirFala({ onInicio: () => (status.textContent = "Ouvindo… fale agora.") });
        const r = avaliarFala(texto, alternativas);
        aoAvaliar(r.nivel);
        area.replaceChildren(feedback(r.nivel, TITULOS[r.nivel],
          el("span", { class: "reconhecido" }, "Reconhecido: ", el("q", { lang: "de" }, r.texto || "(nada)")),
          el("span", {}, "Esperado: ", el("span", { lang: "de" }, textoMarcado(texto, r.palavras))),
          alternativas.length > 1 ? el("span", { class: "alternativas muted" }, "Outras interpretações: ", alternativas.filter((a) => a.texto !== r.texto).map((a) => `“${a.texto}”`).join(", ")) : null,
          r.nivel !== "acerto" ? el("span", { class: "muted" }, "Palavras sublinhadas não foram reconhecidas. Ouça o modelo e tente de novo.") : null));
        status.textContent = "Toque no microfone para tentar de novo.";
      } catch (e) {
        area.replaceChildren(feedback("erro", "Não foi possível reconhecer.", e.message));
        status.textContent = "Toque no microfone e fale.";
      } finally {
        mic.classList.remove("ouvindo");
      }
    } }, "🎤");
    return el("div", {}, mic, status);
  }

  // Sem reconhecimento: gravar e comparar (MediaRecorder) ou só repetir + autoavaliação.
  function controlesAlternativos(texto, area, aoAvaliar) {
    const autoavaliacao = el("div", { class: "grupo-botoes", style: "justify-content:center" },
      el("span", { class: "muted", style: "width:100%;text-align:center" }, "Como foi?"),
      [["acerto", "✓ Igual ao modelo"], ["parcial", "≈ Quase"], ["erro", "✗ Bem diferente"]].map(([n, r]) =>
        el("button", { class: "btn", onclick: () => { aoAvaliar(n); toast("Avaliação registrada."); } }, r)));
    if (!gravacaoSuportada()) {
      return el("div", {}, el("p", { class: "muted", style: "text-align:center" }, "Ouça o modelo, repita em voz alta e avalie:"), autoavaliacao);
    }
    let gravacao = null;
    const btn = el("button", { class: "btn-mic", "aria-label": "Gravar", onclick: async () => {
      if (gravacao) {
        const url = await gravacao.parar();
        gravacao = null;
        btn.classList.remove("ouvindo");
        btn.textContent = "⏺";
        area.replaceChildren(el("div", { class: "cartao" },
          el("p", {}, "Sua gravação:"), el("audio", { controls: true, src: url }),
          el("div", { class: "grupo-botoes" }, el("button", { class: "btn", onclick: () => falar(texto) }, "🔊 Ouvir modelo de novo")),
          autoavaliacao));
        return;
      }
      try {
        gravacao = await iniciarGravacao();
        btn.classList.add("ouvindo");
        btn.textContent = "⏹";
      } catch (e) {
        area.replaceChildren(feedback("erro", "Não foi possível usar o microfone.", e.message));
      }
    } }, "⏺");
    return el("div", {}, btn, el("p", { class: "muted", style: "text-align:center" }, "Grave, pare e compare com o modelo."));
  }

  telaInicial();
  return () => pararEscuta();
}


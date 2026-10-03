// Flashcards com repetição espaçada (SM-2) e fila diária.
import { el, palavraDE, pluralDE, perfektDE, soaComo, botoesAudio, badgeRevisar, seletorTema, toast } from "../ui.js";
import { dados, palavrasAtivas, formaCompleta, ordenarParaEstudo, licaoDe } from "../dados.js";
import { falar } from "../audio.js";
import { BOTOES, descreverIntervalo } from "../sm2.js";
import { config, devidas, novasDisponiveis, avaliarFlashcard, previaIntervalo, cardDe, novasHoje, registrarResposta } from "../progresso.js";

export function render(raiz) {
  let tema = "";
  let fila = [];
  let atual = null;
  let virado = false;
  let feitos = 0;
  let extras = 0;
  const repetidos = new Set(); // cards errados nesta sessão (voltam ao fim da fila)
  const placar = { errei: 0, dificil: 0, bom: 0, facil: 0 };

  const corpo = el("div", { class: "flash-corpo" });
  const temas = dados().temas.filter((t) => config().niveis.includes(t.nivel));

  raiz.append(
    el("div", { class: "cabecalho-modo" },
      el("h2", {}, "Flashcards"),
      el("p", { class: "muted" }, "Revisões do dia + palavras novas até a sua meta diária. O intervalo até a próxima revisão segue o algoritmo SM-2."),
      el("div", { class: "linha-controles" },
        seletorTema(temas, tema, (v) => { tema = v; montarFila(); })),
    ),
    corpo,
  );

  function base() {
    const ativas = palavrasAtivas();
    return tema ? ativas.filter((p) => p.tema === tema) : ativas;
  }

  function montarFila() {
    const lista = ordenarParaEstudo(base());
    const revisoes = devidas(lista);
    let novas = novasDisponiveis(lista);
    if (extras) novas = lista.filter((p) => !cardDe(p.id)).slice(0, novas.length + extras);
    // Palavras novas na ordem da trilha (das mais simples para as mais difíceis), depois das revisões.
    fila = [...revisoes, ...novas];
    feitos = 0;
    repetidos.clear();
    proximo();
  }

  function direcao() {
    const d = config().direcaoFlash;
    return d === "misto" ? (Math.random() < 0.5 ? "de-pt" : "pt-de") : d;
  }

  const licoesApresentadas = new Set();

  function proximo() {
    atual = fila.shift() || null;
    virado = false;
    if (atual) atual = { ...atual, _dir: direcao() };
    // Antes da 1ª palavra nova de uma lição da trilha, mostra o título e a dica da lição.
    const licao = atual && !cardDe(atual.id) ? licaoDe(atual.id) : null;
    if (licao && !licoesApresentadas.has(licao.id) && !licao.palavras.some((id) => cardDe(id))) {
      licoesApresentadas.add(licao.id);
      return apresentarLicao(licao);
    }
    desenhar();
    if (atual && atual._dir === "de-pt" && config().autoAudio) falar(formaCompleta(atual));
  }

  let emIntro = null; // botão "Começar a lição" enquanto a apresentação está na tela

  function apresentarLicao(licao) {
    const n = dados().licoes.indexOf(licao) + 1;
    corpo.replaceChildren(el("div", { class: "cartao licao-intro" },
      el("span", { class: "etiqueta et-nova" }, `Lição ${n} de ${dados().licoes.length}`),
      el("h3", {}, licao.titulo),
      el("p", {}, licao.dica),
      el("p", { class: "muted" }, `${licao.palavras.length} palavras nesta lição.`),
      emIntro = el("button", { class: "btn btn-primario largo", onclick: () => { emIntro = null; desenhar(); if (atual._dir === "de-pt" && config().autoAudio) falar(formaCompleta(atual)); } }, "Começar a lição")));
  }

  function desenhar() {
    corpo.replaceChildren();
    if (!atual) return desenharFim();
    const novo = !cardDe(atual.id);
    const restantes = fila.length + 1;
    corpo.append(
      el("div", { class: "flash-status" },
        el("span", { class: `etiqueta ${novo ? "et-nova" : "et-revisao"}` }, novo ? "nova" : repetidos.has(atual.id) ? "repetição" : "revisão"),
        el("span", { class: "muted" }, `${restantes} na fila · ${feitos} feitas`)),
    );
    const frente = atual._dir === "de-pt"
      ? el("div", { class: "flash-frente" }, palavraDE(atual, { tamanho: "grande" }), soaComo(atual), botoesAudio(formaCompleta(atual)))
      : el("div", { class: "flash-frente" }, el("span", { class: "palavra-pt grande" }, atual.portugues),
          el("p", { class: "muted" }, atual.classe === "substantivo" ? "Lembre-se do artigo (der/die/das)!" : `(${atual.classe})`));
    const cartao = el("div", { class: `flash-card ${virado ? "virado" : ""}`, onclick: () => !virado && virar() }, frente);
    if (virado) {
      cartao.append(
        el("hr"),
        atual._dir === "de-pt"
          ? el("div", { class: "palavra-pt" }, atual.portugues)
          : el("div", { class: "flash-frente" }, palavraDE(atual, { tamanho: "grande" }), soaComo(atual), botoesAudio(formaCompleta(atual))),
        el("div", { class: "flash-detalhes" },
          pluralDE(atual),
          perfektDE(atual),
          el("div", { class: "exemplo" },
            el("span", { lang: "de" }, atual.exemplo), botoesAudio(atual.exemplo, { rotulo: "exemplo" }),
            el("div", { class: "muted" }, atual.exemplo_pt)),
          atual.nota ? el("div", { class: "nota" }, "💡 ", atual.nota) : null,
          badgeRevisar(atual)),
      );
    }
    corpo.append(cartao);
    if (!virado) {
      corpo.append(el("button", { class: "btn btn-primario largo", onclick: virar }, "Mostrar resposta ", el("kbd", {}, "espaço")));
    } else {
      corpo.append(el("div", { class: "botoes-sm2" },
        BOTOES.map((b) => el("button", { class: `btn btn-${b.id}`, onclick: () => avaliar(b) },
          el("span", {}, b.rotulo),
          el("small", {}, repetidos.has(atual.id) ? "repetir" : descreverIntervalo(previaIntervalo(atual.id, b.qualidade))),
          el("kbd", {}, b.tecla)))));
    }
  }

  function virar() {
    virado = true;
    desenhar();
    if (atual._dir === "pt-de" && config().autoAudio) falar(formaCompleta(atual));
  }

  function avaliar(botao) {
    placar[botao.id]++;
    if (repetidos.has(atual.id)) {
      // Já reagendado nesta sessão: só registra o resultado do treino extra.
      registrarResposta(atual.id, botao.qualidade >= 3);
    } else {
      avaliarFlashcard(atual.id, botao.qualidade);
    }
    if (botao.qualidade < 3) {
      repetidos.add(atual.id);
      fila.push(atual);
    }
    feitos++;
    proximo();
  }

  function desenharFim() {
    const lista = base();
    const restamNovas = lista.filter((p) => !cardDe(p.id)).length;
    const meta = config().metaDiaria;
    corpo.append(
      el("div", { class: "cartao-fim" },
        el("h3", {}, feitos ? "Sessão concluída! 🎉" : "Nada para revisar agora"),
        feitos ? el("p", {}, `Você fez ${feitos} cartões: ${placar.facil} fácil, ${placar.bom} bom, ${placar.dificil} difícil, ${placar.errei} errei.`) : null,
        el("p", { class: "muted" }, `Palavras novas hoje: ${novasHoje()} de ${meta} (meta diária). ${restamNovas} palavras ainda não vistas ${tema ? "neste tema" : "nos temas ativos"}.`),
        restamNovas
          ? el("button", { class: "btn", onclick: () => { extras += 5; montarFila(); if (!atual) toast("Não há mais palavras novas neste filtro."); } }, "Aprender mais 5 palavras novas")
          : null,
        el("a", { class: "btn btn-secundario", href: "#/quiz" }, "Fazer um quiz"),
      ),
    );
  }

  function tecla(e) {
    if (e.target.matches("input, textarea, select")) return;
    if (!atual) return;
    if (emIntro) {
      if (e.key === " " || e.key === "Enter") { e.preventDefault(); emIntro.click(); }
      return;
    }
    if (!virado && (e.key === " " || e.key === "Enter")) {
      e.preventDefault();
      virar();
    } else if (virado) {
      const b = BOTOES.find((x) => x.tecla === e.key);
      if (b) avaliar(b);
    }
  }
  document.addEventListener("keydown", tecla);

  montarFila();
  return () => document.removeEventListener("keydown", tecla);
}

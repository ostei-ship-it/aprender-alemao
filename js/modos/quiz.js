// Quiz: múltipla escolha (DE→PT e PT→DE), digitar a tradução e quiz de artigos.
import { el, palavraDE, soaComo, botoesAudio, feedback, avisoSemEstudadas, seletorTema, tecladoEspecial, porcentagem, NOMES_GENERO } from "../ui.js";
import { dados, palavrasAtivas, embaralhar, formaCompleta } from "../dados.js";
import { falar } from "../audio.js";
import { config, registrarResposta, cardDe } from "../progresso.js";
import { avaliarEscrita, normalizar } from "../comparar.js";

const TIPOS = [
  { id: "de-pt", rotulo: "Alemão → português" },
  { id: "pt-de", rotulo: "Português → alemão" },
  { id: "digitar", rotulo: "Digitar em alemão" },
  { id: "artigo", rotulo: "der / die / das" },
  { id: "misto", rotulo: "Misturado" },
];

export function render(raiz) {
  const opcoes = { tipo: "de-pt", tema: "", quantidade: 10, soEstudadas: true };
  const corpo = el("div");
  raiz.append(el("div", { class: "cabecalho-modo" }, el("h2", {}, "Quiz"), el("p", { class: "muted" }, "Teste o que você já viu nos flashcards ou explore palavras novas.")), corpo);
  let limparTecla = null;

  function telaInicial() {
    limparTecla?.();
    const temas = dados().temas.filter((t) => config().niveis.includes(t.nivel));
    const chipsTipo = el("div", { class: "chips" }, TIPOS.map((t) =>
      el("button", { type: "button", class: "chip", "aria-pressed": String(opcoes.tipo === t.id), onclick: () => { opcoes.tipo = t.id; telaInicial(); } }, t.rotulo)));
    corpo.replaceChildren(el("div", { class: "cartao config-grade" },
      el("div", {}, el("strong", {}, "Tipo de pergunta"), chipsTipo),
      el("label", {}, "Tema", seletorTema(temas, opcoes.tema, (v) => (opcoes.tema = v))),
      el("label", {}, "Número de perguntas",
        el("select", { class: "select", onchange: (e) => (opcoes.quantidade = Number(e.target.value)) },
          [10, 20, 30].map((n) => el("option", { value: n, selected: n === opcoes.quantidade }, n)))),
      el("label", { class: "check" }, el("input", { type: "checkbox", checked: opcoes.soEstudadas, onchange: (e) => (opcoes.soEstudadas = e.target.checked) }), " Só palavras que já estudei nos flashcards"),
      el("button", { class: "btn btn-primario", onclick: iniciar }, "Começar")));
  }

  function universo() {
    let lista = palavrasAtivas();
    if (opcoes.tema) lista = lista.filter((p) => p.tema === opcoes.tema);
    if (opcoes.soEstudadas) lista = lista.filter((p) => cardDe(p.id));
    return lista;
  }

  function iniciar() {
    const base = universo();
    const perguntas = [];
    for (const p of embaralhar(base)) {
      if (perguntas.length >= opcoes.quantidade) break;
      let tipo = opcoes.tipo === "misto" ? ["de-pt", "pt-de", "digitar", "artigo"][Math.floor(Math.random() * 4)] : opcoes.tipo;
      const temArtigo = p.classe === "substantivo" && !p.so_plural;
      if (tipo === "artigo" && !temArtigo) {
        if (opcoes.tipo === "artigo") continue;
        tipo = "de-pt";
      }
      perguntas.push({ p, tipo });
    }
    if (!perguntas.length) {
      if (opcoes.soEstudadas) corpo.prepend(avisoSemEstudadas(() => { opcoes.soEstudadas = false; iniciar(); }));
      else corpo.prepend(feedback("parcial", "Nenhuma palavra disponível com esses filtros."));
      return;
    }
    rodar(perguntas);
  }

  function distratores(p, campo, n = 3) {
    const valor = (x) => (campo === "pt" ? x.portugues : formaCompleta(x));
    const usados = new Set([normalizar(valor(p))]);
    const pool = embaralhar(dados().palavras.filter((x) => x.id !== p.id && x.classe === p.classe));
    const mesmoTema = pool.filter((x) => x.tema === p.tema);
    const saida = [];
    for (const x of [...mesmoTema, ...pool]) {
      const v = normalizar(valor(x));
      if (usados.has(v)) continue;
      usados.add(v);
      saida.push(x);
      if (saida.length === n) break;
    }
    return saida;
  }

  function rodar(perguntas) {
    let i = 0;
    let acertos = 0;
    const erros = [];
    let respondida = false;
    let avancar = null;

    const tecla = (e) => {
      // Em botões o Enter já dispara o clique nativo; evita avançar duas vezes.
      if (e.key === "Enter" && respondida && avancar && e.target.tagName !== "BUTTON") { e.preventDefault(); avancar(); }
    };
    document.addEventListener("keydown", tecla);
    limparTecla = () => document.removeEventListener("keydown", tecla);

    function concluir(correta, detalhe = null) {
      if (respondida) return;
      respondida = true;
      const { p } = perguntas[i];
      registrarResposta(p.id, correta === true);
      if (correta === true) acertos++;
      else erros.push(p);
      falar(formaCompleta(p));
      return detalhe;
    }

    function mostrar() {
      respondida = false;
      const { p, tipo } = perguntas[i];
      const card = el("div", { class: "quiz-card" });
      const area = el("div");
      const proximo = el("button", { class: "btn btn-primario", hidden: true, onclick: () => { i++; i < perguntas.length ? mostrar() : resumo(); } }, i + 1 < perguntas.length ? "Próxima" : "Ver resultado", el("kbd", {}, "Enter"));
      avancar = () => proximo.click();
      const resposta = (nivel, titulo, ...extra) => {
        area.append(feedback(nivel, titulo,
          el("span", {}, palavraDE(p), botoesAudio(formaCompleta(p)), " = ", p.portugues),
          soaComo(p),
          el("span", { class: "muted", lang: "de" }, p.exemplo), ...extra));
        proximo.hidden = false;
        proximo.focus();
      };

      card.append(
        el("div", { class: "flash-status" }, el("span", { class: "muted" }, `Pergunta ${i + 1} de ${perguntas.length}`), el("span", { class: "muted" }, `${acertos} acerto(s)`)),
        el("div", { class: "progresso-barra" }, el("span", { style: `width:${porcentagem(i, perguntas.length)}%` })),
      );

      if (tipo === "de-pt" || tipo === "pt-de") {
        const pergunta = tipo === "de-pt"
          ? el("div", { class: "quiz-pergunta" }, palavraDE(p, { tamanho: "grande" }), botoesAudio(formaCompleta(p)))
          : el("div", { class: "quiz-pergunta" }, el("span", { class: "palavra-pt grande" }, p.portugues));
        const alternativas = embaralhar([p, ...distratores(p, tipo === "de-pt" ? "pt" : "de")]);
        const botoes = alternativas.map((x) => el("button", { class: "btn opcao", onclick: () => {
          if (respondida) return;
          const certa = x.id === p.id;
          concluir(certa);
          botoes.forEach((b, k) => {
            b.disabled = true;
            if (alternativas[k].id === p.id) b.classList.add("certa");
          });
          if (!certa) botoes[alternativas.indexOf(x)].classList.add("errada");
          resposta(certa ? "acerto" : "erro", certa ? "Certo!" : "Não foi dessa vez.");
        } }, tipo === "de-pt" ? x.portugues : palavraDE(x)));
        card.append(pergunta, el("div", { class: "opcoes" }, botoes));
        if (tipo === "de-pt" && config().autoAudio) falar(formaCompleta(p));
      } else if (tipo === "artigo") {
        card.append(el("div", { class: "quiz-pergunta" },
          el("span", { class: "palavra-de grande", lang: "de" }, "___ ", p.alemao),
          el("p", { class: "muted" }, p.portugues)));
        const botoes = ["der", "die", "das"].map((a) => el("button", { class: `btn art-${a}`, onclick: () => {
          if (respondida) return;
          const certa = a === p.artigo;
          concluir(certa);
          botoes.forEach((b) => {
            b.disabled = true;
            if (b.textContent === p.artigo) b.classList.add("certa", "opcao");
          });
          if (!certa) botoes.find((b) => b.textContent === a).classList.add("errada", "opcao");
          resposta(certa ? "acerto" : "erro", certa ? "Certo!" : `É ${p.artigo} (${NOMES_GENERO[p.artigo]}).`);
        } }, a));
        card.append(el("div", { class: "opcoes-artigo" }, botoes));
      } else {
        // digitar
        const input = el("input", { class: "input input-grande", lang: "de", autocomplete: "off", autocapitalize: "off", spellcheck: "false",
          placeholder: p.classe === "substantivo" ? "Ex.: der Tisch" : "Digite em alemão" });
        const verificar = () => {
          if (respondida) return;
          const digitado = input.value.trim();
          if (!digitado) return input.focus();
          const r = avaliarDigitado(p, digitado);
          concluir(r.nivel === "acerto");
          input.disabled = true;
          resposta(r.nivel, r.titulo, ...r.notas.map((n) => el("span", {}, n)));
        };
        input.addEventListener("keydown", (e) => { if (e.key === "Enter" && !respondida) { e.preventDefault(); e.stopPropagation(); verificar(); } });
        card.append(
          el("div", { class: "quiz-pergunta" }, el("span", { class: "palavra-pt grande" }, p.portugues),
            p.classe === "substantivo" ? el("p", { class: "muted" }, p.so_plural ? "Escreva com o artigo (palavra só no plural)." : "Escreva com o artigo (der/die/das).") : null),
          input, tecladoEspecial(input),
          el("button", { class: "btn", onclick: verificar }, "Verificar"));
        setTimeout(() => input.focus(), 50);
      }
      card.append(area, proximo);
      corpo.replaceChildren(card);
    }

    function resumo() {
      limparTecla?.();
      const pct = porcentagem(acertos, perguntas.length);
      corpo.replaceChildren(el("div", { class: "cartao-fim" },
        el("h3", {}, `${acertos} de ${perguntas.length} (${pct}%)`),
        el("p", {}, pct >= 90 ? "Excelente! 🎉" : pct >= 70 ? "Muito bem! Continue assim." : "Bom treino! Revise as palavras abaixo."),
        erros.length ? el("div", { class: "vocab-lista", style: "text-align:left" },
          el("strong", {}, "Para revisar:"),
          erros.map((p) => el("div", { class: "vocab-item" }, palavraDE(p), botoesAudio(formaCompleta(p)), " — ", p.portugues))) : null,
        el("div", { class: "grupo-botoes", style: "justify-content:center" },
          el("button", { class: "btn btn-primario", onclick: iniciar }, "Novo quiz"),
          el("button", { class: "btn", onclick: telaInicial }, "Mudar opções"))));
    }

    mostrar();
  }

  telaInicial();
  return () => limparTecla?.();
}

// Avalia a resposta digitada; para substantivos confere o artigo separadamente.
export function avaliarDigitado(p, digitado) {
  const esperado = formaCompleta(p);
  const r = avaliarEscrita(esperado, digitado);
  if (r.nivel === "acerto") return { nivel: "acerto", titulo: "Certo!", notas: r.notas };
  if (p.classe === "substantivo") {
    const partes = digitado.trim().split(/\s+/);
    const temArtigo = ["der", "die", "das"].includes(partes[0]?.toLowerCase());
    const substantivo = temArtigo ? partes.slice(1).join(" ") : digitado;
    const sub = avaliarEscrita(p.alemao, substantivo);
    if (sub.nivel === "acerto") {
      if (!temArtigo) return { nivel: "parcial", titulo: "Faltou o artigo!", notas: [`O correto é "${esperado}". Aprenda o substantivo sempre junto com o artigo.`, ...sub.notas] };
      return { nivel: "erro", titulo: `Artigo errado: é "${p.artigo}", não "${partes[0].toLowerCase()}".`, notas: sub.notas };
    }
  }
  if (r.nivel === "parcial") return { nivel: "parcial", titulo: "Quase!", notas: [`O correto é "${esperado}".`] };
  return { nivel: "erro", titulo: "Não foi dessa vez.", notas: [`O correto é "${esperado}".`] };
}


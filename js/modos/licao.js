// Lição: ensina palavras novas e as repete em exercícios variados até fixar (estilo Duolingo).
// Fluxo: apresentação de cada palavra → exercícios (figura, ouvir, traduzir, pares, digitar, falar).
// Errou? A palavra volta no fim da lição até acertar. No fim, as palavras entram nas revisões (SM-2).
import { el, palavraDE, soaComo, botoesAudio, feedback, tecladoEspecial, porcentagem, pluralDE, toast } from "../ui.js";
import { dados, palavrasAtivas, embaralhar, formaCompleta, ordenarParaEstudo } from "../dados.js";
import { falar, pararFala, ouvirFala, pararEscuta, reconhecimentoSuportado } from "../audio.js";
import { config, registrarResposta, cardDe, avaliarFlashcard, novasHoje } from "../progresso.js";
import { avaliarFala } from "../comparar.js";
import { avaliarDigitado } from "./quiz.js";

const TAMANHO_LICAO_AUTO = 6;

export function render(raiz) {
  let limpar = null;
  const corpo = el("div");
  raiz.append(corpo);

  const parametro = new URLSearchParams(location.hash.split("?")[1] || "").get("id");
  if (parametro) iniciar(parametro);
  else lista();

  function lista() {
    limpar?.();
    const licoes = dados().licoes;
    const atual = proximaLicao();
    corpo.replaceChildren(
      el("div", { class: "cabecalho-modo" }, el("h2", {}, "Lições"),
        el("p", { class: "muted" }, "Aprenda palavras novas aqui: cada palavra é apresentada com figura e som e depois aparece várias vezes em exercícios até fixar. Depois, os flashcards cuidam das revisões nos dias seguintes.")),
      atual ? el("a", { class: "btn btn-primario largo", href: `#/licoes?id=${atual.id}` }, `▶ Continuar: ${atual.titulo}`) : null,
      el("div", { class: "lista-licoes" },
        licoes.map((l, i) => {
          const vistas = l.palavras.filter((id) => cardDe(id)).length;
          const feita = vistas === l.palavras.length;
          const imgs = l.palavras.map((id) => dados().porId.get(id)?.imagem).filter(Boolean).slice(0, 4).join(" ");
          return el("a", { class: `licao-item ${feita ? "feita" : ""} ${atual?.id === l.id ? "atual" : ""}`, href: `#/licoes?id=${l.id}` },
            el("span", { class: "licao-num" }, feita ? "✓" : i + 1),
            el("span", { class: "licao-txt" }, el("strong", {}, l.titulo), el("small", { class: "muted" }, feita ? "concluída · toque para praticar de novo" : `${vistas}/${l.palavras.length} palavras`)),
            el("span", { class: "licao-imgs", "aria-hidden": "true" }, imgs));
        }),
        el("a", { class: `licao-item ${!atual || atual.id === "auto" ? "atual" : ""}`, href: "#/licoes?id=auto" },
          el("span", { class: "licao-num" }, "+"),
          el("span", { class: "licao-txt" }, el("strong", {}, "Próximas palavras"), el("small", { class: "muted" }, `Lição automática com as ${TAMANHO_LICAO_AUTO} próximas palavras que você ainda não viu (das mais simples às mais difíceis).`)))),
    );
  }

  function iniciar(id) {
    if (id === "auto") {
      const novas = ordenarParaEstudo(palavrasAtivas()).filter((p) => !cardDe(p.id)).slice(0, TAMANHO_LICAO_AUTO);
      if (!novas.length) {
        corpo.replaceChildren(feedback("acerto", "Você já viu todas as palavras dos níveis ativos!", el("span", {}, "Ative o próximo nível em Ajustes ou continue revisando nos flashcards.")));
        return;
      }
      return jogar({ id: "auto", titulo: "Próximas palavras", dica: "Palavras novas, das mais simples às mais difíceis." }, novas);
    }
    const licao = dados().licoes.find((l) => l.id === id);
    if (!licao) return lista();
    jogar(licao, licao.palavras.map((pid) => dados().porId.get(pid)).filter(Boolean));
  }

  // ------------------------------------------------------------------
  function jogar(licao, palavras) {
    let podeFalar = reconhecimentoSuportado();
    const seq = montarSequencia(palavras, podeFalar);
    const total = () => seq.length;
    let i = 0;
    const erros = Object.fromEntries(palavras.map((p) => [p.id, 0]));
    let acertosPrimeira = 0;
    let respondidas = 0;
    let continuar = null; // ação do botão "Continuar" (Enter)

    const tecla = (e) => {
      if (e.key !== "Enter" || !continuar || e.target.matches("input")) return;
      if (e.target.tagName === "BUTTON" && e.target.classList.contains("btn-continuar")) return; // clique nativo
      e.preventDefault();
      continuar();
    };
    document.addEventListener("keydown", tecla);
    limpar = () => { document.removeEventListener("keydown", tecla); pararEscuta(); pararFala(); };

    const sair = () => {
      if (!confirm("Sair da lição? As palavras só entram nas suas revisões quando a lição termina.")) return;
      limpar();
      location.hash = "#/licoes";
    };

    function proximo() {
      continuar = null;
      if (i >= seq.length) return concluir();
      const ex = seq[i++];
      const topo = el("div", { class: "licao-topo" },
        el("button", { class: "btn-sair", "aria-label": "Sair da lição", onclick: sair }, "✕"),
        el("div", { class: "progresso-barra" }, el("span", { style: `width:${porcentagem(i - 1, total())}%` })));
      const area = el("div", { class: "licao-area" });
      corpo.replaceChildren(el("div", { class: "licao" }, topo, area));
      ({ intro, imagem: escolhaSignificado, ouvir, "pt-de": escolhaAlemao, digitar, falar: exFalar, pares }[ex.tipo])(ex, area);
    }

    // Feedback no rodapé + botão Continuar. Se errou, a palavra volta no fim da lição.
    function resultado(area, ex, certo, { primeira = true, extra = [] } = {}) {
      const p = ex.p;
      if (p) {
        registrarResposta(p.id, certo);
        respondidas++;
        if (certo && primeira) acertosPrimeira++;
        if (!certo) {
          erros[p.id]++;
          seq.push({ tipo: ex.tipo === "pt-de" ? "imagem" : "pt-de", p, repeticao: true });
        }
        falar(formaCompleta(p));
      }
      const btn = el("button", { class: "btn btn-primario largo btn-continuar", onclick: () => proximo() }, "Continuar");
      area.append(el("div", { class: `licao-rodape ${certo ? "ok" : "erro"}` },
        p ? feedback(certo ? "acerto" : "erro", certo ? elogio() : "Quase! Guarde esta:",
          el("span", {}, palavraDE(p), " = ", p.portugues), soaComo(p), ...extra,
          !certo ? el("span", { class: "muted" }, "Ela vai aparecer de novo no fim da lição.") : null) : null,
        btn));
      continuar = () => btn.click();
      btn.focus({ preventScroll: true });
      btn.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }

    // ---------- tipos de exercício ----------
    function intro(ex, area) {
      const p = ex.p;
      area.append(
        el("p", { class: "licao-instrucao" }, "Palavra nova"),
        el("div", { class: "licao-intro-palavra" },
          imagemGrande(p),
          palavraDE(p, { tamanho: "grande" }),
          soaComo(p, { forcar: true }),
          botoesAudio(formaCompleta(p)),
          el("div", { class: "palavra-pt grande" }, p.portugues),
          pluralDE(p),
          p.nota ? el("div", { class: "nota" }, "💡 ", p.nota) : null),
        el("p", { class: "muted", style: "text-align:center" }, "Ouça e repita em voz alta 2 ou 3 vezes."));
      const btn = el("button", { class: "btn btn-primario largo btn-continuar", onclick: () => proximo() }, "Continuar");
      area.append(btn);
      continuar = () => btn.click();
      falar(formaCompleta(p));
    }

    function escolhaSignificado(ex, area) {
      const p = ex.p;
      const ops = embaralhar([p, ...distratores(p, palavras, (x) => x.portugues, 3)]);
      area.append(
        el("p", { class: "licao-instrucao" }, "O que significa?"),
        el("div", { class: "licao-pergunta" }, palavraDE(p, { tamanho: "grande" }), botoesAudio(formaCompleta(p))),
        grade(ops, (x) => [x.imagem ? el("span", { class: "op-img" }, x.imagem) : null, el("span", {}, x.portugues)], p, ex, area));
      falar(formaCompleta(p));
    }

    function ouvir(ex, area) {
      const p = ex.p;
      const ops = embaralhar([p, ...distratores(p, palavras, (x) => formaCompleta(x), 3)]);
      area.append(
        el("p", { class: "licao-instrucao" }, "Toque na palavra que você ouviu"),
        el("div", { class: "licao-pergunta" },
          el("button", { class: "btn-mic", style: "border-color:var(--der)", "aria-label": "Ouvir de novo", onclick: () => falar(formaCompleta(p)) }, "🔊"),
          el("button", { class: "btn", onclick: () => falar(formaCompleta(p), { lento: true }) }, "🐢 devagar")),
        grade(ops, (x) => palavraDE(x), p, ex, area, { lista: true }));
      falar(formaCompleta(p));
    }

    function escolhaAlemao(ex, area) {
      const p = ex.p;
      const ops = embaralhar([p, ...distratores(p, palavras, (x) => formaCompleta(x), 3)]);
      area.append(
        el("p", { class: "licao-instrucao" }, "Como se diz em alemão?"),
        el("div", { class: "licao-pergunta" }, imagemGrande(p), el("span", { class: "palavra-pt grande" }, p.portugues)),
        grade(ops, (x) => palavraDE(x), p, ex, area, { lista: true }));
    }

    function digitar(ex, area) {
      const p = ex.p;
      const input = el("input", { class: "input input-grande", lang: "de", autocomplete: "off", autocapitalize: "off", spellcheck: "false",
        placeholder: p.classe === "substantivo" ? "Ex.: der Tisch" : "Escreva em alemão" });
      let feito = false;
      const verificar = () => {
        if (feito || !input.value.trim()) return input.focus();
        feito = true;
        input.disabled = true;
        const r = avaliarDigitado(p, input.value.trim());
        // Para quem está aprendendo, "quase" (faltou o artigo, uma letra) conta como acerto, com o aviso.
        resultado(area, ex, r.nivel !== "erro", { extra: r.nivel === "acerto" ? r.notas.map((n) => el("span", {}, n)) : [el("span", {}, r.titulo), ...r.notas.map((n) => el("span", {}, n))] });
      };
      input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); e.stopPropagation(); feito ? continuar?.() : verificar(); } });
      area.append(
        el("p", { class: "licao-instrucao" }, "Escreva em alemão"),
        el("div", { class: "licao-pergunta" }, imagemGrande(p), el("span", { class: "palavra-pt grande" }, p.portugues),
          p.classe === "substantivo" ? el("small", { class: "muted" }, "com o artigo (der/die/das)") : null,
          el("button", { class: "btn btn-secundario", onclick: () => falar(formaCompleta(p)) }, "🔊 Dica: ouvir")),
        input, tecladoEspecial(input),
        el("button", { class: "btn largo", onclick: verificar }, "Verificar"));
      setTimeout(() => input.focus(), 50);
    }

    function exFalar(ex, area) {
      const p = ex.p;
      if (!podeFalar) return escolhaAlemao({ ...ex, tipo: "pt-de" }, area);
      const status = el("p", { class: "muted", style: "text-align:center" }, "Toque no microfone e diga a palavra.");
      let tentativas = 0;
      const mic = el("button", { class: "btn-mic", "aria-label": "Falar", onclick: async () => {
        if (mic.classList.contains("ouvindo")) return pararEscuta();
        mic.classList.add("ouvindo");
        status.textContent = "Ouvindo…";
        try {
          const { alternativas } = await ouvirFala();
          const r = avaliarFala(formaCompleta(p), alternativas);
          tentativas++;
          if (r.nivel !== "erro" || tentativas >= 3) {
            mic.disabled = true;
            pular.hidden = true;
            resultado(area, ex, r.nivel !== "erro", { primeira: tentativas === 1, extra: [el("span", {}, "Reconhecido: ", el("q", { lang: "de" }, r.texto || "(nada)"))] });
          } else {
            status.textContent = `Reconhecido: “${r.texto || "(nada)"}”. Ouça o modelo e tente de novo (${tentativas}/3).`;
          }
        } catch (e) {
          status.textContent = e.message;
        } finally {
          mic.classList.remove("ouvindo");
        }
      } }, "🎤");
      const pular = el("button", { class: "btn btn-secundario", onclick: () => {
        podeFalar = false;
        toast("Exercícios de fala desligados nesta lição.");
        proximo();
      } }, "Agora não posso falar");
      area.append(
        el("p", { class: "licao-instrucao" }, "Fale em alemão"),
        el("div", { class: "licao-pergunta" }, imagemGrande(p), palavraDE(p, { tamanho: "grande" }), soaComo(p, { forcar: true }), botoesAudio(formaCompleta(p))),
        mic, status, el("div", { style: "text-align:center" }, pular));
    }

    function pares(ex, area) {
      const lista = ex.ps;
      const esquerda = embaralhar(lista);
      const direita = embaralhar(lista);
      let selecionado = null;
      let restantes = lista.length;
      let errou = false;
      const botoesE = new Map();
      const botoesD = new Map();
      const tentar = (lado, p, btn) => {
        if (btn.disabled) return;
        if (!selecionado || selecionado.lado === lado) {
          (selecionado?.btn)?.classList.remove("selecionado");
          selecionado = { lado, p, btn };
          btn.classList.add("selecionado");
          if (lado === "e") falar(formaCompleta(p));
          return;
        }
        const outro = selecionado;
        selecionado = null;
        outro.btn.classList.remove("selecionado");
        if (outro.p.id === p.id) {
          for (const b of [botoesE.get(p.id), botoesD.get(p.id)]) { b.disabled = true; b.classList.add("certa"); }
          registrarResposta(p.id, true);
          if (lado === "d") falar(formaCompleta(p));
          if (--restantes === 0) {
            if (!errou) acertosPrimeira++;
            respondidas++;
            resultado(area, {}, true);
          }
        } else {
          errou = true;
          registrarResposta(outro.p.id, false);
          for (const b of [outro.btn, btn]) { b.classList.add("errada"); setTimeout(() => b.classList.remove("errada"), 600); }
        }
      };
      area.append(
        el("p", { class: "licao-instrucao" }, "Ligue os pares"),
        el("div", { class: "pares" },
          el("div", { class: "pares-col" }, esquerda.map((p) => { const b = el("button", { class: "btn opcao", onclick: () => tentar("e", p, b) }, palavraDE(p)); botoesE.set(p.id, b); return b; })),
          el("div", { class: "pares-col" }, direita.map((p) => { const b = el("button", { class: "btn opcao", onclick: () => tentar("d", p, b) }, p.imagem ? el("span", { class: "op-img" }, p.imagem) : null, p.portugues); botoesD.set(p.id, b); return b; }))));
    }

    // Grade de alternativas: marca certa/errada e chama o resultado.
    function grade(ops, conteudo, certa, ex, area, { lista = false } = {}) {
      let feito = false;
      const botoes = ops.map((x) => el("button", { class: `btn opcao ${lista ? "" : "opcao-card"}`, onclick: () => {
        if (feito) return;
        feito = true;
        const ok = x.id === certa.id;
        botoes.forEach((b, k) => { b.disabled = true; if (ops[k].id === certa.id) b.classList.add("certa"); });
        if (!ok) botoes[ops.indexOf(x)].classList.add("errada");
        resultado(area, ex, ok);
      } }, conteudo(x)));
      return el("div", { class: lista ? "opcoes" : "opcoes-grade" }, botoes);
    }

    function concluir() {
      limpar();
      const meta = config().metaDiaria;
      const novas = palavras.filter((p) => !cardDe(p.id));
      // Entra nas revisões espaçadas: sem erros = "bom"; com erros = "difícil" (revisa amanhã de qualquer forma).
      for (const p of novas) avaliarFlashcard(p.id, erros[p.id] ? 3 : 4);
      const pct = porcentagem(acertosPrimeira, respondidas);
      const prox = proximaLicao();
      corpo.replaceChildren(el("div", { class: "cartao-fim licao-fim" },
        el("div", { class: "licao-fim-emoji" }, pct >= 80 ? "🎉" : "💪"),
        el("h3", {}, `Lição concluída: ${licao.titulo}`),
        el("p", {}, `${pct}% de acertos de primeira.`),
        el("div", { class: "vocab-lista", style: "text-align:left" }, palavras.map((p) =>
          el("div", { class: "vocab-item" }, p.imagem ? el("span", { class: "op-img" }, p.imagem) : null, palavraDE(p), " ", soaComo(p), botoesAudio(formaCompleta(p)), el("span", { class: "vocab-pt" }, p.portugues),
            erros[p.id] ? el("span", { class: "etiqueta et-nova" }, `errou ${erros[p.id]}×`) : null))),
        el("p", { class: "muted" }, novas.length
          ? `${novas.length} palavra(s) entraram nas suas revisões: os flashcards vão trazê-las de volta amanhã. Novas hoje: ${novasHoje()} de ${meta}.`
          : "Prática concluída. Estas palavras já estavam nas suas revisões."),
        el("div", { class: "grupo-botoes", style: "justify-content:center" },
          prox ? el("a", { class: "btn btn-primario", href: `#/licoes?id=${prox.id}`}, `Próxima: ${prox.titulo}`) : null,
          el("a", { class: "btn", href: "#/licoes" }, "Todas as lições"))));
    }

    proximo();
  }

  return () => limpar?.();
}

// Próxima lição da trilha com palavras ainda não vistas; depois da trilha, a lição automática.
export function proximaLicao() {
  const l = dados().licoes.find((x) => x.palavras.some((id) => !cardDe(id)));
  if (l) return l;
  return ordenarParaEstudo(palavrasAtivas()).some((p) => !cardDe(p.id)) ? { id: "auto", titulo: "Próximas palavras" } : null;
}

function imagemGrande(p) {
  return p.imagem ? el("div", { class: "imagem-grande", "aria-hidden": "true" }, p.imagem) : null;
}

const ELOGIOS = ["Certo!", "Muito bem!", "Isso!", "Perfeito!", "Mandou bem!"];
const elogio = () => ELOGIOS[Math.floor(Math.random() * ELOGIOS.length)];

// Sequência da lição. Cada palavra aparece: apresentação → significado → (ouvir) → pares → tradução → mais um exercício.
export function montarSequencia(palavras, podeFalar) {
  const seq = [];
  const vistas = [];
  palavras.forEach((p, i) => {
    seq.push({ tipo: "intro", p });
    vistas.push(p);
    seq.push({ tipo: "imagem", p });
    if (i > 0) seq.push({ tipo: "ouvir", p: vistas[Math.floor(Math.random() * i)] });
  });
  if (palavras.length >= 3) seq.push({ tipo: "pares", ps: embaralhar(palavras).slice(0, 5) });
  const curta = (p) => p.alemao.split(/\s+/).length <= 2 && p.alemao.length <= 14;
  const bloco = [];
  for (const p of palavras) {
    bloco.push({ tipo: "pt-de", p });
    const tipos = ["ouvir", ...(curta(p) ? ["digitar"] : []), ...(podeFalar ? ["falar"] : [])];
    bloco.push({ tipo: tipos[Math.floor(Math.random() * tipos.length)], p });
  }
  seq.push(...semRepetirSeguido(embaralhar(bloco)));
  return seq;
}

// Evita a mesma palavra em dois exercícios seguidos.
function semRepetirSeguido(lista) {
  const out = [];
  const resto = [...lista];
  while (resto.length) {
    const ult = out[out.length - 1]?.p?.id;
    const k = resto.findIndex((x) => x.p?.id !== ult);
    out.push(resto.splice(k === -1 ? 0 : k, 1)[0]);
  }
  return out;
}

// Alternativas erradas: primeiro palavras da própria lição, depois do mesmo tema e da mesma classe.
function distratores(p, daLicao, chave, n) {
  const usados = new Set([chave(p)]);
  const imgs = new Set([p.imagem].filter(Boolean));
  const doTema = dados().palavras.filter((x) => x.tema === p.tema && x.nivel === p.nivel);
  const mesmaClasse = dados().palavras.filter((x) => x.classe === p.classe && x.nivel === p.nivel);
  const saida = [];
  for (const x of [...embaralhar(daLicao), ...embaralhar(doTema), ...embaralhar(mesmaClasse)]) {
    if (x.id === p.id || usados.has(chave(x)) || (x.imagem && imgs.has(x.imagem))) continue;
    usados.add(chave(x));
    if (x.imagem) imgs.add(x.imagem);
    saida.push(x);
    if (saida.length === n) break;
  }
  return saida;
}

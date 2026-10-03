// Painel de acompanhamento: aprendidas, revisões de hoje, sequência, acerto por tema.
import { el, porcentagem, toast } from "../ui.js";
import { dados, palavrasAtivas } from "../dados.js";
import { progresso, config, atualizarConfig, devidas, ehAprendida, novasHoje, sequenciaDias, totalDiasEstudados } from "../progresso.js";
import { hojeISO, somarDias } from "../sm2.js";

export function render(raiz) {
  const est = progresso();
  const todas = dados().palavras;
  const vistas = todas.filter((p) => est.cards[p.id]);
  const aprendidas = vistas.filter((p) => ehAprendida(p.id));
  const revisarHoje = devidas(palavrasAtivas());
  const meta = config().metaDiaria;
  const novas = novasHoje();
  const seq = sequenciaDias();
  const somaStats = (lista) => lista.reduce((s, p) => { const x = est.stats[p.id]; if (x) { s.a += x.acertos; s.e += x.erros; } return s; }, { a: 0, e: 0 });
  const geral = somaStats(todas);

  const stat = (valor, rotulo, extra = null) => el("div", { class: "stat" }, el("div", { class: "valor" }, valor), el("div", { class: "rotulo" }, rotulo), extra);
  const barra = (pct, cor = "var(--ok)") => el("div", { class: "progresso-barra" }, el("span", { style: `width:${Math.min(100, pct)}%;background:${cor}` }));

  const inputMeta = el("input", { class: "input", type: "number", min: 1, max: 100, value: meta, style: "max-width:90px;flex:0 0 auto", onchange: (e) => {
    const v = Math.min(100, Math.max(1, Number(e.target.value) || 15));
    atualizarConfig({ metaDiaria: v });
    toast(`Meta diária: ${v} palavras novas.`);
    // "change" também dispara no blur, inclusive quando a seção está sendo trocada: redesenha fora do evento.
    setTimeout(() => {
      if (!inputMeta.isConnected) return;
      raiz.replaceChildren();
      render(raiz);
    });
  } });

  raiz.append(
    el("div", { class: "cabecalho-modo" }, el("h2", {}, "Painel"),
      el("p", { class: "muted" }, revisarHoje.length || novas < meta
        ? `Hoje: ${revisarHoje.length} revisão(ões) e ${Math.max(0, meta - novas)} palavra(s) nova(s) para atingir a meta.`
        : "Meta de hoje cumprida! 🎉 Continue com quiz, fala ou diálogos."),
      el("a", { class: "btn btn-primario", href: "#/flashcards" }, "Estudar agora")),

    el("div", { class: "stats" },
      stat(aprendidas.length, "palavras aprendidas", el("small", { class: "muted" }, "≥ 2 revisões seguidas certas")),
      stat(vistas.length - aprendidas.length, "em estudo"),
      stat(revisarHoje.length, "para revisar hoje"),
      stat(`${novas}/${meta}`, "novas hoje (meta)", barra(porcentagem(novas, meta))),
      stat(`${seq} 🔥`, seq === 1 ? "dia seguido" : "dias seguidos", el("small", { class: "muted" }, `${totalDiasEstudados()} dia(s) estudados no total`)),
      stat(geral.a + geral.e ? `${porcentagem(geral.a, geral.a + geral.e)}%` : "–", "acerto geral", el("small", { class: "muted" }, `${geral.a + geral.e} respostas`))),

    el("div", { class: "cartao" },
      el("label", { class: "linha-controles" }, el("strong", {}, "Meta diária de palavras novas:"), inputMeta)),

    secaoNiveis(),
    secaoTemas(),
    secaoHistorico(),
    secaoProximas(),
  );

  function secaoNiveis() {
    return el("div", { class: "cartao secao" }, el("h3", {}, "Progresso por nível"),
      ["A1", "A2", "B1"].map((n) => {
        const doNivel = todas.filter((p) => p.nivel === n);
        const apr = doNivel.filter((p) => ehAprendida(p.id)).length;
        const ativo = config().niveis.includes(n);
        return el("div", { style: "margin-bottom:10px" },
          el("div", { class: "flash-status" },
            el("strong", {}, n, doNivel.length && !ativo ? el("span", { class: "etiqueta", style: "margin-left:6px" }, "inativo") : null),
            el("span", { class: "muted" }, doNivel.length ? `${apr} de ${doNivel.length} aprendidas (${porcentagem(apr, doNivel.length)}%)` : "conteúdo ainda não adicionado")),
          barra(porcentagem(apr, doNivel.length || 1)),
          doNivel.length && !ativo
            ? el("button", { class: "btn", style: "margin-top:8px", onclick: () => {
                atualizarConfig({ niveis: [...config().niveis, n] });
                toast(`Nível ${n} ativado: as palavras entram nos flashcards e nos exercícios.`);
                raiz.replaceChildren();
                render(raiz);
              } }, `Ativar ${n} nos estudos`)
            : null);
      }));
  }

  function secaoTemas() {
    const linhas = dados().temas.map((t) => {
      const doTema = todas.filter((p) => p.tema === t.id);
      const s = somaStats(doTema);
      const total = s.a + s.e;
      const pct = porcentagem(s.a, total);
      const cor = pct >= 80 ? "var(--ok)" : pct >= 60 ? "var(--parcial)" : "var(--erro)";
      return el("tr", {},
        el("td", {}, t.nome),
        el("td", { class: "num" }, `${doTema.filter((p) => est.cards[p.id]).length}/${doTema.length}`),
        el("td", { class: "num" }, doTema.filter((p) => ehAprendida(p.id)).length),
        el("td", { class: "num" }, total ? `${pct}%` : "–"),
        el("td", {}, total ? el("div", { class: "mini-barra", title: `${s.a} acertos, ${s.e} erros` }, el("span", { style: `width:${pct}%;background:${cor}` })) : null));
    });
    return el("div", { class: "cartao secao" }, el("h3", {}, "Taxa de acerto por tema"),
      el("p", { class: "muted" }, "Soma de flashcards, quiz, ditado e fala."),
      el("div", { class: "tabela-rolagem" }, el("table", { class: "tabela-temas" },
        el("thead", {}, el("tr", {}, el("th", {}, "Tema"), el("th", { class: "num" }, "Vistas"), el("th", { class: "num" }, "Aprend."), el("th", { class: "num" }, "Acerto"), el("th", {}, ""))),
        el("tbody", {}, linhas))));
  }

  function secaoHistorico() {
    const hoje = hojeISO();
    const dias = Array.from({ length: 14 }, (_, i) => somarDias(hoje, i - 13));
    const valores = dias.map((d) => { const h = est.historico[d]; return h ? h.acertos + h.erros : 0; });
    const max = Math.max(1, ...valores);
    return el("div", { class: "cartao secao" }, el("h3", {}, "Últimos 14 dias"),
      el("p", { class: "muted" }, "Respostas por dia (todas as atividades)."),
      el("div", { class: "historico", role: "img", "aria-label": `Respostas por dia: ${valores.join(", ")}` },
        dias.map((d, i) => el("div", { class: "col", title: `${d.split("-").reverse().join("/")}: ${valores[i]} respostas` },
          valores[i] ? el("small", {}, valores[i]) : null,
          el("span", { class: "barra", style: `height:${(valores[i] / max) * 70}%;${d === hoje ? "background:var(--das)" : ""}` }),
          el("small", {}, d.slice(8))))));
  }

  function secaoProximas() {
    const hoje = hojeISO();
    const prox = Array.from({ length: 7 }, (_, i) => {
      const d = somarDias(hoje, i + 1);
      return { d, n: Object.values(est.cards).filter((c) => c.vencimento === d).length };
    });
    return el("div", { class: "cartao secao" }, el("h3", {}, "Próximas revisões"),
      el("div", { class: "linha-controles" }, prox.map(({ d, n }) =>
        el("span", { class: "etiqueta" }, `${d.slice(8)}/${d.slice(5, 7)}: ${n}`))));
  }
}

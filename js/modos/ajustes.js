// Configurações e backup do progresso (exportar/importar JSON).
import { el, toast } from "../ui.js";
import { dados } from "../dados.js";
import { falar, vozesAlemas, sinteseSuportada, reconhecimentoSuportado } from "../audio.js";
import { config, atualizarConfig, exportar, importar, resetar } from "../progresso.js";
import { hojeISO } from "../sm2.js";
import { podeInstalar, instalar, instalado, ehIOS, offlineSuportado, cacheOfflinePronto, aoMudarInstalacao } from "../pwa.js";

export function render(raiz) {
  const c = config();
  const niveisComConteudo = new Set(dados().temas.map((t) => t.nivel));

  const meta = el("input", { class: "input", type: "number", min: 1, max: 100, value: c.metaDiaria, onchange: (e) => {
    const v = Math.min(100, Math.max(1, Number(e.target.value) || 15));
    e.target.value = v;
    atualizarConfig({ metaDiaria: v });
    toast(`Meta diária: ${v} palavras novas.`);
  } });

  const velocidade = (chave, rotulo, min, max) => {
    const saida = el("span", { class: "muted" }, String(c[chave]));
    return el("label", {}, rotulo,
      el("span", { class: "linha-controles" },
        el("input", { type: "range", min, max, step: 0.05, value: c[chave], oninput: (e) => { saida.textContent = e.target.value; }, onchange: (e) => {
          atualizarConfig({ [chave]: Number(e.target.value) });
          falar("Guten Tag! Wie geht es Ihnen?", { lento: chave === "velocidadeLenta" });
        } }), saida));
  };

  const vozes = vozesAlemas();
  const seletorVoz = vozes.length
    ? el("select", { class: "select", onchange: (e) => { atualizarConfig({ vozURI: e.target.value || null }); falar("Hallo, ich bin deine Stimme."); } },
        el("option", { value: "" }, "Automática (de-DE preferida)"),
        vozes.map((v) => el("option", { value: v.voiceURI, selected: v.voiceURI === c.vozURI }, `${v.name} (${v.lang})`)))
    : el("span", { class: "muted" }, sinteseSuportada() ? "Nenhuma voz alemã instalada neste aparelho." : "Síntese de voz não suportada.");

  const direcao = el("select", { class: "select", onchange: (e) => atualizarConfig({ direcaoFlash: e.target.value }) },
    [["de-pt", "Alemão → português"], ["pt-de", "Português → alemão"], ["misto", "Misturado"]].map(([v, r]) => el("option", { value: v, selected: v === c.direcaoFlash }, r)));

  const chipsNivel = el("div", { class: "chips" }, ["A1", "A2", "B1"].map((n) => {
    const tem = niveisComConteudo.has(n);
    return el("button", { type: "button", class: "chip", "aria-pressed": String(c.niveis.includes(n)), disabled: !tem, title: tem ? "" : "Ainda sem palavras neste nível",
      onclick: (e) => {
        const atual = new Set(config().niveis);
        atual.has(n) ? atual.delete(n) : atual.add(n);
        if (!atual.size) return toast("Mantenha pelo menos um nível ativo.");
        atualizarConfig({ niveis: [...atual] });
        e.currentTarget.setAttribute("aria-pressed", String(atual.has(n)));
      } }, tem ? n : `${n} (em breve)`);
  }));

  const chipsTema = el("div", { class: "chips" }, dados().temas.map((t) =>
    el("button", { type: "button", class: "chip", "aria-pressed": String(!c.temas.length || c.temas.includes(t.id)),
      onclick: (e) => {
        const todos = dados().temas.map((x) => x.id);
        const atual = new Set(config().temas.length ? config().temas : todos);
        atual.has(t.id) ? atual.delete(t.id) : atual.add(t.id);
        if (!atual.size) return toast("Mantenha pelo menos um tema ativo.");
        atualizarConfig({ temas: atual.size === todos.length ? [] : [...atual] });
        e.currentTarget.setAttribute("aria-pressed", String(atual.has(t.id)));
      } }, t.nome)));

  const arquivo = el("input", { type: "file", accept: "application/json,.json", hidden: true, onchange: async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      importar(await f.text());
      toast("Progresso importado com sucesso.", "ok");
      setTimeout(() => location.reload(), 600);
    } catch (err) {
      toast("Não foi possível importar: " + err.message, "erro");
    }
    e.target.value = "";
  } });

  const cartaoInstalar = el("div", { class: "cartao secao", id: "instalar" });
  const desenharInstalar = async () => {
    const offline = await cacheOfflinePronto();
    cartaoInstalar.replaceChildren(
      el("h3", {}, "📲 Instalar no celular"),
      instalado()
        ? el("p", {}, "✓ O app está instalado neste aparelho.")
        : el("p", { class: "muted" }, "Instalado, o app abre pelo ícone na tela inicial, em tela cheia, e funciona sem internet."),
      el("p", {}, "Funcionar offline: ", offline ? "✓ pronto — o app inteiro está guardado neste aparelho" : offlineSuportado() ? "⏳ preparando (abra o app uma vez com internet)" : "✗ indisponível aqui (exige https)"),
      podeInstalar() ? el("button", { class: "btn btn-primario", onclick: async () => { if (await instalar()) toast("App instalado!", "ok"); } }, "Instalar app") : null,
      instalado() ? null : ehIOS()
        ? el("p", { class: "muted" }, "iPhone/iPad: abra no Safari, toque em Compartilhar (□↑) › \"Adicionar à Tela de Início\".")
        : el("p", { class: "muted" }, "Android: no Chrome, toque no menu ⋮ › \"Instalar app\" (ou \"Adicionar à tela inicial\")."),
      el("p", { class: "muted" }, "Sem internet: flashcards, quiz, ditado, diálogos e painel funcionam. A pronúncia usa a voz alemã instalada no aparelho. O treino de fala precisa de internet (o reconhecimento de voz do Chrome roda nos servidores do Google)."),
    );
  };
  desenharInstalar();
  const pararDeOuvir = aoMudarInstalacao(desenharInstalar);

  raiz.append(
    el("div", { class: "cabecalho-modo" }, el("h2", {}, "Ajustes")),
    cartaoInstalar,
    el("div", { class: "cartao config-grade" },
      el("label", {}, "Meta diária de palavras novas", meta, el("small", { class: "muted" }, "Quantas palavras novas entram nos flashcards por dia (as revisões não contam).")),
      el("label", {}, "Direção dos flashcards", direcao),
      el("label", { class: "check" }, el("input", { type: "checkbox", checked: c.autoAudio, onchange: (e) => atualizarConfig({ autoAudio: e.target.checked }) }), " Tocar o áudio automaticamente"),
      velocidade("velocidade", "Velocidade normal da voz", 0.5, 1.3),
      velocidade("velocidadeLenta", "Velocidade lenta (botão 🐢)", 0.3, 0.9),
      el("label", {}, "Voz", seletorVoz),
      el("div", {}, el("strong", {}, "Níveis ativos"), chipsNivel),
      el("div", {}, el("strong", {}, "Temas ativos"), el("p", { class: "muted" }, "Os modos de estudo usam só os temas marcados."), chipsTema),
    ),
    el("div", { class: "cartao secao" },
      el("h3", {}, "Backup do progresso"),
      el("p", { class: "muted" }, "O progresso fica salvo só neste navegador. Exporte um arquivo para não perder ou para levar para outro aparelho."),
      el("div", { class: "grupo-botoes" },
        el("button", { class: "btn btn-primario", onclick: baixar }, "⬇ Exportar progresso (JSON)"),
        el("button", { class: "btn", onclick: () => arquivo.click() }, "⬆ Importar progresso"),
        arquivo,
        el("button", { class: "btn btn-perigo", onclick: () => {
          if (confirm("Apagar TODO o progresso deste navegador? Exporte antes se quiser guardar.")) {
            resetar();
            toast("Progresso apagado.");
            setTimeout(() => location.reload(), 600);
          }
        } }, "Apagar progresso"))),
    el("div", { class: "cartao secao" },
      el("h3", {}, "Compatibilidade deste navegador"),
      el("ul", {},
        el("li", {}, "Síntese de voz: ", sinteseSuportada() ? "✓ disponível" : "✗ indisponível"),
        el("li", {}, "Vozes em alemão: ", vozes.length ? `✓ ${vozes.length}` : "✗ nenhuma"),
        el("li", {}, "Reconhecimento de fala: ", reconhecimentoSuportado() ? "✓ disponível" : "✗ indisponível (use o Chrome)"),
        el("li", {}, "Contexto seguro (https/localhost, exigido pelo microfone): ", window.isSecureContext ? "✓ sim" : "✗ não"))),
  );
  return pararDeOuvir;
}

function baixar() {
  const blob = new Blob([exportar()], { type: "application/json" });
  const a = el("a", { href: URL.createObjectURL(blob), download: `progresso-alemao-${hojeISO()}.json` });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// Inicialização e roteamento por hash (#/rota).
import { carregarDados } from "./dados.js";
import { el } from "./ui.js";
import { sinteseSuportada, vozesAlemas } from "./audio.js";
import { iniciarPWA } from "./pwa.js";
import { perfis, perfilAtivo, precisaEscolher, trocarPerfil, marcarEscolhido } from "./perfis.js";

const ROTAS = [
  { id: "painel", rotulo: "Painel", icone: "📊", modulo: "./modos/painel.js" },
  { id: "licoes", rotulo: "Lições", icone: "🎓", modulo: "./modos/licao.js" },
  { id: "flashcards", rotulo: "Revisar", icone: "🃏", modulo: "./modos/flashcards.js" },
  { id: "quiz", rotulo: "Quiz", icone: "❓", modulo: "./modos/quiz.js" },
  { id: "ouvir", rotulo: "Ouvir e escrever", icone: "🎧", modulo: "./modos/ouvir.js" },
  { id: "fala", rotulo: "Falar", icone: "🎤", modulo: "./modos/fala.js" },
  { id: "dialogos", rotulo: "Diálogos", icone: "💬", modulo: "./modos/dialogos.js" },
  { id: "pronuncia", rotulo: "Pronúncia", icone: "👄", modulo: "./modos/pronuncia.js" },
  { id: "vocabulario", rotulo: "Vocabulário", icone: "📚", modulo: "./modos/vocabulario.js" },
  { id: "ajustes", rotulo: "Ajustes", icone: "⚙️", modulo: "./modos/ajustes.js" },
];

const main = document.getElementById("conteudo");
const nav = document.getElementById("nav");
let limpar = null;

function montarNav() {
  nav.replaceChildren(...ROTAS.map((r) => el("a", { href: `#/${r.id}`, "data-rota": r.id }, el("span", { "aria-hidden": "true" }, r.icone), " ", r.rotulo)));
}

async function navegar() {
  const id = location.hash.replace(/^#\/?/, "").split("?")[0] || "painel";
  const rota = ROTAS.find((r) => r.id === id) || ROTAS[0];
  nav.querySelectorAll("a").forEach((a) => a.classList.toggle("ativo", a.dataset.rota === rota.id));
  nav.querySelector(".ativo")?.scrollIntoView({ block: "nearest", inline: "center" });
  if (typeof limpar === "function") limpar();
  limpar = null;
  main.replaceChildren();
  try {
    const mod = await import(rota.modulo);
    limpar = mod.render(main) || null;
  } catch (e) {
    console.error(e);
    main.append(el("div", { class: "feedback fb-erro" }, el("strong", {}, "Erro ao abrir esta seção."), el("div", {}, e.message)));
  }
  main.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

function avisosAudio() {
  const aviso = document.getElementById("aviso-audio");
  if (!sinteseSuportada()) {
    aviso.textContent = "Este navegador não tem síntese de voz: os botões 🔊 ficarão desativados. Use o Chrome (computador ou Android).";
    aviso.hidden = false;
    return;
  }
  // As vozes carregam de forma assíncrona; espera um pouco antes de avisar.
  setTimeout(() => {
    if (!vozesAlemas().length) {
      aviso.textContent = "Nenhuma voz em alemão foi encontrada. O áudio pode sair com sotaque errado. No Android: Configurações › Idioma › Saída de texto para voz › instale \"Alemão\". No Windows: Configurações › Hora e idioma › Fala.";
      aviso.hidden = false;
    }
  }, 2500);
}

function mostrarPerfil() {
  const chip = document.getElementById("perfil-chip");
  chip.textContent = `👤 ${perfilAtivo().nome}`;
  chip.title = perfis().length > 1 ? "Trocar de perfil" : "Perfis";
}

// Com mais de um perfil no aparelho, pergunta quem vai estudar ao abrir o app.
function escolherPerfil() {
  return new Promise((resolve) => {
    main.replaceChildren(el("div", { class: "cartao escolher-perfil" },
      el("h2", {}, "Quem vai estudar?"),
      el("div", { class: "opcoes" }, perfis().map((p) =>
        el("button", { class: `btn opcao ${p.id === perfilAtivo().id ? "certa" : ""}`, onclick: () => {
          if (p.id === perfilAtivo().id) {
            marcarEscolhido();
            resolve();
          } else trocarPerfil(p.id);
        } }, `👤 ${p.nome}`))),
      el("p", { class: "muted" }, "Cada perfil tem o seu próprio progresso. Para criar ou renomear perfis: Ajustes › Perfis.")));
  });
}

async function iniciar() {
  iniciarPWA();
  montarNav();
  mostrarPerfil();
  if (precisaEscolher()) await escolherPerfil();
  try {
    await carregarDados();
  } catch (e) {
    main.replaceChildren(el("div", { class: "feedback fb-erro" },
      el("strong", {}, "Não foi possível carregar os dados."),
      el("p", {}, e.message),
      el("p", {}, "Abra o app por um servidor local (veja o README), não clicando direto no index.html: navegadores bloqueiam a leitura de arquivos JSON em file://.")));
    return;
  }
  avisosAudio();
  window.addEventListener("hashchange", navegar);
  navegar();
}

iniciar();

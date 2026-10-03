// PWA: registro do service worker (uso offline), aviso de nova versão e instalação.
import { el } from "./ui.js";

let eventoInstalar = null;
const ouvintes = new Set();

export const podeInstalar = () => !!eventoInstalar;
export const instalado = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
export const ehIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
export const offlineSuportado = () => "serviceWorker" in navigator && window.isSecureContext;

// Avisa a tela de Ajustes quando o botão "Instalar" passa a valer (ou deixa de valer).
export function aoMudarInstalacao(fn) {
  ouvintes.add(fn);
  return () => ouvintes.delete(fn);
}
const avisar = () => ouvintes.forEach((fn) => fn());

export async function instalar() {
  if (!eventoInstalar) return false;
  eventoInstalar.prompt();
  const { outcome } = await eventoInstalar.userChoice;
  eventoInstalar = null;
  avisar();
  return outcome === "accepted";
}

export async function cacheOfflinePronto() {
  if (!offlineSuportado()) return false;
  const reg = await navigator.serviceWorker.getRegistration();
  return !!reg?.active;
}

export function iniciarPWA() {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    eventoInstalar = e;
    avisar();
  });
  window.addEventListener("appinstalled", () => {
    eventoInstalar = null;
    avisar();
  });

  // Pede ao navegador para não apagar o progresso (localStorage) quando faltar espaço.
  navigator.storage?.persist?.().catch(() => {});

  if (!offlineSuportado()) return;
  let recarregando = false;
  // Na primeira visita o service worker assume a página sem mudar nada nela: só recarrega em atualizações.
  const tinhaVersao = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (recarregando || !tinhaVersao) return;
    recarregando = true;
    location.reload();
  });
  navigator.serviceWorker.register("sw.js").then((reg) => {
    const oferecer = (sw) => {
      // Só oferece atualização se já havia uma versão controlando a página (não na 1ª instalação).
      if (!sw || !navigator.serviceWorker.controller) return;
      bannerAtualizacao(() => sw.postMessage("ativar"));
    };
    if (reg.waiting) oferecer(reg.waiting);
    reg.addEventListener("updatefound", () => {
      const novo = reg.installing;
      novo?.addEventListener("statechange", () => { if (novo.state === "installed") oferecer(novo); });
    });
    // Procura versão nova ao abrir o app e a cada hora com ele aberto.
    setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
  }).catch((e) => console.warn("Service worker não registrado:", e));
}

function bannerAtualizacao(ativar) {
  if (document.getElementById("banner-atualizacao")) return;
  document.body.append(el("div", { id: "banner-atualizacao", class: "banner-atualizacao", role: "status" },
    el("span", {}, "Há uma versão nova do app (palavras ou correções)."),
    el("button", { class: "btn btn-primario", onclick: ativar }, "Atualizar")));
}

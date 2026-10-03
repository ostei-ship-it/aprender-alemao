// Service worker: guarda o app inteiro no aparelho para funcionar offline.
// A lista de arquivos e a versão são geradas por scripts/gerar-pwa.mjs (não edite o bloco à mão).
// ---- início do bloco gerado ----
const VERSAO = "1ef74eb11315";
const ARQUIVOS = [
  "./",
  "./css/style.css",
  "./data/dialogos.json",
  "./data/pronuncia.json",
  "./data/vocab/a1/adjetivos.json",
  "./data/vocab/a1/basico.json",
  "./data/vocab/a1/casa.json",
  "./data/vocab/a1/cidade.json",
  "./data/vocab/a1/clima.json",
  "./data/vocab/a1/comida.json",
  "./data/vocab/a1/compras.json",
  "./data/vocab/a1/cores.json",
  "./data/vocab/a1/corpo.json",
  "./data/vocab/a1/cumprimentos.json",
  "./data/vocab/a1/familia.json",
  "./data/vocab/a1/numeros.json",
  "./data/vocab/a1/roupas.json",
  "./data/vocab/a1/tempo.json",
  "./data/vocab/a1/trabalho.json",
  "./data/vocab/a1/verbos.json",
  "./data/vocab/a2/conectores.json",
  "./data/vocab/a2/consumo.json",
  "./data/vocab/a2/cozinha.json",
  "./data/vocab/a2/eventos.json",
  "./data/vocab/a2/lazer.json",
  "./data/vocab/a2/moradia.json",
  "./data/vocab/a2/natureza.json",
  "./data/vocab/a2/profissao.json",
  "./data/vocab/a2/saude.json",
  "./data/vocab/a2/sentimentos.json",
  "./data/vocab/a2/tecnologia.json",
  "./data/vocab/a2/verbos-a2.json",
  "./data/vocab/a2/viagem.json",
  "./data/vocab/index.json",
  "./icons/apple-touch-icon.png",
  "./icons/icone-192.png",
  "./icons/icone-512.png",
  "./icons/icone.svg",
  "./index.html",
  "./js/app.js",
  "./js/audio.js",
  "./js/comparar.js",
  "./js/dados.js",
  "./js/modos/ajustes.js",
  "./js/modos/dialogos.js",
  "./js/modos/fala.js",
  "./js/modos/flashcards.js",
  "./js/modos/ouvir.js",
  "./js/modos/painel.js",
  "./js/modos/pronuncia.js",
  "./js/modos/quiz.js",
  "./js/modos/vocabulario.js",
  "./js/perfis.js",
  "./js/progresso.js",
  "./js/pwa.js",
  "./js/sm2.js",
  "./js/ui.js",
  "./manifest.webmanifest",
];
// ---- fim do bloco gerado ----

const CACHE = `deutsch-lernen-${VERSAO}`;

self.addEventListener("install", (ev) => {
  ev.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARQUIVOS)));
});

self.addEventListener("activate", (ev) => {
  ev.waitUntil(
    caches.keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n.startsWith("deutsch-lernen-") && n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

// A página pede para ativar a versão nova quando o usuário aceita atualizar.
self.addEventListener("message", (ev) => {
  if (ev.data === "ativar") self.skipWaiting();
});

// Cache primeiro (funciona offline); o que não estiver no cache vai para a rede.
self.addEventListener("fetch", (ev) => {
  const req = ev.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  ev.respondWith(
    caches.match(req, { ignoreSearch: true }).then((cache) => cache || fetch(req).catch(() =>
      req.mode === "navigate" ? caches.match("./index.html") : Response.error())),
  );
});

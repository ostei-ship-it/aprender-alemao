// Áudio via Web Speech API: síntese (pronúncia) e reconhecimento (treino de fala).
import { config } from "./progresso.js";

const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;
let vozes = [];

const ehAlemao = (v) => v.lang.replace("_", "-").toLowerCase().startsWith("de");

function carregarVozes() {
  if (!synth) return;
  vozes = synth.getVoices().filter(ehAlemao);
  // Preferência: de-DE (Hochdeutsch da Alemanha) antes de de-AT/de-CH.
  vozes.sort((a, b) => Number(b.lang.replace("_", "-") === "de-DE") - Number(a.lang.replace("_", "-") === "de-DE"));
}

if (synth) {
  carregarVozes();
  synth.addEventListener?.("voiceschanged", carregarVozes);
}

export const sinteseSuportada = () => !!synth && typeof window.SpeechSynthesisUtterance === "function";
export const vozesAlemas = () => vozes;

function vozEscolhida() {
  const uri = config().vozURI;
  return vozes.find((v) => v.voiceURI === uri) || vozes[0] || null;
}

// Fala um texto em alemão. Retorna uma Promise resolvida ao terminar.
export function falar(texto, { lento = false } = {}) {
  if (!sinteseSuportada()) return Promise.resolve(false);
  return new Promise((resolve) => {
    synth.cancel();
    const u = new SpeechSynthesisUtterance(texto);
    u.lang = "de-DE";
    const voz = vozEscolhida();
    if (voz) u.voice = voz;
    u.rate = lento ? config().velocidadeLenta : config().velocidade;
    u.onend = () => resolve(true);
    u.onerror = () => resolve(false);
    synth.speak(u);
    // Chrome às vezes não dispara onend; garante a resolução.
    setTimeout(() => resolve(true), 1500 + texto.length * 180 / u.rate);
  });
}

export const pararFala = () => synth?.cancel();

// ---------- Reconhecimento de fala ----------
const Reconhecimento = typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : undefined;

export const reconhecimentoSuportado = () => !!Reconhecimento;

const MENSAGENS_ERRO = {
  "not-allowed": "Permissão de microfone negada. Libere o microfone nas configurações do site (ícone de cadeado na barra de endereço). No celular, o site precisa estar em https.",
  "service-not-allowed": "O navegador não permitiu o serviço de reconhecimento. No celular, abra o app por https (ou localhost).",
  "no-speech": "Não ouvi nada. Tente de novo, falando um pouco mais alto e perto do microfone.",
  "audio-capture": "Nenhum microfone encontrado.",
  network: "O reconhecimento de voz do Chrome precisa de internet. Verifique a conexão.",
  aborted: "Reconhecimento cancelado.",
  "language-not-supported": "O reconhecimento em alemão (de-DE) não está disponível neste navegador.",
};

let ativo = null;

// Escuta uma fala em alemão. Resolve com { alternativas: [{texto, confianca}] }.
export function ouvirFala({ maxAlternativas = 5, onInicio } = {}) {
  if (!Reconhecimento) return Promise.reject(new Error("Reconhecimento de fala não suportado neste navegador."));
  pararFala();
  return new Promise((resolve, reject) => {
    const r = new Reconhecimento();
    ativo = r;
    r.lang = "de-DE";
    r.interimResults = false;
    r.continuous = false;
    r.maxAlternatives = maxAlternativas;
    let recebido = false;
    r.onstart = () => onInicio?.();
    r.onresult = (ev) => {
      recebido = true;
      const res = ev.results[0];
      const alternativas = [];
      for (let i = 0; i < res.length; i++) alternativas.push({ texto: res[i].transcript.trim(), confianca: res[i].confidence });
      resolve({ alternativas });
    };
    r.onerror = (ev) => {
      recebido = true;
      reject(new Error(MENSAGENS_ERRO[ev.error] || `Erro no reconhecimento: ${ev.error}`));
    };
    r.onend = () => {
      ativo = null;
      if (!recebido) reject(new Error(MENSAGENS_ERRO["no-speech"]));
    };
    try {
      r.start();
    } catch (e) {
      reject(e);
    }
  });
}

export const pararEscuta = () => {
  try {
    ativo?.abort();
  } catch {
    /* já parado */
  }
};

// ---------- Gravação (alternativa quando não há reconhecimento) ----------
export const gravacaoSuportada = () => typeof window.MediaRecorder === "function" && !!navigator.mediaDevices?.getUserMedia;

export async function iniciarGravacao() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const rec = new MediaRecorder(stream);
  const partes = [];
  rec.ondataavailable = (e) => partes.push(e.data);
  rec.start();
  return {
    parar: () =>
      new Promise((resolve) => {
        rec.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
          resolve(URL.createObjectURL(new Blob(partes, { type: rec.mimeType })));
        };
        rec.stop();
      }),
  };
}

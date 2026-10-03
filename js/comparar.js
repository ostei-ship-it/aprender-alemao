// Comparação de respostas (fala reconhecida e texto digitado) com o texto esperado.

// --- números por extenso (o reconhecedor costuma devolver "3" em vez de "drei") ---
const UNIDADES = ["null", "eins", "zwei", "drei", "vier", "fünf", "sechs", "sieben", "acht", "neun", "zehn", "elf", "zwölf", "dreizehn", "vierzehn", "fünfzehn", "sechzehn", "siebzehn", "achtzehn", "neunzehn"];
const DEZENAS = ["", "", "zwanzig", "dreißig", "vierzig", "fünfzig", "sechzig", "siebzig", "achtzig", "neunzig"];

export function numeroPorExtenso(n) {
  if (!Number.isInteger(n) || n < 0 || n > 999999) return String(n);
  if (n < 20) return UNIDADES[n];
  if (n < 100) {
    const u = n % 10;
    const d = DEZENAS[Math.floor(n / 10)];
    return u === 0 ? d : `${u === 1 ? "ein" : UNIDADES[u]}und${d}`;
  }
  if (n < 1000) {
    const c = Math.floor(n / 100);
    const resto = n % 100;
    return `${c === 1 ? "hundert" : UNIDADES[c] + "hundert"}${resto ? numeroPorExtenso(resto) : ""}`;
  }
  const m = Math.floor(n / 1000);
  const resto = n % 1000;
  return `${m === 1 ? "tausend" : numeroPorExtenso(m).replace(/eins$/, "ein") + "tausend"}${resto ? numeroPorExtenso(resto) : ""}`;
}

// --- normalização ---
export function normalizar(texto, { tolerarGrafia = false } = {}) {
  let t = texto
    .toLowerCase()
    .replace(/[„“”"‚‘’'«»]/g, "")
    .replace(/(\d+)[.,](\d+)/g, "$1 $2") // 7,50 -> 7 50
    .replace(/\d+/g, (d) => " " + numeroPorExtenso(Number(d)) + " ")
    .replace(/[.,!?;:¿¡()–—-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (tolerarGrafia) t = t.replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss");
  return t;
}

export function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let ant = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const atual = [i];
    for (let j = 1; j <= b.length; j++) {
      atual[j] = Math.min(ant[j] + 1, atual[j - 1] + 1, ant[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    ant = atual;
  }
  return ant[b.length];
}

export function similaridade(a, b) {
  const maior = Math.max(a.length, b.length);
  return maior === 0 ? 1 : 1 - levenshtein(a, b) / maior;
}

// Marca quais palavras do texto esperado aparecem (em ordem) no texto dito.
// Uma palavra "quase igual" (similaridade >= 0,75) conta como encontrada.
export function alinharPalavras(esperado, dito) {
  const E = normalizar(esperado).split(" ").filter(Boolean);
  const D = normalizar(dito).split(" ").filter(Boolean);
  const igual = (x, y) => x === y || similaridade(x, y) >= 0.75;
  // LCS com tolerância
  const m = Array.from({ length: E.length + 1 }, () => new Array(D.length + 1).fill(0));
  for (let i = E.length - 1; i >= 0; i--)
    for (let j = D.length - 1; j >= 0; j--) m[i][j] = igual(E[i], D[j]) ? m[i + 1][j + 1] + 1 : Math.max(m[i + 1][j], m[i][j + 1]);
  const marcados = E.map((p) => ({ palavra: p, ok: false }));
  let i = 0;
  let j = 0;
  while (i < E.length && j < D.length) {
    if (igual(E[i], D[j])) {
      marcados[i].ok = true;
      i++;
      j++;
    } else if (m[i + 1][j] >= m[i][j + 1]) i++;
    else j++;
  }
  return marcados;
}

// Avalia uma fala: escolhe a melhor alternativa do reconhecedor.
// nivel: "acerto" | "parcial" | "erro"
export function avaliarFala(esperado, alternativas) {
  const alvo = normalizar(esperado);
  let melhor = null;
  for (const alt of alternativas) {
    const n = normalizar(alt.texto);
    const sim = similaridade(alvo, n);
    const palavras = alinharPalavras(esperado, alt.texto);
    // Cobertura ponderada pelo tamanho das palavras: esquecer "der" pesa menos que esquecer "Bahnhof".
    const tam = (lista) => lista.reduce((s, p) => s + p.palavra.length, 0);
    const cobertura = tam(palavras.filter((p) => p.ok)) / Math.max(1, tam(palavras));
    const nota = Math.max(sim, cobertura * 0.98);
    if (!melhor || nota > melhor.nota) melhor = { texto: alt.texto, nota, palavras, similaridade: sim };
  }
  if (!melhor) return { nivel: "erro", nota: 0, texto: "", palavras: alinharPalavras(esperado, "") };
  const nivel = melhor.nota >= 0.9 ? "acerto" : melhor.nota >= 0.6 ? "parcial" : "erro";
  return { ...melhor, nivel };
}

// Avalia texto digitado. Distingue erro real de detalhes (maiúscula, umlaut digitado como ae/oe/ue).
export function avaliarEscrita(esperado, digitado) {
  const notas = [];
  const exato = normalizar(esperado) === normalizar(digitado);
  if (exato) {
    if (esperado.replace(/[.!?]$/, "").trim() !== digitado.replace(/[.!?]$/, "").trim() && maiusculasDiferem(esperado, digitado))
      notas.push("Atenção às maiúsculas: em alemão todo substantivo começa com letra maiúscula.");
    return { nivel: "acerto", notas };
  }
  if (normalizar(esperado, { tolerarGrafia: true }) === normalizar(digitado, { tolerarGrafia: true })) {
    notas.push("Aceito: você escreveu ae/oe/ue/ss no lugar de ä/ö/ü/ß. Use os botões de letras especiais para treinar a grafia correta.");
    return { nivel: "acerto", notas };
  }
  const sim = similaridade(normalizar(esperado, { tolerarGrafia: true }), normalizar(digitado, { tolerarGrafia: true }));
  if (sim >= 0.8) return { nivel: "parcial", notas: ["Quase! Confira a grafia."] };
  return { nivel: "erro", notas };
}

function maiusculasDiferem(a, b) {
  const pa = a.split(/\s+/);
  const pb = b.split(/\s+/);
  return pa.some((p, i) => pb[i] && p !== pb[i] && p.toLowerCase() === pb[i].toLowerCase());
}

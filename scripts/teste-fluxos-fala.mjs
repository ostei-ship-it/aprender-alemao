// Fluxos da etapa 3+: ouvir e escrever, treino de fala (com reconhecimento simulado).
export async function testar({ page, ir, ok, falas, limparFalas }) {
  console.log("Ouvir e escrever:");
  await ir("ouvir");
  await page.click("text=Frases de exemplo");
  await limparFalas();
  await page.click("text=Começar");
  await page.waitForSelector(".quiz-card input");
  const f = await falas();
  ok(f.length === 1 && f[0].lang === "de-DE" && /[.!?]$/.test(f[0].texto), `fala a frase automaticamente ("${f[0]?.texto}")`);
  await page.fill(".quiz-card input", f[0].texto);
  await page.keyboard.press("Enter");
  await page.waitForSelector(".quiz-card .fb-acerto");
  ok(true, "digitar exatamente a frase ouvida = acerto");
  await page.click("text=Próxima");
  await page.waitForSelector(".quiz-card input:not([disabled])");
  await page.click("text=Não sei");
  ok(await page.$(".quiz-card .fb-erro .tok-falta"), "'Não sei' mostra a resposta com palavras destacadas");

  console.log("Treino de fala:");
  await ir("fala");
  await page.click("text=Começar");
  await page.waitForSelector(".btn-mic");
  const esperado = await page.textContent(".quiz-pergunta .palavra-de");
  await page.evaluate((t) => (window.__proximaFala = t.toLowerCase().replace(/[.!?]/g, "")), esperado);
  await page.click(".btn-mic");
  await page.waitForSelector(".quiz-card .feedback");
  ok(await page.$(".quiz-card .fb-acerto"), `fala igual ao texto ("${esperado}") = acerto`);
  ok((await page.evaluate(() => window.__ultimoReconhecimento.lang)) === "de-DE", "reconhecimento configurado em de-DE");
  ok(/Reconhecido/.test(await page.textContent(".quiz-card .feedback")), "mostra o texto reconhecido");
  const palavras = esperado.split(" ");
  await page.evaluate((t) => (window.__proximaFala = t), palavras.slice(0, Math.max(1, Math.floor(palavras.length / 2))).join(" "));
  await page.click(".btn-mic");
  await page.waitForSelector(".quiz-card .feedback");
  ok(await page.$(".quiz-card .fb-parcial, .quiz-card .fb-erro"), "fala só com a primeira metade = parcial/erro");
  await page.evaluate(() => (window.__proximaFala = "Banane Kartoffel Elefant"));
  await page.click(".btn-mic");
  await page.waitForSelector(".quiz-card .fb-erro");
  ok(true, "fala diferente = erro");

  // Navegador sem reconhecimento: aviso + alternativa.
  const ctx2 = await page.context().browser().newContext();
  await ctx2.addInitScript(() => {
    Object.defineProperty(window, "webkitSpeechRecognition", { value: undefined });
    Object.defineProperty(window, "SpeechRecognition", { value: undefined });
  });
  const p2 = await ctx2.newPage();
  await p2.goto(page.url().replace(/#.*$/, "#/fala"));
  await p2.waitForSelector("#conteudo h2");
  ok(/não suporta reconhecimento/.test(await p2.textContent("#conteudo")), "sem suporte: mostra aviso");
  await p2.click("text=Começar");
  await p2.waitForSelector(".quiz-card");
  ok(/Grave|repita/.test(await p2.textContent(".quiz-card")), "sem suporte: oferece alternativa (gravar/repetir e autoavaliar)");
  await ctx2.close();

  const etapa4 = await import("./teste-fluxos-final.mjs").catch((e) => (e.code === "ERR_MODULE_NOT_FOUND" ? null : Promise.reject(e)));
  if (etapa4) {
    await etapa4.testar({ page, ir, ok, falas, limparFalas });
    await etapa4.testarOffline({ browser: page.context().browser(), url: page.url().replace(/#.*$/, ""), ok });
  }
}

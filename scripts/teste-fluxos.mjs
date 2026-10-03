// Fluxos das etapas 2+ (chamado por teste-navegador.mjs).
export async function testar({ page, ir, ok, falas, limparFalas }) {
  console.log("Quiz:");
  await ir("quiz");
  ok(await page.isChecked("text=Só palavras que já estudei"), "exercícios usam por padrão só palavras já estudadas");
  await page.click("text=der / die / das");
  await page.uncheck("text=Só palavras que já estudei");
  await page.click("text=Começar");
  for (let i = 0; i < 10; i++) {
    await page.waitForSelector(".opcoes-artigo .btn:not([disabled])");
    await page.click(".opcoes-artigo .btn >> nth=0");
    await page.waitForSelector(".quiz-card .feedback");
    if (i === 0) {
      const certas = await page.$$eval(".opcoes-artigo .certa", (x) => x.length);
      ok(certas === 1, "quiz de artigos marca a resposta certa");
    }
    await page.keyboard.press("Enter");
  }
  await page.waitForSelector(".cartao-fim h3");
  ok(/de 10/.test(await page.textContent(".cartao-fim h3")), "quiz de artigos termina com o resumo de 10 perguntas");

  await page.click("text=Mudar opções");
  await page.click("text=Alemão → português");
  await page.uncheck("text=Só palavras que já estudei");
  await page.click("text=Começar");
  await page.waitForSelector(".opcoes .opcao");
  const nOpcoes = await page.$$eval(".opcoes .opcao", (x) => x.length);
  ok(nOpcoes === 4, "múltipla escolha tem 4 alternativas");
  const textos = await page.$$eval(".opcoes .opcao", (x) => x.map((b) => b.textContent));
  ok(new Set(textos).size === 4, "alternativas são distintas");
  await page.click(".opcoes .opcao >> nth=0");
  ok((await page.$$eval(".opcoes .certa", (x) => x.length)) === 1, "múltipla escolha destaca a correta");

  await ir("quiz");
  await page.click("text=Digitar em alemão");
  await page.uncheck("text=Só palavras que já estudei");
  await page.click("text=Começar");
  await page.waitForSelector(".quiz-card input");
  await page.click(".teclado-especial .btn-letra >> nth=0");
  ok((await page.inputValue(".quiz-card input")) === "ä", "teclado de letras especiais insere ä");
  await page.fill(".quiz-card input", "xyz");
  await page.keyboard.press("Enter");
  await page.waitForSelector(".quiz-card .fb-erro");
  ok(true, "digitar: resposta errada mostra feedback de erro");

  const etapa3 = await import("./teste-fluxos-fala.mjs").catch((e) => (e.code === "ERR_MODULE_NOT_FOUND" ? null : Promise.reject(e)));
  if (etapa3) await etapa3.testar({ page, ir, ok, falas, limparFalas });
}

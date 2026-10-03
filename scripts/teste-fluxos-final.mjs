// Fluxos da etapa 4: diálogos, painel, pronúncia, exportar/importar.
export async function testar({ page, ir, ok, falas, limparFalas }) {
  console.log("Diálogos:");
  await ir("dialogos");
  const n = await page.$$eval(".dialogo-item", (x) => x.length);
  ok(n >= 5, `${n} diálogos listados`);
  await limparFalas();
  await page.click(".dialogo-item >> nth=0");
  await page.waitForSelector(".quiz-card .opcao");
  ok((await falas()).length >= 1, "fala do personagem é tocada em áudio");
  // Primeira resposta: errar uma vez, depois acertar falando; o resto, acertar clicando.
  const correta = await page.evaluate(async () => {
    const d = (await (await fetch("data/dialogos.json")).json()).dialogos[0];
    return d.falas.filter((f) => f.tipo === "responder").map((f) => f.opcoes.find((o) => o.correta).de);
  });
  for (let i = 0; i < correta.length; i++) {
    await page.waitForSelector(".quiz-card .opcao");
    if (i === 0) {
      const erradas = await page.$$eval(".quiz-card .opcao", (bs, c) => bs.map((b) => b.textContent).filter((t) => t !== c), correta[0]);
      await page.click(`.quiz-card .opcao:text-is("${erradas[0]}")`);
      ok(await page.$(".quiz-card .fb-erro"), "opção errada mostra feedback");
      await page.evaluate((t) => (window.__proximaFala = t), correta[0]);
      await page.click("text=Responder falando");
    } else {
      await page.click(`.quiz-card .opcao:text-is("${correta[i]}")`);
    }
    await page.waitForFunction((k) => document.querySelectorAll(".balao.eu").length > k, i);
  }
  await page.waitForSelector(".cartao-fim h3");
  const fim = await page.textContent(".cartao-fim h3");
  ok(new RegExp(`${correta.length - 1} de ${correta.length}`).test(fim), `resultado conta acertos de primeira (${fim})`);

  console.log("Painel:");
  await ir("painel");
  const txt = await page.textContent("#conteudo");
  ok(/palavras aprendidas/.test(txt) && /para revisar hoje/.test(txt) && /dias? seguidos?/.test(txt), "mostra aprendidas, revisões de hoje e sequência");
  ok(/1 🔥/.test(txt), "sequência = 1 dia após estudar hoje");
  ok((await page.$$eval(".tabela-temas tbody tr", (x) => x.length)) >= 10, "tabela de acerto por tema");
  await page.fill(".cartao input[type=number]", "20");
  await page.dispatchEvent(".cartao input[type=number]", "change");
  await page.waitForSelector("text=/\\/20/");
  ok(true, "meta diária configurável pelo painel");

  console.log("Nível A2:");
  await ir("painel");
  await page.click("text=Ativar A2 nos estudos");
  await page.waitForFunction(() => JSON.parse(localStorage.getItem("aprender-alemao:progresso")).config.niveis.includes("A2"));
  ok(!(await page.$("text=Ativar A2 nos estudos")), "botão do Painel ativa o A2");
  await ir("vocabulario");
  await page.fill("input[type=search]", "abfahren");
  await page.click(".vocab-item summary");
  ok(/Perfekt: ist abgefahren/.test(await page.textContent(".vocab-item")), "verbo A2 mostra o Perfekt (ist abgefahren)");
  await ir("quiz");
  const temasQuiz = await page.$$eval(".cartao select option", (os) => os.map((o) => o.textContent));
  ok(temasQuiz.some((t) => /\(A2\)/.test(t)), "temas A2 aparecem nos exercícios depois de ativar o nível");

  console.log("Pronúncia:");
  await ir("pronuncia");
  const sons = await page.$$eval(".som", (x) => x.map((s) => s.querySelector("h3").textContent));
  for (const s of ["ü", "ö", "ä", "ch", "r", "z", "w", "v", "ei", "Consoantes finais"]) ok(sons.some((t) => t.includes(s)), `seção "${s}"`);
  await limparFalas();
  await page.click(".som .btn-audio >> nth=0");
  ok((await falas())[0]?.texto === "über", "exemplo de pronúncia toca em áudio");

  console.log("Exportar/importar:");
  await ir("ajustes");
  const [download] = await Promise.all([page.waitForEvent("download"), page.click("text=Exportar progresso")]);
  const fs = await import("node:fs/promises");
  const caminho = await download.path();
  const exportado = JSON.parse(await fs.readFile(caminho, "utf8"));
  ok(exportado.app === "aprender-alemao" && Object.keys(exportado.cards).length >= 2 && exportado.config.metaDiaria === 20, "exporta cards, histórico e meta em JSON");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector("#conteudo h2");
  await page.setInputFiles("input[type=file]", caminho);
  await page.waitForEvent("load");
  const restaurado = await page.evaluate(() => JSON.parse(localStorage.getItem("aprender-alemao:progresso")));
  ok(Object.keys(restaurado.cards).length === Object.keys(exportado.cards).length && restaurado.config.metaDiaria === 20, "importa e restaura o progresso");
}

// PWA: instalável e funcionando sem internet (contexto separado, com service worker).
export async function testarOffline({ browser, url, ok }) {
  console.log("PWA / offline:");
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const erros = [];
  page.on("pageerror", (e) => erros.push(e.message));
  await page.goto(`${url}#/painel`);
  await page.waitForSelector("#conteudo h2");
  const manifesto = await page.evaluate(async () => {
    const href = document.querySelector('link[rel="manifest"]').href;
    const m = await (await fetch(href)).json();
    const icones = await Promise.all(m.icons.map(async (i) => (await fetch(new URL(i.src, href))).ok));
    return { m, icones };
  });
  ok(manifesto.m.display === "standalone" && manifesto.icones.every(Boolean) && manifesto.m.icons.some((i) => i.sizes === "512x512"), "manifesto válido com ícones 192/512 acessíveis");
  const urlAntes = page.url();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await page.waitForTimeout(300);
  ok(page.url() === urlAntes && (await page.$("#conteudo .stats")), "service worker assume a página na 1ª visita sem recarregá-la");

  await ctx.setOffline(true);
  await page.reload();
  await page.waitForSelector("#conteudo h2");
  ok((await page.textContent("#conteudo h2")) === "Painel", "sem internet: o app abre");
  await page.goto(`${url}#/vocabulario`);
  await page.waitForSelector(".vocab-item");
  ok((await page.$$eval(".vocab-item", (x) => x.length)) >= 300, "sem internet: vocabulário carrega dos dados guardados");
  for (const r of ["flashcards", "quiz", "dialogos", "pronuncia", "ajustes"]) {
    await page.goto(`${url}#/${r}`);
    await page.waitForSelector("#conteudo h2");
    ok(!(await page.$("#conteudo .fb-erro")), `sem internet: #/${r} abre`);
  }
  ok(/pronto/.test(await page.textContent("#instalar")), "Ajustes informa que o modo offline está pronto");
  // Atualização: o servidor passa a entregar uma versão nova do sw.js.
  await ctx.setOffline(false);
  globalThis.__versaoNova = "teste-atualizacao";
  await page.goto(`${url}#/painel`);
  await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());
  await page.waitForSelector("#banner-atualizacao", { timeout: 10000 });
  ok(true, "versão nova publicada: aparece o aviso \"Atualizar\"");
  await Promise.all([page.waitForEvent("load"), page.click("#banner-atualizacao button")]);
  await page.waitForSelector("#conteudo h2");
  const cacheNovo = await page.evaluate(async () => (await caches.keys()).join(","));
  ok(cacheNovo === "deutsch-lernen-teste-atualizacao", `ao tocar em Atualizar, recarrega com a versão nova e apaga a antiga (${cacheNovo})`);
  delete globalThis.__versaoNova;
  ok(!erros.length, "sem erros de página no modo offline" + (erros.length ? `: ${erros.join("; ")}` : ""));
  await ctx.close();
}

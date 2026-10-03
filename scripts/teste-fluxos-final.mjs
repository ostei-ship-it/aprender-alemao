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
  ok(/Lição 2 de 14: Eu, você, ele, ela/.test(txt) && /Próxima lição: Eu, você, ele, ela/.test(txt), "Painel mostra a lição atual da trilha e o botão da próxima lição");
  ok((await page.$$eval(".tabela-temas tbody tr", (x) => x.length)) >= 10, "tabela de acerto por tema");
  await page.fill(".cartao input[type=number]", "20");
  await page.dispatchEvent(".cartao input[type=number]", "change");
  await page.waitForSelector("text=/\\/20/");
  ok(true, "meta diária configurável pelo painel");

  console.log("Nível A2:");
  await ir("painel");
  await page.click("text=Ativar A2 nos estudos");
  await page.waitForFunction(() => JSON.parse(localStorage.getItem("aprender-alemao:progresso:" + JSON.parse(localStorage.getItem("aprender-alemao:perfis")).ativo)).config.niveis.includes("A2"));
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
  await page.click("#som-ue .btn-audio >> nth=0");
  ok((await falas())[0]?.texto === "über", "exemplo de pronúncia toca em áudio");
  ok(/MAIÚSCULAS/.test(await page.textContent("#legenda")) && /rh/.test(await page.textContent("#legenda")), "legenda explica como ler o \"soa como\"");
  ok((await page.textContent("#som-ue")).includes("Ü-ba"), "exemplos de som mostram como soam (über = Ü-ba)");
  await page.click("#treino-rechts summary");
  const passos = await page.$$eval("#treino-rechts .passos li", (li) => li.map((x) => x.querySelector(".palavra-de").textContent + "=" + x.querySelector(".soa-como").textContent));
  ok(passos.join(" ") === "ich=IRH echt=ÉRHT Recht=RRÉRHT rechts=RRÉRHTS", `rechts passo a passo: ${passos.join(" → ")}`);
  await limparFalas();
  await page.click("#treino-rechts .passos li:nth-child(3) .btn-audio[title='Ouvir devagar']");
  const f = (await falas())[0];
  ok(f?.texto === "Recht" && f.rate < 0.9, "cada passo tem áudio (inclusive devagar)");

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
  const restaurado = await page.evaluate(() => JSON.parse(localStorage.getItem("aprender-alemao:progresso:" + JSON.parse(localStorage.getItem("aprender-alemao:perfis")).ativo)));
  ok(Object.keys(restaurado.cards).length === Object.keys(exportado.cards).length && restaurado.config.metaDiaria === 20, "importa e restaura o progresso");
}


// Perfis: progresso individual por pessoa no mesmo aparelho.
export async function testarPerfis({ page, ir, ok }) {
  console.log("Perfis:");
  const ler = (id) => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), `aprender-alemao:progresso:${id}`);
  await ir("ajustes");
  const nomeP1 = (await page.textContent("#perfil-chip")).replace("👤", "").trim();
  const cardsP1 = Object.keys((await ler("p1")).cards).length;
  ok(cardsP1 >= 2, `perfil inicial "${nomeP1}" guarda o progresso feito até aqui (${cardsP1} cards)`);
  await page.fill("#perfis input", "Ana");
  await Promise.all([page.waitForEvent("load"), page.click("text=+ Novo perfil")]);
  await page.waitForSelector("#conteudo h2");
  ok((await page.textContent("#perfil-chip")).includes("Ana"), "novo perfil \"Ana\" criado e ativado");
  await ir("painel");
  ok(/(^|\D)0\/15(?!\d)/.test(await page.textContent("#conteudo .stats")), "Ana começa do zero (0/15 novas hoje, meta padrão)");
  await ir("quiz");
  await page.click("text=Começar");
  await page.waitForSelector("text=Você ainda não estudou palavras suficientes");
  ok(await page.$('a[href="#/flashcards"]:has-text("Ir para os flashcards")'), "iniciante sem palavras estudadas: o quiz manda para os flashcards em vez de mostrar palavras desconhecidas");
  await ir("licoes");
  await page.click(".btn-primario.largo");
  const { fazerLicao } = await import("./aluno-automatico.mjs");
  await fazerLicao(page);
  const p2 = await ler("p2");
  ok(Object.keys(p2.cards).length === 6, "lição feita pela Ana fica no progresso da Ana");
  ok(Object.keys((await ler("p1")).cards).length === cardsP1, `progresso de "${nomeP1}" não foi alterado`);

  // Nova abertura do app (aba nova): pergunta quem vai estudar.
  const aba = await page.context().newPage();
  aba.on("dialog", (d) => d.accept());
  await aba.goto(page.url().replace(/#.*$/, "#/painel"));
  await aba.waitForSelector(".escolher-perfil");
  const opcoes = await aba.$$eval(".escolher-perfil .opcao", (b) => b.map((x) => x.textContent));
  ok(opcoes.length === 2, `ao abrir o app pergunta "Quem vai estudar?" (${opcoes.join(", ")})`);
  await Promise.all([aba.waitForEvent("load"), aba.click(`.escolher-perfil .opcao:has-text("${nomeP1}")`)]);
  await aba.waitForSelector("#conteudo .stats");
  ok((await aba.textContent("#perfil-chip")).includes(nomeP1), `escolher "${nomeP1}" carrega o progresso dele`);
  await aba.close();

  // Excluir Ana remove só o progresso dela.
  await page.reload();
  await ir("ajustes");
  await Promise.all([page.waitForEvent("load"), page.click('.perfil-item:has-text("Ana") .btn-perigo')]);
  await page.waitForSelector("#perfis");
  ok((await ler("p2")) === null && Object.keys((await ler("p1")).cards).length === cardsP1, "excluir Ana apaga só o progresso dela");

  // Migração: progresso salvo antes de existirem perfis vira o "Perfil 1".
  await page.evaluate(() => {
    const antigo = localStorage.getItem("aprender-alemao:progresso:p1");
    localStorage.clear();
    localStorage.setItem("aprender-alemao:progresso", antigo);
  });
  await page.reload();
  await page.waitForSelector("#conteudo h2");
  const migrado = await page.evaluate(() => ({ antigo: localStorage.getItem("aprender-alemao:progresso"), novo: JSON.parse(localStorage.getItem("aprender-alemao:progresso:p1")) }));
  ok(migrado.antigo === null && Object.keys(migrado.novo.cards).length === cardsP1, "progresso da versão anterior (sem perfis) é migrado sem perdas");
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

# Deutsch lernen — alemão para brasileiros (A1 → B1)

App web local para aprender alemão com foco em **vocabulário e fala**. HTML, CSS e JavaScript puro (ES modules), sem backend, sem build e sem APIs pagas. Interface em português.

- **Trilha para iniciantes**: 14 lições curtas (6 palavras simples cada, com uma dica em português), de *Hallo/Danke/Ja/Nein* até as primeiras frases prontas. As palavras novas seguem essa ordem; depois da trilha, entram das mais curtas/simples para as mais longas. Lições em `data/trilha.json`.
- **"Soa como"**: cada palavra do A1 mostra como soa lida em português (ex.: *rechts* → **RRÉRHTS**), com legenda e treinos passo a passo na seção Pronúncia (ex.: *ich → echt → Recht → rechts*). Pode ser desligado em Ajustes.
- **Flashcards** com repetição espaçada (SM-2): botões *errei / difícil / bom / fácil*, fila diária de revisões + palavras novas até a meta diária.
- **Quiz**: múltipla escolha alemão→português e português→alemão, digitar em alemão (confere o artigo separadamente) e quiz de artigos *der/die/das*.
- **Ouvir e escrever**: o app fala uma palavra ou frase e você digita.
- **Treino de fala**: você fala, o reconhecimento de voz (`de-DE`) transcreve e o app compara com o texto esperado (acerto / parcial / erro), mostrando o que foi reconhecido e quais palavras faltaram.
- **Mini diálogos**: café, apresentar-se, perguntar o caminho, padaria, estação de trem, médico. Responda escolhendo ou falando.
- **Painel**: palavras aprendidas, revisões de hoje, sequência de dias, taxa de acerto por tema, meta diária configurável.
- **Dicas de pronúncia**: ü, ö, ä, ch, r, z, s, w, v, ei/ie, eu, consoantes finais, e final, h, sch/sp/st, com áudio.
- **Vocabulário**: lista completa com busca, filtro por tema e áudio.
- **Vocabulário**: 483 palavras A1 (16 temas) e 427 palavras A2 (13 temas). Os verbos do A2 trazem o **Perfekt** (ex.: *ist abgefahren*, *hat gebucht*). O A2 vem desativado: ative pelo botão no *Painel* ou em *Ajustes › Níveis ativos*. Com os dois níveis ativos, as palavras novas do A1 entram primeiro nos flashcards.
- Substantivos sempre com artigo colorido: **der** = azul, **die** = vermelho, **das** = verde (plural *die* em roxo).
- Progresso salvo no navegador (localStorage), com **exportar/importar em JSON** em *Ajustes*.

## Como rodar

Os navegadores bloqueiam a leitura dos arquivos JSON quando o `index.html` é aberto direto (`file://`). Por isso é preciso um servidor local — qualquer um serve:

```bash
cd aprender-alemao
python3 -m http.server 8000      # ou: npx serve .   ou: npx http-server .
```

Abra **http://localhost:8000** no **Google Chrome**.

### No celular (app instalável, funciona offline)

O app é um **PWA**: hospedado em qualquer endereço **https**, ele pode ser instalado na tela inicial e passa a rodar **direto do celular, sem computador e sem internet**. Na primeira abertura (com internet) o app inteiro (código, 910 palavras, diálogos) é guardado no aparelho.

1. Publique a pasta `aprender-alemao/` em um serviço de páginas estáticas com https (GitHub Pages, Netlify, Vercel, Cloudflare Pages — todos têm plano gratuito). Não há build: é só servir a pasta.
2. No celular, abra o endereço uma vez com internet.
3. Instale: **Android/Chrome** — menu ⋮ › *Instalar app* (ou o botão em *Ajustes › Instalar no celular*). **iPhone/Safari** — Compartilhar › *Adicionar à Tela de Início*.

O que funciona sem internet: flashcards, quiz, ditado, diálogos (respondendo por toque), pronúncia, painel e backup. O áudio usa a voz alemã instalada no aparelho (no Android, baixe a voz alemã em *Configurações › Idioma › Saída de texto para voz* para ela funcionar offline). O **treino de fala precisa de internet**: o reconhecimento de voz do Chrome roda nos servidores do Google.

### Perfis (várias pessoas, progresso individual)

O progresso fica guardado **no navegador de cada aparelho**. Pessoas em celulares diferentes já têm progresso totalmente separado. Para várias pessoas no **mesmo** aparelho, use **Ajustes › Perfis**: cada perfil tem progresso, meta diária, níveis e ajustes próprios, e com mais de um perfil o app pergunta "Quem vai estudar?" ao abrir. O nome do perfil em uso aparece no topo; tocar nele leva aos perfis.

- Exportar, importar e apagar valem só para o perfil em uso. O arquivo exportado leva o nome do perfil.
- Perfis **não têm senha**: quem usa o aparelho pode abrir qualquer perfil. Para privacidade, cada pessoa deve usar o próprio aparelho (ou um perfil de usuário diferente do navegador).
- O progresso da versão anterior (sem perfis) vira automaticamente o "Perfil 1", que pode ser renomeado.

O progresso fica no aparelho (localStorage). Celular e computador **não sincronizam sozinhos**: use *Ajustes › Exportar/Importar* para levar o progresso de um para o outro, e exporte de vez em quando como backup.

**Atualizações**: quando uma versão nova é publicada, o app mostra o aviso "Há uma versão nova — Atualizar". O progresso é mantido.

**Depois de mudar qualquer arquivo do app** (palavras, código), rode antes de publicar:

```bash
node scripts/gerar-pwa.mjs     # atualiza a lista de arquivos e a versão do cache offline (sw.js)
```

Sem isso, os celulares com o app instalado continuam usando a versão antiga. O teste `node scripts/gerar-pwa.mjs --verificar` falha se você esquecer.

### Avisos sobre áudio e voz

- **Voz alemã**: o app usa a voz `de-DE` instalada no sistema. Se não houver, aparece um aviso. Android: *Configurações › Idioma › Saída de texto para voz* e instale o pacote de alemão. Windows: *Configurações › Hora e idioma › Fala*. A qualidade varia de aparelho para aparelho.
- **Reconhecimento de fala no Chrome** usa os servidores do Google: precisa de internet e o áudio da sua fala é enviado a eles. Firefox não suporta; Safari tem suporte parcial.
- O reconhecedor devolve **texto**, não uma análise fonética. O app compara o texto transcrito com o esperado; isso indica se a fala foi *inteligível* para um reconhecedor alemão, não avalia sotaque com precisão. Palavras isoladas são reconhecidas pior que frases — prefira treinar com frases.
- Sem reconhecimento disponível, o treino de fala oferece a alternativa de **gravar sua voz, ouvir e comparar com o modelo** e se autoavaliar.

## Repetição espaçada (SM-2)

| Botão | Qualidade SM-2 | Efeito |
|---|---|---|
| Errei | 1 | volta para 1 dia e o cartão reaparece no fim da sessão |
| Difícil | 3 | avança, fator de facilidade cai |
| Bom | 4 | avança (1 dia → 6 dias → intervalo × fator) |
| Fácil | 5 | avança, fator de facilidade sobe |

No SM-2 original o primeiro intervalo é sempre 1 dia e o segundo 6 dias, por isso numa palavra nova todos os botões mostram "amanhã". Uma palavra conta como **aprendida** depois de 2 revisões seguidas sem errar.

## Como adicionar palavras

O vocabulário fica em `data/vocab/`, um arquivo por tema e nível:

```
data/vocab/index.json         ← lista de temas (id, nome, nível, arquivo)
data/vocab/a1/comida.json     ← palavras do tema "comida", nível A1
```

Cada palavra é um objeto:

```json
{
  "id": "comida-apfel",
  "alemao": "Apfel",
  "classe": "substantivo",
  "artigo": "der",
  "plural": "Äpfel",
  "portugues": "maçã",
  "exemplo": "Der Apfel ist rot.",
  "exemplo_pt": "A maçã é vermelha.",
  "tema": "comida",
  "nivel": "A1",
  "nota": "opcional: dica que aparece no verso do cartão"
}
```

| Campo | Regras |
|---|---|
| `id` | Único e **estável**: o progresso é salvo por id. Nunca troque o id de uma palavra já estudada. Sugestão: `tema-palavra` sem acentos. |
| `classe` | `substantivo`, `verbo`, `adjetivo`, `advérbio`, `expressão`, `numeral`, `pronome`, `interrogativo`, `conjunção` ou `outro`. |
| `artigo` | Só para substantivos: `der`, `die` ou `das`. Escreva `alemao` sem o artigo (o app junta os dois). |
| `plural` | Só para substantivos, sem o artigo (`"Äpfel"`). Use `null` se a palavra normalmente não tem plural. |
| `so_plural` | `true` para palavras que só existem no plural (`die Eltern`); use `"artigo": "die"`. |
| `exemplo` | Frase curta em alemão padrão, com pontuação final. |
| `pronuncia_pt` | Como soa lido em português, sem o artigo (o app acrescenta *dêa/di/das*). Sílaba forte em MAIÚSCULAS; convenções na legenda de `data/pronuncia.json` (rr = garganta, rh = chiado do *ich*, x = sch, ts = z…). Obrigatório no A1. |
| `perfekt` | Só para verbos: auxiliar + particípio (`"hat gegessen"`, `"ist gefahren"`). Obrigatório a partir do A2; aparece no verso do flashcard e na lista. |
| `revisar` / `nota_revisao` | Marque `"revisar": true` e explique a dúvida. O item aparece com ⚑ no app e é listado pelo validador. |

**Novo tema**: crie o arquivo (ex.: `data/vocab/a1/animais.json` com `"tema": "animais"`, `"nivel": "A1"`, `"palavras": [...]`) e acrescente uma entrada em `index.json`.

**Níveis**: o A2 já está em `data/vocab/a2/`. Para o B1, crie `data/vocab/b1/<tema>.json` com `"nivel": "B1"` em todas as palavras e registre no `index.json`. O nível fica disponível em *Ajustes* e no *Painel* assim que tiver palavras. Use ids de tema diferentes entre níveis (ex.: `verbos` no A1, `verbos-a2` no A2) e ids de palavra com prefixo do nível (`a2-…`, `b1-…`).

Depois de editar, valide e atualize o cache offline:

```bash
node scripts/validar-dados.mjs
node scripts/gerar-pwa.mjs
```

Ele confere JSON, campos obrigatórios, artigos, ids duplicados, coerência tema/nível e lista os itens marcados para revisão.

### Diálogos e pronúncia

- `data/dialogos.json`: cada diálogo tem `falas`; `"tipo": "ouvir"` é a fala do outro personagem (`falante`, `de`, `pt`), `"tipo": "responder"` tem `instrucao` e `opcoes` com exatamente uma `"correta": true`. As opções erradas também devem ser alemão correto — só não combinam com a situação.
- `data/pronuncia.json`: cada som tem `titulo`, `ipa`, `explicacao`, `erro_comum`, `exemplos` e, opcionalmente, `pares` para comparar.

## Itens para revisão

Todo conteúdo foi escrito em alemão padrão (Hochdeutsch). Itens com dúvida são marcados com `"revisar": true` — rode o validador para ver a lista atual (no momento, nenhum). Na tela *Vocabulário*, marque "só itens marcados ⚑".

Observações de conteúdo (não são erros, mas vale saber):
- Variantes regionais registradas em `nota`: *Sonnabend* (= Samstag, norte/leste), *das E-Mail* (Áustria/sul), plural *Balkons/Balkone*, *die Bänke* (banco de sentar) × *die Banken* (instituição), *Kusine* (grafia alternativa de *Cousine*), *Fasching* (= Karneval, sul), Perfekt com *sein* de *stehen/liegen/sitzen* no sul.
- *Silvester* aceita *der* e *das*; por isso está no A2 como a expressão *an Silvester*, fora do quiz de artigos.
- As comparações com sons do português na seção de pronúncia são aproximações didáticas; o áudio é a referência.

## Testes

```bash
node scripts/validar-dados.mjs     # dados
node scripts/gerar-pwa.mjs --verificar  # cache offline em dia com os arquivos
node scripts/teste-unidade.mjs     # SM-2, números por extenso, comparação de respostas
node scripts/teste-navegador.mjs   # Chromium headless via Playwright (npm i -D playwright)
```

O teste de navegador abre todas as seções em tela de celular (390 px), falha com qualquer erro de console e percorre flashcards, quiz, ditado, fala, diálogos, painel, pronúncia e exportar/importar. A síntese e o reconhecimento de voz são **simulados** nesse teste (o navegador headless não tem alto-falante nem microfone): ele confere que o app chama a API com `lang = "de-DE"`, voz alemã e velocidade lenta menor que a normal, mas não substitui ouvir o áudio de verdade.

## Estrutura

```
aprender-alemao/
├── index.html
├── manifest.webmanifest   PWA: nome, ícones, modo tela cheia
├── sw.js                  service worker (cache offline; lista gerada por scripts/gerar-pwa.mjs)
├── icons/                 ícone (SVG + PNGs gerados por scripts/gerar-icones.mjs)
├── css/style.css
├── js/
│   ├── app.js          rotas (#/painel, #/flashcards, …) e inicialização
│   ├── dados.js        carregamento dos JSON e filtros por nível/tema
│   ├── audio.js        SpeechSynthesis, SpeechRecognition e gravação
│   ├── progresso.js    localStorage, estatísticas, exportar/importar (do perfil em uso)
│   ├── perfis.js       perfis locais (várias pessoas no mesmo aparelho)
│   ├── sm2.js          algoritmo SM-2 e datas
│   ├── comparar.js     normalização, números por extenso, avaliação de fala/escrita
│   ├── ui.js           helpers de interface (artigos coloridos, botões de áudio…)
│   ├── pwa.js          registro do service worker, aviso de atualização, instalação
│   └── modos/          uma tela por arquivo
├── data/
│   ├── vocab/index.json + vocab/a1/*.json
│   ├── dialogos.json
│   └── pronuncia.json
└── scripts/            validador e testes
```

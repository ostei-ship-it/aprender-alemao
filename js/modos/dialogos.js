// Mini diálogos do cotidiano: ouvir as falas e responder escolhendo ou falando.
import { el, feedback, botoesAudio, porcentagem } from "../ui.js";
import { dados, embaralhar } from "../dados.js";
import { falar, pararFala, ouvirFala, pararEscuta, reconhecimentoSuportado } from "../audio.js";
import { progresso, registrarDialogo } from "../progresso.js";
import { avaliarFala } from "../comparar.js";

export function render(raiz) {
  let cancelado = false;
  const corpo = el("div");
  raiz.append(el("div", { class: "cabecalho-modo" }, el("h2", {}, "Mini diálogos"),
    el("p", { class: "muted" }, "Ouça as falas e responda escolhendo a opção certa ou falando a resposta.")), corpo);

  function lista() {
    pararFala();
    corpo.replaceChildren(el("div", { class: "dialogo-lista" }, dados().dialogos.map((d) => {
      const reg = progresso().dialogos[d.id];
      return el("button", { class: "cartao dialogo-item btn", style: "flex-direction:column;align-items:flex-start", onclick: () => jogar(d) },
        el("span", { style: "font-size:1.6rem" }, d.icone || "💬"),
        el("strong", {}, d.titulo),
        el("span", { class: "muted", style: "font-weight:400" }, d.descricao),
        el("span", { class: "etiqueta" }, reg ? `melhor: ${Math.round(reg.melhor * 100)}% · ${reg.vezes}×` : d.nivel));
    })));
  }

  async function jogar(d) {
    cancelado = false;
    let acertos = 0;
    let respostas = 0;
    const chat = el("div", { class: "chat" });
    const area = el("div");
    const optTrad = el("input", { type: "checkbox", checked: true, onchange: () => chat.querySelectorAll(".trad").forEach((t) => (t.hidden = !optTrad.checked)) });
    const optEsconder = el("input", { type: "checkbox", onchange: () => chat.classList.toggle("esconder-texto", optEsconder.checked) });
    corpo.replaceChildren(
      el("div", { class: "cartao" },
        el("div", { class: "flash-status" }, el("strong", {}, `${d.icone || ""} ${d.titulo}`), el("button", { class: "btn btn-secundario", onclick: () => { cancelado = true; pararEscuta(); lista(); } }, "← Voltar")),
        el("p", { class: "muted" }, d.descricao),
        el("div", { class: "linha-controles" },
          el("label", { class: "check" }, optTrad, " Mostrar tradução"),
          el("label", { class: "check" }, optEsconder, " Só áudio (esconder o texto do outro)"))),
      chat, area);

    const balao = (quem, de, pt, eu = false) => {
      const b = el("div", { class: `balao ${eu ? "eu" : "outro"}` },
        el("span", { class: "falante" }, quem),
        el("span", { class: "texto-de", lang: "de" }, de), botoesAudio(de),
        el("div", { class: "trad", hidden: !optTrad.checked }, pt));
      chat.append(b);
      b.scrollIntoView({ block: "nearest", behavior: "smooth" });
    };

    for (const fala of d.falas) {
      if (cancelado) return;
      if (fala.tipo === "ouvir") {
        balao(fala.falante, fala.de, fala.pt);
        await falar(fala.de);
        await pausa(350);
      } else {
        const acertou = await responder(fala);
        if (cancelado) return;
        respostas++;
        if (acertou) acertos++;
        const certa = fala.opcoes.find((o) => o.correta);
        area.replaceChildren();
        balao("Você", certa.de, certa.pt, true);
        await falar(certa.de);
        await pausa(250);
      }
    }
    if (cancelado) return;
    registrarDialogo(d.id, acertos, respostas);
    area.replaceChildren(el("div", { class: "cartao-fim" },
      el("h3", {}, `Diálogo concluído: ${acertos} de ${respostas} de primeira (${porcentagem(acertos, respostas)}%)`),
      el("div", { class: "grupo-botoes", style: "justify-content:center" },
        el("button", { class: "btn btn-primario", onclick: () => jogar(d) }, "Repetir"),
        el("button", { class: "btn", onclick: lista }, "Outros diálogos"))));

    // Resolve true se acertou na primeira tentativa.
    function responder(fala) {
      return new Promise((resolve) => {
        let primeira = true;
        const opcoes = embaralhar(fala.opcoes);
        const msg = el("div");
        const botoes = opcoes.map((o) => el("button", { class: "btn opcao", lang: "de", onclick: () => escolher(o) }, o.de));
        const escolher = (o) => {
          if (o.correta) return resolve(primeira);
          primeira = false;
          botoes[opcoes.indexOf(o)].classList.add("errada");
          botoes[opcoes.indexOf(o)].disabled = true;
          msg.replaceChildren(feedback("erro", "Não combina com a situação.", el("span", { class: "muted" }, `“${o.de}” = ${o.pt}`)));
        };
        const mic = reconhecimentoSuportado()
          ? el("button", { class: "btn", onclick: async () => {
              mic.disabled = true;
              mic.textContent = "🎤 Ouvindo…";
              try {
                const { alternativas } = await ouvirFala();
                const avaliadas = opcoes.map((o) => ({ o, r: avaliarFala(o.de, alternativas) })).sort((a, b) => b.r.nota - a.r.nota);
                const { o, r } = avaliadas[0];
                if (r.nivel === "erro") {
                  primeira = false;
                  msg.replaceChildren(feedback("erro", "Não reconheci nenhuma das respostas.", el("span", {}, "Reconhecido: ", el("q", { lang: "de" }, r.texto || "(nada)")), el("span", { class: "muted" }, "Tente de novo ou toque na opção.")));
                } else if (o.correta) {
                  msg.replaceChildren(feedback(r.nivel, r.nivel === "acerto" ? "Muito bem!" : "Entendi, mas a pronúncia pode melhorar.", el("span", {}, "Reconhecido: ", el("q", { lang: "de" }, r.texto))));
                  await pausa(r.nivel === "acerto" ? 600 : 1500);
                  return resolve(primeira);
                } else escolher(o);
              } catch (e) {
                msg.replaceChildren(feedback("erro", "Não foi possível reconhecer.", e.message));
              } finally {
                mic.disabled = false;
                mic.textContent = "🎤 Responder falando";
              }
            } }, "🎤 Responder falando")
          : null;
        area.replaceChildren(el("div", { class: "quiz-card" },
          el("strong", {}, "Sua vez: ", el("span", { style: "font-weight:400" }, fala.instrucao)),
          el("div", { class: "opcoes" }, botoes),
          mic ?? el("small", { class: "muted" }, "Responder falando exige reconhecimento de voz (Chrome). Escolha uma opção."),
          msg));
      });
    }
  }

  lista();
  return () => { cancelado = true; pararEscuta(); pararFala(); };
}

const pausa = (ms) => new Promise((r) => setTimeout(r, ms));

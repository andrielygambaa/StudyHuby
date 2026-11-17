// Mascote do StudyHub: um fantasminha em pixel art (desenho próprio, feito de quadradinhos em SVG).
// Ele flutua, passeia pelo canto da tela, acompanha o mouse com os olhos e abre um painel de ajuda ao clicar.
import { html, raw, primeiroNome } from "./util.js";
import { state } from "./state.js";

// Corpo em uma grade de 14 x 14 "pixels": B = corpo, S = sombra (a cauda faz uma curva para a direita)
const CORPO = [
  "....BBBBBB....",
  "..BBBBBBBBBB..",
  ".BBBBBBBBBBBB.",
  ".BBBBBBBBBBBB.",
  "BBBBBBBBBBBBBB",
  "BBBBBBBBBBBBBB",
  "BBBBBBBBBBBBBB",
  "BBBBBBBBBBBBBS",
  "BBBBBBBBBBBBSS",
  "BBBBBBBBBBBSSS",
  ".BBBBBBBBBSSS.",
  ".BBBBBBBSSS...",
  "..BBBBSSS..SS.",
  "....SSSSSSS...",
];
// Rostos: [x, y, largura, altura] de cada olho e da boca
const ROSTOS = {
  normal:   { olhos: [[3, 4, 2, 2], [9, 4, 2, 2]], boca: [6, 7, 2, 1] },
  feliz:    { olhos: [[3, 5, 2, 1], [9, 5, 2, 1], [3, 4, 1, 1], [10, 4, 1, 1]], boca: [5, 7, 4, 1] },
  surpreso: { olhos: [[3, 3, 2, 3], [9, 3, 2, 3]], boca: [6, 7, 2, 2] },
  piscando: { olhos: [[3, 5, 2, 1], [9, 5, 2, 1]], boca: [6, 7, 2, 1] },
  dormindo: { olhos: [[3, 5, 2, 1], [9, 5, 2, 1]], boca: [6, 8, 1, 1] },
};

function pixels(letra, cor) {
  let out = "";
  CORPO.forEach((linha, y) => {
    let x = 0;
    while (x < linha.length) {
      if (linha[x] !== letra) { x++; continue; }
      let fim = x;
      while (fim < linha.length && linha[fim] === letra) fim++;
      out += `<rect x="${x}" y="${y}" width="${fim - x}" height="1" fill="${cor}"/>`;
      x = fim;
    }
  });
  return out;
}
// contorno: casas vazias vizinhas do corpo (desenhado em volta, na grade 16 x 16)
const CONTORNO = (() => {
  const cheio = (x, y) => y >= 0 && y < CORPO.length && x >= 0 && x < CORPO[0].length && CORPO[y][x] !== ".";
  let out = "";
  for (let y = -1; y <= CORPO.length; y++) for (let x = -1; x <= CORPO[0].length; x++)
    if (!cheio(x, y) && (cheio(x + 1, y) || cheio(x - 1, y) || cheio(x, y + 1) || cheio(x, y - 1))) out += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
  return out;
})();
const ret = ([x, y, w, h], cor) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${cor}"/>`;

export function ghostSvg(expr = "normal") {
  const r = ROSTOS[expr] || ROSTOS.normal;
  return raw(`<svg viewBox="-1 -1 16 16" data-expr="${expr}" role="img" aria-label="Fantasminha do StudyHub">`
    + `<g fill="var(--ghost-line)">${CONTORNO}</g>` + pixels("B", "var(--ghost)") + pixels("S", "var(--ghost-shade)")
    + `<rect x="1" y="6" width="2" height="1" fill="#ff9db5" opacity=".85"/><rect x="11" y="6" width="2" height="1" fill="#ff9db5" opacity=".85"/>`
    + `<g class="olhos">${r.olhos.map((o) => ret(o, "#1a1f3a")).join("")}</g>${ret(r.boca, "#1a1f3a")}`
    + (expr === "dormindo" ? `<rect x="11" y="1" width="2" height="1" fill="#8f98ff"/><rect x="12" y="2" width="1" height="1" fill="#8f98ff"/><rect x="11" y="3" width="2" height="1" fill="#8f98ff"/>` : "")
    + `</svg>`);
}

const DICAS = [
  "Estude em blocos de 25 minutos e faça pausas curtas: o cérebro rende mais assim.",
  "Revise os flashcards todo dia, mesmo que sejam só 5 minutos. A constância ganha da maratona.",
  "Antes de começar, escolha UM tópico do planner. Decidir o que estudar já é metade do caminho.",
  "Errou um cartão? Ótimo: ele volta amanhã, e é assim que a memória se fortalece.",
  "Deixe o celular longe durante o Pomodoro. Eu tomo conta do tempo para você.",
];
const POR_ROTA = {
  "/": "Aqui é a sua dashboard: nível, minutos da semana, cartões para revisar e o progresso por matéria.",
  "/pomodoro": "Escolha a matéria, aperte o botão do meio e foque. Ao terminar, você ganha XP.",
  "/planner": "Cadastre os tópicos de cada matéria e vá avançando: não visto, estudando e revisado (+15 XP).",
  "/flashcards": "Crie baralhos e cartões. Na revisão, quem você acerta demora mais para voltar.",
  "/conquistas": "Cada conquista desbloqueada paga um bônus de XP. O extrato mostra de onde veio cada ponto.",
  "/materias": "As matérias são só suas: crie, mude a cor e use no planner, no Pomodoro e nos baralhos.",
  "/perfil": "Aqui você troca a foto, o nome, a bio, a senha e o tema da sua conta.",
};
const RESPOSTAS = {
  pomodoro: { texto: "No Pomodoro você estuda em blocos de foco (25 min) e faz pausas. Escolha a matéria e aperte o botão redondo. Sessão concluída vale XP!", botao: "Abrir o Pomodoro", rota: "#/pomodoro" },
  pesquisa: { texto: "A barra lá em cima pesquisa de verdade nos seus tópicos, baralhos, cartões e matérias, além dos atalhos do site. Dica: aperte a tecla / para ir direto nela.", botao: "Pesquisar agora", acao: "busca" },
  tema: { texto: "O botão de sol e lua troca entre o modo claro e o escuro. A escolha fica salva na sua conta e vale em qualquer aparelho.", botao: "Trocar o tema", acao: "tema" },
  perfil: { texto: "No seu perfil dá para trocar a foto, o nome, o apelido, a bio e a senha.", botao: "Abrir meu perfil", rota: "#/perfil" },
};

let instancia = null;

export function montarFantasma({ aoPedir, rotaAtual }) {
  desmontarFantasma();
  const reduzido = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const el = document.createElement("div");
  el.className = "ghost";
  el.innerHTML = `<button class="ghost-btn" type="button" aria-label="Abrir o assistente do StudyHub" aria-expanded="false">${ghostSvg("normal")}</button><div class="ghost-sombra"></div>`;
  document.body.appendChild(el);
  const btn = el.querySelector(".ghost-btn");
  let painel = null, expr = "normal", gx = 0, temporizadores = [], ultimoMovimento = Date.now(), dicaIdx = Math.floor(Math.random() * DICAS.length);

  function rosto(nova) {
    if (nova === expr) return;
    expr = nova;
    btn.innerHTML = String(ghostSvg(nova));
  }
  const depois = (fn, ms) => { const t = setTimeout(fn, ms); temporizadores.push(t); return t; };
  const cada = (fn, ms) => { const t = setInterval(fn, ms); temporizadores.push(t); return t; };

  // piscar de tempos em tempos; dormir se ninguém mexer por um minuto
  cada(() => {
    if (painel || expr !== "normal") return;
    if (Date.now() - ultimoMovimento > 60000) { rosto("dormindo"); return; }
    rosto("piscando"); depois(() => { if (expr === "piscando") rosto("normal"); }, 170);
  }, 4200);

  // passeio: pequenas caminhadas com mudança de direção
  function passear() {
    if (painel || reduzido || document.querySelector(".tour-tip")) return;
    const naLateral = window.innerWidth > 900;          // no computador ele passeia dentro da barra lateral
    const novo = naLateral ? Math.round(Math.random() * 120 - 60) : -Math.round(Math.random() * 40);
    el.classList.toggle("esq", novo < gx);
    gx = novo;
    el.style.setProperty("--gx", gx + "px");
  }
  if (!reduzido) cada(passear, 7000);

  // olhos acompanham o mouse
  function olhar(e) {
    ultimoMovimento = Date.now();
    if (expr === "dormindo") rosto("normal");
    const olhos = btn.querySelector(".olhos");
    if (!olhos || expr !== "normal") return;
    const r = btn.getBoundingClientRect();
    let dx = Math.sign(Math.round((e.clientX - (r.left + r.width / 2)) / 90));
    const dy = Math.sign(Math.round((e.clientY - (r.top + r.height / 2)) / 140));
    if (el.classList.contains("esq")) dx = -dx;
    olhos.setAttribute("transform", `translate(${dx} ${dy > 0 ? 1 : 0})`);
  }
  window.addEventListener("mousemove", olhar, { passive: true });
  let fimRolagem = null;
  const rolar = () => { el.classList.add("rolando"); clearTimeout(fimRolagem); fimRolagem = setTimeout(() => el.classList.remove("rolando"), 700); };
  window.addEventListener("scroll", rolar, { passive: true });
  btn.addEventListener("mouseenter", () => { if (!painel) rosto("feliz"); });
  btn.addEventListener("mouseleave", () => { if (!painel) rosto("normal"); });

  function fechar() {
    if (!painel) return;
    painel.remove(); painel = null;
    btn.setAttribute("aria-expanded", "false");
    rosto("normal");
  }

  function desenhar(conteudo) {
    painel.innerHTML = String(conteudo);
    const foco = painel.querySelector("button");
    if (foco) foco.focus({ preventScroll: true });
  }

  function menu() {
    const nome = primeiroNome(state.usuario && state.usuario.nome);
    const rota = rotaAtual();
    const base = "/" + (rota.split("/")[1] || "");
    desenhar(html`<h4>Oi${nome ? ", " + nome : ""}! Eu sou o Bu 👋</h4>
      <p class="small muted">${POR_ROTA[base] || POR_ROTA["/"]}</p>
      <div class="opts">
        <button data-g="tour">🧭 Fazer o tour guiado</button>
        <button data-g="pomodoro">⏱️ Como funciona o Pomodoro?</button>
        <button data-g="pesquisa">🔎 Onde eu pesquiso?</button>
        <button data-g="tema">🌗 Como mudo o tema?</button>
        <button data-g="perfil">🙂 Como edito meu perfil?</button>
        <button data-g="dica">💡 Me dá uma dica de estudo</button>
      </div>`);
  }

  function responder(chave) {
    if (chave === "tour") { fechar(); aoPedir("tour"); return; }
    if (chave === "voltar") { menu(); return; }
    if (chave === "dica") {
      dicaIdx = (dicaIdx + 1) % DICAS.length;
      desenhar(html`<h4>Dica do Bu</h4><p class="small">${DICAS[dicaIdx]}</p>
        <div class="opts"><button data-g="dica">Outra dica</button><button data-g="voltar">← Voltar</button></div>`);
      return;
    }
    const r = RESPOSTAS[chave];
    if (!r) return;
    desenhar(html`<h4>Deixa comigo</h4><p class="small">${r.texto}</p>
      <div class="opts"><button data-ir="${chave}">${r.botao} →</button><button data-g="voltar">← Voltar</button></div>`);
  }

  function abrir() {
    if (painel) { fechar(); return; }
    painel = document.createElement("div");
    painel.className = "ghost-panel";
    painel.setAttribute("role", "dialog");
    painel.setAttribute("aria-label", "Assistente do StudyHub");
    document.body.appendChild(painel);
    btn.setAttribute("aria-expanded", "true");
    gx = 0; el.style.setProperty("--gx", "0px"); el.classList.remove("esq");
    painel.addEventListener("click", (e) => {
      const g = e.target.closest("[data-g]"), ir = e.target.closest("[data-ir]");
      if (g) responder(g.dataset.g);
      if (ir) {
        const r = RESPOSTAS[ir.dataset.ir];
        fechar();
        if (r.rota) location.hash = r.rota; else aoPedir(r.acao);
      }
    });
    rosto("feliz");
    menu();
  }

  btn.addEventListener("click", () => {
    btn.classList.remove("pulo"); void btn.offsetWidth; btn.classList.add("pulo");
    rosto("surpreso");
    depois(() => { btn.classList.remove("pulo"); }, 620);
    depois(abrir, 140);
  });
  const fora = (e) => { if (painel && !painel.contains(e.target) && !el.contains(e.target)) fechar(); };
  const tecla = (e) => { if (e.key === "Escape") fechar(); };
  document.addEventListener("mousedown", fora);
  document.addEventListener("keydown", tecla);

  instancia = {
    fechar,
    esconder(sim) { el.hidden = sim; if (sim) fechar(); },
    destruir() {
      temporizadores.forEach((t) => { clearTimeout(t); clearInterval(t); });
      window.removeEventListener("mousemove", olhar);
      window.removeEventListener("scroll", rolar);
      clearTimeout(fimRolagem);
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", tecla);
      fechar(); el.remove();
    },
  };
  return instancia;
}

export function desmontarFantasma() {
  if (instancia) { instancia.destruir(); instancia = null; }
}
export const fantasma = () => instancia;

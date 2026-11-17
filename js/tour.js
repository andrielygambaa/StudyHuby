// Guia interativo: destaca um elemento por vez, com balão explicativo e o fantasminha acompanhando.
import { html } from "./util.js";
import { ghostSvg, fantasma } from "./ghost.js";

export const PASSOS = [
  { titulo: "Boas-vindas ao StudyHub!", texto: "Eu sou o Bu, o fantasminha daqui. Em menos de um minuto eu te mostro onde fica cada coisa. Vamos?", rosto: "feliz" },
  { alvo: '[data-tour="dashboard"]', titulo: "Sua dashboard", texto: "Aqui você vê o seu nível, os minutos estudados na semana, os cartões para revisar hoje e os tópicos já revisados." },
  { alvo: '[data-tour="nav"]', titulo: "As funcionalidades", texto: "Pelo menu você chega no Pomodoro, no Planner de tópicos, nos Flashcards, nas Conquistas e nas suas Matérias." },
  { alvo: '[data-tour="nav-pomodoro"]', titulo: "O Pomodoro", texto: "Escolha a matéria, aperte o botão do meio e foque por 25 minutos. Dá para pausar, retomar e reiniciar. Sessão concluída vale XP!", rosto: "surpreso" },
  { alvo: '[data-tour="busca"]', titulo: "A pesquisa", texto: "Procure tópicos, baralhos, cartões, matérias e atalhos do site. A tecla / leva você direto para a busca." },
  { alvo: '[data-tour="perfil-area"]', titulo: "Deixe com a sua cara", texto: "O sol e a lua trocam o tema claro e escuro. Na sua foto ficam o perfil, as configurações e a saída. Sempre que precisar, é só clicar em mim!", rosto: "feliz" },
];

let ativo = null;

export function tourAtivo() { return Boolean(ativo); }

export function iniciarTour({ aoTerminar } = {}) {
  if (ativo) return;
  let i = 0;
  const bloqueio = document.createElement("div"); bloqueio.className = "tour-block";
  const furo = document.createElement("div"); furo.className = "tour-hole";
  const balao = document.createElement("div"); balao.className = "tour-tip";
  balao.setAttribute("role", "dialog"); balao.setAttribute("aria-modal", "true"); balao.setAttribute("aria-label", "Guia do StudyHub");
  document.body.append(bloqueio, furo, balao);
  if (fantasma()) fantasma().esconder(true);

  function visivel(el) {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return r.width > 4 && r.height > 4 && getComputedStyle(el).display !== "none";
  }

  function posicionar() {
    const passo = PASSOS[i];
    const alvo = passo.alvo ? document.querySelector(passo.alvo) : null;
    const L = window.innerWidth, A = window.innerHeight, M = 12;
    const bw = balao.offsetWidth, bh = balao.offsetHeight;
    if (!visivel(alvo)) {                       // passo sem alvo (ou alvo escondido nesta tela): balão no centro
      furo.classList.add("sem-alvo");
      Object.assign(furo.style, { top: A / 2 + "px", left: L / 2 + "px", width: "0px", height: "0px" });
      Object.assign(balao.style, { top: Math.max(M, (A - bh) / 2) + "px", left: Math.max(M, (L - bw) / 2) + "px" });
      return;
    }
    const r = alvo.getBoundingClientRect(), p = 6;
    const caixa = { top: Math.max(4, r.top - p), left: Math.max(4, r.left - p), width: Math.min(L - 8, r.width + 2 * p), height: Math.min(A - 8, r.height + 2 * p) };
    furo.classList.remove("sem-alvo");
    Object.assign(furo.style, { top: caixa.top + "px", left: caixa.left + "px", width: caixa.width + "px", height: caixa.height + "px" });
    let top, left;
    const baixo = caixa.top + caixa.height + M, cima = caixa.top - bh - M, dir = caixa.left + caixa.width + M;
    if (caixa.height > A * 0.6 && dir + bw <= L - M) { top = Math.max(M, Math.min(A - bh - M, caixa.top + 40)); left = dir; }   // alvo alto (menu lateral): ao lado
    else if (baixo + bh <= A - M) { top = baixo; left = caixa.left + caixa.width / 2 - bw / 2; }
    else if (cima >= M) { top = cima; left = caixa.left + caixa.width / 2 - bw / 2; }
    else { top = Math.max(M, (A - bh) / 2); left = (L - bw) / 2; }
    Object.assign(balao.style, { top: top + "px", left: Math.max(M, Math.min(L - bw - M, left)) + "px" });
  }

  function desenhar() {
    const passo = PASSOS[i], ultimo = i === PASSOS.length - 1;
    balao.innerHTML = String(html`<div class="row" style="align-items:flex-start">
        <div class="ghost-mini">${ghostSvg(passo.rosto || "normal")}</div>
        <div class="grow"><h3 id="tour-titulo">${passo.titulo}</h3><p class="small muted mt8">${passo.texto}</p></div></div>
      <div class="row between mt16 wrap">
        <div class="row g10"><div class="tour-dots" aria-hidden="true">${PASSOS.map((_, k) => html`<i class="${k === i ? "on" : ""}"></i>`)}</div>
          <span class="tiny muted" data-tour-progresso>${i + 1} de ${PASSOS.length}</span></div>
        <div class="row g6"><button class="btn sm" data-t="pular">${ultimo ? "Fechar" : "Pular"}</button>
          <button class="btn sm" data-t="voltar" ${i === 0 ? "disabled" : ""}>Voltar</button>
          <button class="btn sm primary" data-t="avancar">${ultimo ? "Concluir" : "Avançar"}</button></div></div>`);
    const alvo = passo.alvo ? document.querySelector(passo.alvo) : null;
    if (visivel(alvo)) {
      const r = alvo.getBoundingClientRect();
      if (r.top < 0 || r.bottom > window.innerHeight) alvo.scrollIntoView({ block: "center" });
    }
    posicionar();
    setTimeout(posicionar, 60);
    balao.querySelector('[data-t="avancar"]').focus({ preventScroll: true });
  }

  function encerrar(concluiu) {
    if (!ativo) return;
    ativo = null;
    bloqueio.remove(); furo.remove(); balao.remove();
    window.removeEventListener("resize", posicionar);
    window.removeEventListener("scroll", posicionar, true);
    document.removeEventListener("keydown", tecla, true);
    if (fantasma()) fantasma().esconder(false);
    if (aoTerminar) aoTerminar(concluiu);
  }
  const ir = (delta) => {
    const novo = i + delta;
    if (novo < 0) return;
    if (novo >= PASSOS.length) { encerrar(true); return; }
    i = novo; desenhar();
  };
  function tecla(e) {
    if (e.key === "Escape") { e.stopPropagation(); encerrar(false); }
    else if (e.key === "ArrowRight") ir(1);
    else if (e.key === "ArrowLeft") ir(-1);
  }
  balao.addEventListener("click", (e) => {
    const b = e.target.closest("[data-t]");
    if (!b) return;
    if (b.dataset.t === "avancar") ir(1);
    else if (b.dataset.t === "voltar") ir(-1);
    else encerrar(false);
  });
  window.addEventListener("resize", posicionar);
  window.addEventListener("scroll", posicionar, true);
  document.addEventListener("keydown", tecla, true);
  ativo = { encerrar };
  desenhar();
}

export function encerrarTour() { if (ativo) ativo.encerrar(false); }

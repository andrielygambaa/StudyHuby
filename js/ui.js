// Componentes de interface: ícones, avatar, avisos (toasts), modais, formulários e estados da tela.
import { html, raw, esc, iniciais } from "./util.js";
import { aplicarGamificacao } from "./state.js";

// ---------- ícones (SVG simples, originais) ----------
const svg = (corpo) => raw(`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${corpo}</svg>`);
export const icone = {
  dashboard: svg('<rect x="3" y="3" width="7" height="7" rx="1.6"/><rect x="14" y="3" width="7" height="7" rx="1.6"/><rect x="3" y="14" width="7" height="7" rx="1.6"/><rect x="14" y="14" width="7" height="7" rx="1.6"/>'),
  pomodoro: svg('<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2h6"/>'),
  planner: svg('<path d="M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/>'),
  flashcards: svg('<rect x="3" y="7" width="14" height="13" rx="2.2"/><path d="M7 4h12a2 2 0 0 1 2 2v11"/>'),
  conquistas: svg('<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3"/>'),
  materias: svg('<path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z"/><circle cx="8" cy="8" r="1.4"/>'),
  check: svg('<path d="M5 12l5 5 9-11"/>'),
  play: svg('<path d="M7 4l13 8-13 8z"/>'),
  pause: svg('<rect x="6" y="4.5" width="4" height="15" rx="1"/><rect x="14" y="4.5" width="4" height="15" rx="1"/>'),
  stop: svg('<rect x="6" y="6" width="12" height="12" rx="2"/>'),
  reiniciar: svg('<path d="M4 12a8 8 0 1 0 2.6-5.9M4 4v4.5h4.5"/>'),
  seta: svg('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  mais: svg('<path d="M12 5v14M5 12h14"/>'),
  busca: svg('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.6-3.6"/>'),
  x: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  sol: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/>'),
  lua: svg('<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/>'),
  ajuda: svg('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.3a2.6 2.6 0 0 1 5 .9c0 1.8-2.5 2.2-2.5 4M12 17.4v.1"/>'),
  usuario: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
  config: svg('<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>'),
  sair: svg('<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10"/>'),
  olho: svg('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
  olhoOff: svg('<path d="M3 3l18 18M10.6 5.2A9.7 9.7 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3 3.9M6.5 6.6A17 17 0 0 0 2 12s3.6 7 10 7a9.6 9.6 0 0 0 4-.9M9.9 9.9a3 3 0 0 0 4.2 4.2"/>'),
  camera: svg('<path d="M4 8h3l1.5-2.5h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.5"/>'),
  raio: svg('<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>'),
};

export function avatar(usuario, classe = "") {
  const u = usuario || {};
  const dentro = u.foto ? html`<img src="${u.foto}" alt="">` : iniciais(u.nome);
  return html`<div class="avatar ${classe}" aria-hidden="true">${dentro}</div>`;
}
export const tagMateria = (m) => html`<span class="tag"><i class="dot" style="background:${m ? m.cor : "#8f98ff"}"></i>${m ? m.nome : "Sem matéria"}</span>`;

// Campo de senha com botão de mostrar/ocultar
export const campoSenha = (nome, rotulo, extra = "") => html`<div class="field"><label for="f-${nome}">${rotulo}</label>
  <div class="pw"><input id="f-${nome}" name="${nome}" type="password" ${raw(extra)}>
  <button type="button" data-ver="f-${nome}" aria-label="Mostrar senha" title="Mostrar senha">${icone.olho}</button></div></div>`;

document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-ver]");
  if (!b) return;
  const campo = document.getElementById(b.dataset.ver);
  if (!campo) return;
  const mostrar = campo.type === "password";
  campo.type = mostrar ? "text" : "password";
  b.innerHTML = String(mostrar ? icone.olhoOff : icone.olho);
  b.setAttribute("aria-label", mostrar ? "Ocultar senha" : "Mostrar senha");
  b.title = mostrar ? "Ocultar senha" : "Mostrar senha";
});

// ---------- avisos ----------
export function toast({ tipo = "info", titulo, texto = "", ms = 4800 }) {
  const el = document.createElement("div");
  el.className = `toast ${tipo}`;
  el.setAttribute("role", tipo === "erro" ? "alert" : "status");
  el.innerHTML = String(html`${tipo === "conquista" ? html`<div class="star on">★</div>` : ""}<div><b>${titulo}</b>${texto ? html`<span>${texto}</span>` : ""}</div>`);
  const fechar = () => el.remove();
  el.onclick = fechar;
  document.getElementById("toasts").appendChild(el);
  setTimeout(fechar, ms);
}
export const erroToast = (e) => toast({ tipo: "erro", titulo: "Algo deu errado", texto: e && e.message ? e.message : String(e), ms: 6500 });

const ORIGEM = { pomodoro: "Sessão Pomodoro concluída", topico: "Tópico revisado", flashcard: "Cartão respondido" };

// Mostra o que a API devolve no campo "gamificacao": XP, conquistas e subida de nível
export function mostrarGamificacao(g, { silencioso = false } = {}) {
  if (!g) return;
  aplicarGamificacao(g);
  if (!silencioso) toast({ tipo: "xp", titulo: `+${g.pontos} XP`, texto: ORIGEM[g.origem] || "XP ganho" });
  g.conquistas_desbloqueadas.forEach((c, i) =>
    setTimeout(() => toast({ tipo: "conquista", titulo: "Conquista desbloqueada!", texto: `${c.nome} · +${c.xp_bonus} XP de bônus`, ms: 6500 }), 250 * (i + 1)));
  if (g.subiu_de_nivel) setTimeout(() => modalNivel(g.nivel), 500);
}

// ---------- modais ----------
export function abrirModal(conteudo, { classe = "", aoFechar } = {}) {
  const ov = document.createElement("div");
  ov.className = "overlay";
  ov.innerHTML = `<div class="modal ${classe}" role="dialog" aria-modal="true">${conteudo}</div>`;
  document.body.appendChild(ov);
  let aberto = true;
  const tecla = (e) => { if (e.key === "Escape") fechar(); };
  function fechar() {
    if (!aberto) return;
    aberto = false;
    ov.remove();
    document.removeEventListener("keydown", tecla);
    if (aoFechar) aoFechar();
  }
  document.addEventListener("keydown", tecla);
  ov.addEventListener("mousedown", (e) => { if (e.target === ov) fechar(); });
  return { modal: ov.firstElementChild, fechar };
}

export function confirmar({ titulo, texto, ok = "Confirmar", perigo = false }) {
  return new Promise((resolve) => {
    let resposta = false;
    const { modal, fechar } = abrirModal(String(html`<h2>${titulo}</h2><p class="muted mt8">${texto}</p>
      <div class="acts"><button class="btn" data-x="nao">Cancelar</button>
      <button class="btn ${perigo ? "danger" : "primary"}" data-x="sim">${ok}</button></div>`), { aoFechar: () => resolve(resposta) });
    modal.addEventListener("click", (e) => {
      const b = e.target.closest("[data-x]");
      if (b) { resposta = b.dataset.x === "sim"; fechar(); }
    });
    modal.querySelector("[data-x=sim]").focus();
  });
}

function campo(c) {
  const base = `id="f-${esc(c.nome)}" name="${esc(c.nome)}"`;
  if (c.tipo === "senha") return campoSenha(c.nome, c.label, 'autocomplete="off"');
  let controle;
  if (c.tipo === "textarea") controle = html`<textarea ${raw(base)} maxlength="${c.max || 500}" placeholder="${c.placeholder || ""}">${c.valor || ""}</textarea>`;
  else if (c.tipo === "select") controle = html`<select ${raw(base)}>${c.opcoes.map((o) => html`<option value="${o.v}" ${String(o.v) === String(c.valor) ? raw("selected") : ""}>${o.t}</option>`)}</select>`;
  else controle = html`<input ${raw(base)} type="${c.tipo || "text"}" value="${c.valor ?? ""}" placeholder="${c.placeholder || ""}" autocomplete="off">`;
  return html`<div class="field"><label for="f-${c.nome}">${c.label}</label>${controle}</div>`;
}

// Formulário em modal. onSubmit(dados) pode lançar erro: a mensagem aparece no próprio formulário.
export function formulario({ titulo, descricao = "", campos, enviar = "Salvar", perigo = false, onSubmit }) {
  return new Promise((resolve) => {
    let resultado = null;
    const { modal, fechar } = abrirModal(String(html`<h2>${titulo}</h2>${descricao ? html`<p class="muted small">${descricao}</p>` : ""}
      <form class="col g16 mt16" novalidate>
        ${campos.map(campo)}
        <div class="err-text" data-erro role="alert"></div>
        <div class="acts" style="margin-top:0"><button type="button" class="btn" data-x="cancelar">Cancelar</button>
        <button type="submit" class="btn ${perigo ? "danger" : "primary"}">${enviar}</button></div>
      </form>`), { aoFechar: () => resolve(resultado) });
    const form = modal.querySelector("form"), erroEl = form.querySelector("[data-erro]");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      erroEl.textContent = "";
      const botao = form.querySelector("[type=submit]");
      botao.disabled = true; botao.classList.add("carregando");
      try {
        const r = await onSubmit(Object.fromEntries(new FormData(form)));
        resultado = r === undefined ? true : r;
        fechar();
      } catch (err) {
        erroEl.textContent = err.message;
        botao.disabled = false; botao.classList.remove("carregando");
      }
    });
    modal.querySelector("[data-x=cancelar]").onclick = () => fechar();
    const primeiro = form.querySelector("input, textarea, select");
    if (primeiro) primeiro.focus();
  });
}

export function modalNivel(nivel) {
  const { modal, fechar } = abrirModal(String(html`<div class="levelcircle">${nivel}</div>
    <h2>Você chegou ao nível ${nivel}!</h2><p class="muted mt8">Continue estudando para desbloquear o próximo.</p>
    <div class="acts" style="justify-content:center"><button class="btn primary lg" data-x="ok">Continuar</button></div>`), { classe: "nivel" });
  modal.querySelector("[data-x=ok]").onclick = () => fechar();
  modal.querySelector("[data-x=ok]").focus();
}

// ---------- estados da tela ----------
export const carregando = (linhas = 3) => html`<div class="grid" aria-busy="true">${Array.from({ length: linhas }, (_, i) => html`<div class="skel" style="height:${i === 0 ? 90 : 150}px"></div>`)}</div>`;
export const vazio = ({ titulo, texto = "", acao = "" }) => html`<div class="empty in-up"><h3>${titulo}</h3><p>${texto}</p>${acao ? html`<div class="mt16">${acao}</div>` : ""}</div>`;
export const blocoErro = (mensagem) => html`<div class="alert" role="alert"><span><b>Não foi possível carregar.</b> ${mensagem}</span><button class="btn sm" data-a="recarregar">Tentar de novo</button></div>`;

// ---------- animações reutilizáveis ----------
// Liga, dentro de um contêiner: elementos .reveal (aparecem ao rolar), barras [data-w] / [data-h] (crescem) e números [data-count] (contam).
export function animar(conteiner) {
  const reduzido = matchMedia("(prefers-reduced-motion: reduce)").matches;
  // a entrada animada roda só na primeira vez; ao redesenhar (filtrar, salvar...) a tela não "pisca"
  const repetido = conteiner.dataset.animado === "1";
  conteiner.dataset.animado = "1";
  conteiner.classList.toggle("estavel", repetido);
  if (repetido) {
    conteiner.querySelectorAll("[data-w]").forEach((el) => { el.style.width = el.dataset.w + "%"; });
    conteiner.querySelectorAll("[data-h]").forEach((el) => { el.style.height = el.dataset.h + "%"; });
    conteiner.querySelectorAll("[data-count]").forEach((el) => { el.textContent = el.dataset.count; });
    conteiner.querySelectorAll(".reveal").forEach((el) => el.classList.add("in"));
    return;
  }
  requestAnimationFrame(() => requestAnimationFrame(() => {
    conteiner.querySelectorAll("[data-w]").forEach((el) => { el.style.width = el.dataset.w + "%"; });
    conteiner.querySelectorAll("[data-h]").forEach((el) => { el.style.height = el.dataset.h + "%"; });
  }));
  conteiner.querySelectorAll("[data-count]").forEach((el) => {
    const fim = Number(el.dataset.count) || 0;
    if (reduzido || fim === 0) { el.textContent = fim; return; }
    const inicio = performance.now(), dur = 700;
    const passo = (t) => {
      const p = Math.min(1, (t - inicio) / dur);
      el.textContent = Math.round(fim * (1 - Math.pow(1 - p, 3)));
      if (p < 1 && el.isConnected) requestAnimationFrame(passo);
    };
    requestAnimationFrame(passo);
  });
  const alvos = conteiner.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window) || reduzido) { alvos.forEach((el) => el.classList.add("in")); return; }
  const obs = new IntersectionObserver((entradas) => entradas.forEach((en) => {
    if (en.isIntersecting) { en.target.classList.add("in"); obs.unobserve(en.target); }
  }), { threshold: 0.08 });
  alvos.forEach((el) => obs.observe(el));
}

export function ocupado(botao, sim) {
  if (!botao) return;
  botao.disabled = sim;
  botao.classList.toggle("carregando", sim);
}

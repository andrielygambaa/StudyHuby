import { api } from "../api.js";
import { state, uid } from "../state.js";
import { html, fmtQuando, fmtDataCurta } from "../util.js";
import { animar, carregando, vazio } from "../ui.js";

const ORIGENS = { pomodoro: "Pomodoro", topico: "Tópico", flashcard: "Flashcard", conquista: "Conquista" };

export async function conquistas(el) {
  el.innerHTML = String(carregando(2));
  const [catalogo, minhas, extrato] = await Promise.all([api.get("/conquistas"), api.get(`/usuarios/${uid()}/conquistas`), api.get(`/usuarios/${uid()}/xp?limite=50`)]);
  const desbloqueadas = new Map(minhas.map((x) => [x.conquista_id, x.desbloqueada_em]));
  let filtro = "";

  function desenhar() {
    const u = state.usuario;
    const lista = extrato.extrato.filter((x) => !filtro || x.origem === filtro);
    el.innerHTML = String(html`
      <div class="head"><div><h1>Conquistas e XP</h1><p>Sua evolução no StudyHub</p></div></div>
      <div class="card hi row g16 wrap in-up"><div class="levelcircle" data-count="${u.nivel}">0</div>
        <div class="grow" style="min-width:200px"><div class="row between wrap"><h2>Nível ${u.nivel}</h2><span class="muted">${u.xp_total} XP no total</span></div>
          <div class="bar mt16"><i data-w="${u.xp_no_nivel}"></i></div><div class="small muted mt8">${u.xp_no_nivel} / 100 XP · faltam ${u.xp_para_proximo_nivel} XP para o nível ${u.nivel + 1}</div></div></div>
      <div class="grid c2 mt16" style="align-items:start">
        <div class="card in-up" style="--i:1"><div class="row between mb16"><div class="eyebrow" style="margin:0">Conquistas · ${desbloqueadas.size} de ${catalogo.length}</div></div>
          <div class="tiles">${catalogo.map((c, i) => { const em = desbloqueadas.get(c.id); return html`<div class="tile ${em ? "" : "locked"} reveal" style="--i:${i}">
            <div class="row" style="align-items:flex-start"><div class="star ${em ? "on" : ""}">${em ? "★" : "?"}</div><div><b>${c.nome}</b><div class="small muted">${c.descricao}</div></div></div>
            <div class="row between small"><b class="${em ? "lime" : "muted"}">+${c.xp_bonus} XP</b><span class="muted tiny">${em ? "desbloqueada em " + fmtDataCurta(em) : "bloqueada"}</span></div></div>`; })}</div></div>
        <div class="card in-up" style="--i:2"><div class="eyebrow">Extrato de XP</div>
          <div class="chips mb16" role="group" aria-label="Filtrar por origem"><button class="chip ${!filtro ? "on" : ""}" data-f="">Todos</button>${Object.entries(ORIGENS).map(([k, n]) => html`<button class="chip ${filtro === k ? "on" : ""}" data-f="${k}">${n}</button>`)}</div>
          ${lista.length ? lista.map((x) => html`<div class="xprow"><span class="xpv">+${x.pontos}</span><span class="grow small"><b>${ORIGENS[x.origem] || x.origem}</b><br><span class="muted">${x.descricao || ""}</span></span><span class="tiny muted">${fmtQuando(x.criado_em)}</span></div>`)
            : vazio({ titulo: "Nada por aqui ainda", texto: filtro ? "Nenhum XP com essa origem." : "Conclua uma sessão Pomodoro, revise um tópico ou um cartão para ganhar XP." })}</div>
      </div>`);
    animar(el);
  }
  el.addEventListener("click", (e) => { const f = e.target.closest("[data-f]"); if (f) { filtro = f.dataset.f; desenhar(); } });
  desenhar();
}

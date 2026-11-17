import { api } from "../api.js";
import { state, uid } from "../state.js";
import { html, fmtMin, fmtQuando, diaSemana, hojeISO, primeiroNome, plural } from "../util.js";
import { icone, animar, carregando } from "../ui.js";

const ORIGENS = { pomodoro: "Pomodoro", topico: "Tópico", flashcard: "Flashcard", conquista: "Conquista" };

export async function dashboard(el) {
  el.innerHTML = String(carregando(3));
  const d = await api.get(`/usuarios/${uid()}/dashboard`);
  const u = state.usuario, p = d.pomodoro, hoje = hojeISO();
  const maior = Math.max(1, ...p.minutos_por_dia.map((x) => x.minutos));
  const maiorMat = Math.max(1, ...p.minutos_por_materia.map((x) => x.minutos));
  const totalTopicos = d.planner.progresso_por_materia.reduce((n, m) => n + m.total, 0);
  const dataTxt = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  const data = dataTxt.charAt(0).toUpperCase() + dataTxt.slice(1);
  const pend = d.flashcards.cartoes_para_revisar_hoje;

  el.innerHTML = String(html`
    <div class="head"><div><h1>Olá, <span class="hl">${primeiroNome(u.nome)}</span></h1><p>${data}</p></div>
      <a class="btn primary lg" href="#/pomodoro">${icone.play} Iniciar Pomodoro</a></div>
    <div class="grid c4" data-tour="dashboard">
      <div class="card hi lift in-up" style="--i:0"><div class="eyebrow">Nível</div>
        <div class="row between" style="align-items:flex-end"><div class="num" data-count="${u.nivel}">0</div><span class="small muted">${u.xp_total} XP no total</span></div>
        <div class="bar mt16"><i data-w="${u.xp_no_nivel}"></i></div><div class="tiny muted mt8">${u.xp_no_nivel} / 100 XP para o nível ${u.nivel + 1}</div></div>
      <div class="card lift in-up" style="--i:1"><div class="eyebrow">Minutos na semana</div><div class="num"><span data-count="${p.minutos_na_semana}">0</span><small> min</small></div>
        <div class="small muted mt16">${p.sessoes_concluidas} ${plural(p.sessoes_concluidas, "sessão concluída", "sessões concluídas")} no total</div></div>
      <div class="card lift in-up ${pend ? "limec" : ""}" style="--i:2"><div class="eyebrow">Cartões para revisar hoje</div><div class="num" data-count="${pend}">0</div>
        <div class="mt16">${pend ? html`<a class="btn primary sm" href="#/flashcards">Revisar agora</a>` : html`<span class="small muted">Tudo em dia ✓</span>`}</div></div>
      <div class="card lift in-up" style="--i:3"><div class="eyebrow">Tópicos revisados</div><div class="num" data-count="${d.planner.topicos_revisados}">0</div>
        <div class="small muted mt16">de ${totalTopicos} no planner</div></div>
    </div>
    <div class="grid c2 mt16">
      <div class="card reveal"><div class="eyebrow">Minutos por dia · últimos 7 dias</div>
        <div class="chart" role="img" aria-label="Minutos estudados por dia nos últimos 7 dias">${p.minutos_por_dia.map((x) => html`<div class="c" title="${fmtMin(x.minutos)}">
          <span class="tiny muted">${x.minutos || ""}</span><div class="b ${x.data === hoje ? "hoje" : ""}" data-h="${Math.round((x.minutos / maior) * 78)}"></div>
          <small class="${x.data === hoje ? "hoje" : ""}">${diaSemana(x.data)}</small></div>`)}</div></div>
      <div class="card reveal" style="--i:1"><div class="eyebrow">Progresso por matéria</div>
        ${d.planner.progresso_por_materia.length ? d.planner.progresso_por_materia.map((m) => html`<div class="hbar"><span class="small">${m.materia}</span>
          <div class="bar thin"><i data-w="${m.percentual_revisado}" style="background:${m.cor}"></i></div><span class="tiny muted" style="text-align:right">${m.percentual_revisado}%</span></div>`)
          : html`<p class="small muted">Cadastre tópicos no <a class="linkbtn" href="#/planner">Planner</a> para acompanhar aqui.</p>`}</div>
    </div>
    <div class="grid c3 mt16">
      <div class="card reveal"><div class="eyebrow">Minutos por matéria na semana</div>
        ${p.minutos_por_materia.length ? p.minutos_por_materia.map((m) => html`<div class="hbar"><span class="small">${m.materia}</span>
          <div class="bar thin"><i data-w="${Math.round((m.minutos / maiorMat) * 100)}" style="background:${m.cor}"></i></div><span class="tiny muted" style="text-align:right">${m.minutos}</span></div>`)
          : html`<p class="small muted">Nenhuma sessão nesta semana ainda.</p>`}</div>
      <div class="card reveal" style="--i:1"><div class="eyebrow">Conquistas</div>
        <div class="stars">${Array.from({ length: d.gamificacao.total_conquistas }, (_, i) => html`<div class="star ${i < d.gamificacao.conquistas_desbloqueadas ? "on" : ""}">★</div>`)}</div>
        <div class="small muted mt16">${d.gamificacao.conquistas_desbloqueadas} de ${d.gamificacao.total_conquistas} desbloqueadas · <a class="linkbtn" href="#/conquistas">ver todas</a></div></div>
      <div class="card reveal" style="--i:2"><div class="eyebrow">Últimos XP</div>
        ${d.gamificacao.ultimos_xp.length ? d.gamificacao.ultimos_xp.map((x) => html`<div class="xprow"><span class="xpv">+${x.pontos}</span>
          <span class="grow small">${ORIGENS[x.origem] || x.origem}</span><span class="tiny muted">${fmtQuando(x.criado_em)}</span></div>`)
          : html`<p class="small muted">Conclua uma sessão, revise um tópico ou um cartão para ganhar XP.</p>`}</div>
    </div>`);
  animar(el);
}

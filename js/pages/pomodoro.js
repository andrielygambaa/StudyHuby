import { api } from "../api.js";
import { uid, carregarMaterias } from "../state.js";
import { html, raw, fmtMin, fmtQuando, diaSemana, hojeISO, plural } from "../util.js";
import { icone, animar, carregando, confirmar } from "../ui.js";
import * as T from "../timer.js";

const C = 2 * Math.PI * 54;   // comprimento do anel

export async function pomodoro(el) {
  el.innerHTML = String(carregando(2));
  const [materias, topicos] = await Promise.all([carregarMaterias(), api.get(`/usuarios/${uid()}/topicos`)]);
  if (T.timer.status === "parado" && !materias.some((m) => m.id === T.timer.materiaId)) T.configurar({ materiaId: materias[0] ? materias[0].id : null, topicoId: null });

  el.innerHTML = String(html`
    <div class="head"><div><h1>Pomodoro</h1><p>Foque, registre e ganhe XP</p></div></div>
    <div class="grid c2">
      <div class="card in-up">
        <div class="chips" style="justify-content:center" role="group" aria-label="Modo do relógio">${Object.entries(T.MODOS).map(([k, m]) => html`<button class="chip" data-modo="${k}">${m.rotulo} · ${m.min} min</button>`)}</div>
        <div class="ringwrap mt16"><svg viewBox="0 0 120 120" aria-hidden="true"><circle class="bg" cx="60" cy="60" r="54"/><circle class="fg" cx="60" cy="60" r="54" stroke-dasharray="${C}" stroke-dashoffset="0"/></svg>
          <div class="ringtxt"><div><div class="time" data-tempo role="timer" aria-live="off">25:00</div><div class="small muted" data-rotulo></div></div></div></div>
        <div class="pctrl" data-ctrl>
          <button class="btn" data-a="reiniciar" aria-label="Reiniciar" title="Voltar o relógio para o início, sem registrar">${icone.reiniciar}<span class="hide-xs">Reiniciar</span></button>
          <button class="playbtn" data-a="principal" aria-label="Iniciar"></button>
          <button class="btn" data-a="encerrar" aria-label="Encerrar" title="Encerrar agora e registrar como interrompida">${icone.stop}<span class="hide-xs">Encerrar</span></button>
        </div>
        <p class="center small muted" data-dica></p>
        <div class="grid c3 mt16" style="align-items:end">
          <div class="field"><label for="p-materia">Matéria</label><select id="p-materia">${materias.map((m) => html`<option value="${m.id}">${m.nome}</option>`)}</select></div>
          <div class="field"><label for="p-topico">Tópico (opcional)</label><select id="p-topico"></select></div>
          <div class="field"><label for="p-min">Duração (min)</label><input id="p-min" type="number" min="1" max="240" inputmode="numeric"></div>
        </div>
      </div>
      <div class="col g16"><div class="card in-up" style="--i:1" data-hoje></div><div class="card in-up" style="--i:2" data-semana></div></div>
    </div>`);

  const $ = (s) => el.querySelector(s);
  const selMat = $("#p-materia"), selTop = $("#p-topico"), inMin = $("#p-min");
  const nomeMateria = (id) => (materias.find((m) => m.id === id) || {}).nome || "";

  function opcoesTopico() {
    const doMat = topicos.filter((t) => t.materia_id === Number(selMat.value) && t.status !== "revisado");
    selTop.innerHTML = String(html`<option value="">Nenhum</option>${doMat.map((t) => html`<option value="${t.id}">${t.titulo}</option>`)}`);
    selTop.value = doMat.some((t) => t.id === T.timer.topicoId) ? String(T.timer.topicoId) : "";
  }

  function pintar() {
    const t = T.timer, rest = T.restante(), parado = t.status === "parado", foco = t.modo === "foco";
    $("[data-tempo]").textContent = T.formatar(rest);
    $(".fg").style.strokeDashoffset = String(C * (1 - rest / T.totalMs()));
    $("[data-rotulo]").textContent = foco ? nomeMateria(t.materiaId) || "Escolha uma matéria" : T.MODOS[t.modo].rotulo;
    el.querySelectorAll("[data-modo]").forEach((b) => { b.classList.toggle("on", b.dataset.modo === t.modo); b.disabled = !parado; });
    const pb = $(".playbtn"), rodando = t.status === "rodando";
    pb.className = "playbtn " + (rodando ? "rodando" : t.status === "pausado" ? "pausado" : "");
    pb.innerHTML = String(rodando ? icone.pause : icone.play);
    pb.setAttribute("aria-label", rodando ? "Pausar" : t.status === "pausado" ? "Retomar" : "Iniciar");
    pb.dataset.estado = t.status;
    $('[data-a="reiniciar"]').disabled = parado;
    $('[data-a="encerrar"]').disabled = parado;
    $("[data-dica]").textContent = rodando ? "Foco total! Pause se precisar." : t.status === "pausado" ? "Pausado. Aperte o botão para retomar." : foco ? "Aperte o botão para iniciar." : "Hora de descansar um pouco.";
    [selMat, selTop, inMin].forEach((c) => { c.disabled = !parado || !foco && c !== inMin; });
    if (document.activeElement !== inMin) inMin.value = t.minutos;
    if (t.materiaId) selMat.value = String(t.materiaId);
  }

  async function lateral() {
    const [sessoes, dash] = await Promise.all([api.get(`/usuarios/${uid()}/sessoes?de=${hojeISO()}`), api.get(`/usuarios/${uid()}/dashboard`)]);
    if (!el.isConnected) return;
    const feitas = sessoes.filter((s) => s.concluida), min = feitas.reduce((n, s) => n + s.duracao_min, 0);
    $("[data-hoje]").innerHTML = String(html`<div class="eyebrow">Hoje</div>
      <div class="row between" style="align-items:flex-end"><div class="num" style="font-size:30px">${fmtMin(min)}</div><span class="small muted">${feitas.length} ${plural(feitas.length, "sessão concluída", "sessões concluídas")}</span></div>
      ${sessoes.length ? html`<div class="mt16">${sessoes.slice(0, 6).map((s) => html`<div class="xprow"><span class="xpv" style="color:${s.concluida ? "var(--lime-text)" : "var(--muted)"}">${s.concluida ? "✓" : "✕"}</span>
        <span class="grow small"><b>${nomeMateria(s.materia_id)}</b>${s.concluida ? "" : raw(' <span class="muted">· interrompida</span>')}</span>
        <span class="small">${s.duracao_min} min</span><span class="tiny muted">${fmtQuando(s.iniciada_em).replace("hoje ", "")}</span></div>`)}</div>`
        : html`<p class="small muted mt16">Nenhuma sessão hoje. Que tal começar agora?</p>`}`);
    const dias = dash.pomodoro.minutos_por_dia, maior = Math.max(1, ...dias.map((x) => x.minutos)), hoje = hojeISO();
    $("[data-semana]").innerHTML = String(html`<div class="eyebrow">Semana · ${fmtMin(dash.pomodoro.minutos_na_semana)}</div>
      <div class="chart" style="height:110px">${dias.map((x) => html`<div class="c" title="${fmtMin(x.minutos)}"><div class="b ${x.data === hoje ? "hoje" : ""}" data-h="${Math.round((x.minutos / maior) * 80)}"></div>
        <small class="${x.data === hoje ? "hoje" : ""}">${diaSemana(x.data)}</small></div>`)}</div>`);
    animar($("[data-semana]"));
  }

  el.addEventListener("click", async (e) => {
    const modo = e.target.closest("[data-modo]"), a = e.target.closest("[data-a]");
    if (modo) { T.configurar({ modo: modo.dataset.modo }); return; }
    if (!a) return;
    if (a.dataset.a === "principal") { if (T.timer.status === "rodando") T.pausar(); else T.iniciar(); }
    else if (a.dataset.a === "reiniciar") T.reiniciar();
    else if (a.dataset.a === "encerrar") {
      const foco = T.timer.modo === "foco";
      if (!foco || await confirmar({ titulo: "Encerrar a sessão agora?", texto: "Ela será registrada como interrompida e não vale XP. Para só zerar o relógio, use Reiniciar.", ok: "Encerrar" })) T.encerrar();
    }
  });
  selMat.addEventListener("change", () => { T.configurar({ materiaId: Number(selMat.value), topicoId: null }); opcoesTopico(); });
  selTop.addEventListener("change", () => T.configurar({ topicoId: selTop.value ? Number(selTop.value) : null }));
  inMin.addEventListener("change", () => { T.configurar({ minutos: Number(inMin.value) || 25 }); inMin.value = T.timer.minutos; });

  const desligar = T.assinar((evento) => { pintar(); if (evento === "concluido") lateral().catch(() => {}); });
  opcoesTopico(); pintar();
  await lateral();
  return desligar;
}

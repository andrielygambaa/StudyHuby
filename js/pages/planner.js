import { api } from "../api.js";
import { uid, carregarMaterias, materiaPorId } from "../state.js";
import { html } from "../util.js";
import { icone, animar, carregando, confirmar, formulario, tagMateria, erroToast, mostrarGamificacao, toast } from "../ui.js";

const COLUNAS = [["nao_visto", "Não visto"], ["estudando", "Estudando"], ["revisado", "Revisado"]];

export async function planner(el) {
  el.innerHTML = String(carregando(2));
  const materias = await carregarMaterias();
  let topicos = await api.get(`/usuarios/${uid()}/topicos`);
  let filtroMat = "", filtroStatus = "";
  const opcoes = () => materias.map((m) => ({ v: m.id, t: m.nome }));

  function desenhar() {
    const visiveis = topicos.filter((t) => (!filtroMat || t.materia_id === Number(filtroMat)) && (!filtroStatus || t.status === filtroStatus));
    const porMat = materias.map((m) => { const seus = topicos.filter((t) => t.materia_id === m.id); return { m, total: seus.length, rev: seus.filter((t) => t.status === "revisado").length }; }).filter((x) => x.total);
    el.innerHTML = String(html`
      <div class="head"><div><h1>Planner</h1><p>Organize o que falta estudar</p></div><button class="btn primary" data-a="novo">${icone.mais} Novo tópico</button></div>
      <div class="row wrap mb16"><div class="field" style="min-width:210px"><label class="sr" for="pl-mat">Filtrar por matéria</label><select id="pl-mat"><option value="">Todas as matérias</option>${materias.map((m) => html`<option value="${m.id}" ${String(m.id) === filtroMat ? "selected" : ""}>${m.nome}</option>`)}</select></div>
        <div class="chips" role="group" aria-label="Filtrar por status"><button class="chip ${!filtroStatus ? "on" : ""}" data-st="">Todos</button>${COLUNAS.map(([k, n]) => html`<button class="chip ${filtroStatus === k ? "on" : ""}" data-st="${k}">${n}</button>`)}</div></div>
      ${porMat.length ? html`<div class="grid mb16" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr))">${porMat.map((x) => html`<div class="card" style="padding:14px"><div class="row between small"><b>${x.m.nome}</b><span class="muted tiny">${x.rev} de ${x.total}</span></div>
        <div class="bar thin mt8"><i data-w="${Math.round((x.rev / x.total) * 100)}" style="background:${x.m.cor}"></i></div></div>`)}</div>` : ""}
      <div class="kanban">${COLUNAS.map(([k, nome]) => { const lista = visiveis.filter((t) => t.status === k); return html`<section class="kcol" data-col="${k}" aria-label="${nome}">
        <h3>${nome}<span class="pill dim">${lista.length}</span></h3>
        ${k === "nao_visto" ? html`<button class="addcard" data-a="novo">+ Adicionar tópico</button>` : ""}
        ${lista.map((t) => html`<article class="tcard" data-id="${t.id}"><div class="row between">${tagMateria(materiaPorId(t.materia_id))}
          <details class="menu"><summary aria-label="Opções do tópico">⋯</summary><div class="menu-pop"><button data-a="editar">Editar</button><button class="del" data-a="excluir">Excluir</button></div></details></div>
          <h4>${t.titulo}</h4>
          <div class="row between">${k === "revisado" ? html`<span class="small lime bold">✓ Revisado</span>` : html`<span class="tiny muted">${k === "nao_visto" ? "Ainda não visto" : "Em estudo"}</span><button class="btn sm" data-a="avancar">Avançar ${icone.seta}</button>`}</div></article>`)}
        ${!lista.length && k !== "nao_visto" ? html`<p class="small muted center" style="padding:18px 6px">${k === "estudando" ? "Avance um tópico para ele aparecer aqui." : "Os tópicos revisados chegam aqui e valem +15 XP."}</p>` : ""}</section>`; })}</div>`);
    animar(el);
  }

  async function novo() {
    if (!materias.length) { toast({ tipo: "erro", titulo: "Cadastre uma matéria primeiro", texto: "Vá em Matérias para criar." }); return; }
    const criado = await formulario({ titulo: "Novo tópico", enviar: "Adicionar", campos: [
      { nome: "materia_id", label: "Matéria", tipo: "select", opcoes: opcoes(), valor: filtroMat || materias[0].id },
      { nome: "titulo", label: "Título", placeholder: "Ex.: Funções do 2º grau" }],
      onSubmit: (d) => api.post(`/usuarios/${uid()}/topicos`, { materia_id: Number(d.materia_id), titulo: d.titulo }) });
    if (criado) { topicos.unshift(criado); desenhar(); }
  }

  el.addEventListener("change", (e) => { if (e.target.id === "pl-mat") { filtroMat = e.target.value; desenhar(); } });
  el.addEventListener("click", async (e) => {
    const st = e.target.closest("[data-st]"), a = e.target.closest("[data-a]");
    if (st) { filtroStatus = st.dataset.st; desenhar(); return; }
    if (!a) return;
    const cartao = a.closest("[data-id]"), t = cartao && topicos.find((x) => x.id === Number(cartao.dataset.id));
    try {
      if (a.dataset.a === "novo") await novo();
      else if (a.dataset.a === "avancar") {
        a.disabled = true;
        const r = await api.post(`/topicos/${t.id}/avancar`);
        Object.assign(t, r.topico); desenhar(); mostrarGamificacao(r.gamificacao);
      } else if (a.dataset.a === "editar") {
        const novoT = await formulario({ titulo: "Editar tópico", campos: [
          { nome: "materia_id", label: "Matéria", tipo: "select", opcoes: opcoes(), valor: t.materia_id }, { nome: "titulo", label: "Título", valor: t.titulo }],
          onSubmit: (d) => api.put(`/topicos/${t.id}`, { materia_id: Number(d.materia_id), titulo: d.titulo }) });
        if (novoT) { Object.assign(t, novoT); desenhar(); }
      } else if (a.dataset.a === "excluir") {
        if (await confirmar({ titulo: "Excluir o tópico?", texto: `“${t.titulo}” será apagado. Essa ação não pode ser desfeita.`, ok: "Excluir", perigo: true })) {
          await api.del(`/topicos/${t.id}`); topicos = topicos.filter((x) => x.id !== t.id); desenhar();
        }
      }
    } catch (err) { erroToast(err); desenhar(); }
  });
  desenhar();
}

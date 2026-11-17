import { api } from "../api.js";
import { carregarMaterias, state } from "../state.js";
import { html } from "../util.js";
import { icone, animar, carregando, confirmar, erroToast, toast, vazio } from "../ui.js";

const PALETA = ["#e63946", "#f4a261", "#e9c46a", "#38b000", "#2a9d8f", "#0077b6", "#3a86ff", "#8338ec", "#ff006e", "#b5838d"];

export async function materias(el) {
  el.innerHTML = String(carregando(2));
  await carregarMaterias(true);
  let editando = null, cor = PALETA[6], erroTopo = "";

  function desenhar() {
    const lista = state.materias, m = editando && lista.find((x) => x.id === editando);
    if (m) cor = m.cor;
    el.innerHTML = String(html`
      <div class="head"><div><h1>Matérias</h1><p>Os assuntos que você estuda. Elas são só suas.</p></div></div>
      ${erroTopo ? html`<div class="alert mb16" role="alert"><span>${erroTopo}</span><button class="btn sm" data-a="fechar-erro">OK</button></div>` : ""}
      <div class="grid c2" style="align-items:start">
        <div class="card in-up">${lista.length ? html`<div class="tblwrap"><table class="tbl"><thead><tr><th></th><th>Matéria</th><th class="r">Ações</th></tr></thead><tbody>
          ${lista.map((x) => html`<tr data-id="${x.id}" class="${x.id === editando ? "hoje" : ""}"><td style="width:34px"><span class="dot" style="width:16px;height:16px;background:${x.cor}"></span></td><td><b>${x.nome}</b></td>
            <td class="r"><div class="row" style="justify-content:flex-end;gap:6px"><button class="btn sm" data-a="editar">Editar</button><button class="btn sm danger" data-a="excluir">Excluir</button></div></td></tr>`)}
          </tbody></table></div>` : vazio({ titulo: "Nenhuma matéria", texto: "Crie a primeira no formulário ao lado." })}</div>
        <form class="card col g16 in-up" style="--i:1" novalidate data-form>
          <div class="eyebrow" style="margin:0">${m ? "Editar matéria" : "Nova matéria"}</div>
          <div class="field"><label for="m-nome">Nome</label><input id="m-nome" name="nome" maxlength="60" placeholder="Ex.: Sociologia" value="${m ? m.nome : ""}"></div>
          <div class="field"><label>Cor</label><div class="row wrap" style="gap:8px" role="radiogroup" aria-label="Cor da matéria">${PALETA.map((c) => html`<button type="button" class="iconbtn" data-cor="${c}" role="radio" aria-checked="${c === cor}" aria-label="Cor ${c}"
            style="width:30px;height:30px;flex-basis:30px;border-radius:50%;background:${c};${c === cor ? "box-shadow:0 0 0 3px var(--bg),0 0 0 5px var(--text)" : ""}"></button>`)}</div></div>
          <div class="field"><label for="m-cor">Código da cor</label><input id="m-cor" name="cor" maxlength="7" value="${cor}" placeholder="#RRGGBB"></div>
          <div class="err-text" data-erro role="alert"></div>
          <div class="row"><button class="btn primary" type="submit">${m ? "Salvar alterações" : html`${icone.mais} Adicionar matéria`}</button>${m ? html`<button class="btn" type="button" data-a="cancelar">Cancelar</button>` : ""}</div>
        </form>
      </div>`);
    animar(el);
  }

  el.addEventListener("click", async (e) => {
    const c = e.target.closest("[data-cor]"), a = e.target.closest("[data-a]");
    if (c) { cor = c.dataset.cor; const nome = el.querySelector("#m-nome").value; desenharMantendo(nome); return; }
    if (!a) return;
    const linha = a.closest("tr[data-id]"), id = linha && Number(linha.dataset.id);
    if (a.dataset.a === "fechar-erro") { erroTopo = ""; desenhar(); }
    else if (a.dataset.a === "cancelar") { editando = null; cor = PALETA[6]; desenhar(); }
    else if (a.dataset.a === "editar") { editando = id; erroTopo = ""; desenhar(); el.querySelector("#m-nome").focus(); }
    else if (a.dataset.a === "excluir") {
      const m = state.materias.find((x) => x.id === id);
      if (!(await confirmar({ titulo: "Excluir a matéria?", texto: `“${m.nome}” será apagada.`, ok: "Excluir", perigo: true }))) return;
      try {
        await api.del(`/materias/${id}`);
        state.materias = state.materias.filter((x) => x.id !== id);
        if (editando === id) editando = null;
        erroTopo = ""; desenhar(); toast({ tipo: "ok", titulo: "Matéria excluída" });
      } catch (err) {
        if (err.status === 409) { erroTopo = `Não foi possível excluir “${m.nome}”: ela está em uso por tópicos, sessões ou baralhos.`; desenhar(); }
        else erroToast(err);
      }
    }
  });
  function desenharMantendo(nome) {
    const m = editando && state.materias.find((x) => x.id === editando);
    if (m) m.cor = cor;              // só na tela; vale de verdade ao salvar
    desenhar();
    el.querySelector("#m-nome").value = nome;
  }
  el.addEventListener("input", (e) => { if (e.target.id === "m-cor" && /^#[0-9a-fA-F]{6}$/.test(e.target.value)) cor = e.target.value.toLowerCase(); });
  el.addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target, erro = f.querySelector("[data-erro]");
    const dados = { nome: f.nome.value, cor: f.cor.value.trim() };
    try {
      if (editando) {
        const nova = await api.put(`/materias/${editando}`, dados);
        Object.assign(state.materias.find((x) => x.id === editando), nova);
        editando = null; toast({ tipo: "ok", titulo: "Matéria atualizada" });
      } else {
        state.materias.push(await api.post("/materias", dados));
        toast({ tipo: "ok", titulo: "Matéria criada" });
      }
      state.materias.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
      cor = PALETA[6]; desenhar();
    } catch (err) { erro.textContent = err.message; }
  });
  desenhar();
  return async () => { await carregarMaterias(true).catch(() => {}); };   // descarta cores mudadas e não salvas
}

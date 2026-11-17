import { api } from "../api.js";
import { uid, carregarMaterias, materiaPorId } from "../state.js";
import { html, fmtProxima, plural } from "../util.js";
import { icone, animar, carregando, confirmar, formulario, tagMateria, erroToast, mostrarGamificacao, toast, vazio } from "../ui.js";

const opcoesMat = (materias) => materias.map((m) => ({ v: m.id, t: m.nome }));

// ------------------------------------------------------------------ lista de baralhos
export async function listaBaralhos(el) {
  el.innerHTML = String(carregando(2));
  const materias = await carregarMaterias();
  let baralhos = await api.get(`/usuarios/${uid()}/baralhos`);

  function desenhar() {
    const pend = baralhos.reduce((n, b) => n + b.para_revisar, 0), comPend = baralhos.filter((b) => b.para_revisar);
    el.innerHTML = String(html`
      <div class="head"><div><h1>Flashcards</h1><p>Seus baralhos de estudo</p></div><button class="btn primary" data-a="novo">${icone.mais} Novo baralho</button></div>
      ${pend ? html`<div class="card limec row between wrap mb16 in-up"><div class="row"><div class="num">${pend}</div><div><b>${plural(pend, "cartão para revisar hoje", "cartões para revisar hoje")}</b>
        <div class="small muted">em ${comPend.length} ${plural(comPend.length, "baralho", "baralhos")}</div></div></div><a class="btn primary" href="#/flashcards/${comPend[0].id}/revisar">Começar a revisão ${icone.seta}</a></div>` : ""}
      ${!baralhos.length ? vazio({ titulo: "Você ainda não tem baralhos", texto: "Crie o primeiro e adicione cartões de pergunta e resposta.", acao: html`<button class="btn primary" data-a="novo">${icone.mais} Novo baralho</button>` })
        : html`<div class="decks">${baralhos.map((b, i) => html`<article class="card deck lift in-up" style="--i:${i}" data-id="${b.id}">
          <div class="row between"><span class="tag"><i class="dot" style="background:${b.cor}"></i>${b.materia}</span>${b.para_revisar ? html`<span class="pill">${b.para_revisar} hoje</span>` : html`<span class="small muted">em dia ✓</span>`}</div>
          <div class="cover" style="background:linear-gradient(135deg, ${b.cor}, #3a5bff)"></div>
          <div><h3>${b.nome}</h3><div class="small muted">${b.total_cartoes} ${plural(b.total_cartoes, "cartão", "cartões")}</div></div>
          <div class="row"><a class="btn sm" href="#/flashcards/${b.id}">Abrir</a>${b.para_revisar ? html`<a class="btn sm primary" href="#/flashcards/${b.id}/revisar">Revisar</a>` : ""}</div></article>`)}
          <button class="card deck novo" data-a="novo"><span style="font-size:30px;font-weight:300">+</span>Novo baralho</button></div>`}`);
    animar(el);
  }
  el.addEventListener("click", async (e) => {
    if (!e.target.closest('[data-a="novo"]')) return;
    if (!materias.length) { toast({ tipo: "erro", titulo: "Cadastre uma matéria primeiro" }); return; }
    const criado = await formulario({ titulo: "Novo baralho", enviar: "Criar", campos: [
      { nome: "nome", label: "Nome do baralho", placeholder: "Ex.: Fórmulas de Matemática" }, { nome: "materia_id", label: "Matéria", tipo: "select", opcoes: opcoesMat(materias), valor: materias[0].id }],
      onSubmit: (d) => api.post(`/usuarios/${uid()}/baralhos`, { nome: d.nome, materia_id: Number(d.materia_id) }) });
    if (criado) location.hash = `#/flashcards/${criado.id}`;
  });
  desenhar();
}

// ------------------------------------------------------------------ um baralho e seus cartões
export async function baralho(el, { params: [id] }) {
  el.innerHTML = String(carregando(2));
  const materias = await carregarMaterias();
  let b = await api.get(`/baralhos/${id}`);

  function desenhar() {
    const hoje = b.cartoes.filter((c) => fmtProxima(c.proxima_revisao) === "hoje").length;
    el.innerHTML = String(html`
      <p class="small muted mb16"><a class="linkbtn" href="#/flashcards">Flashcards</a> › ${b.nome}</p>
      <div class="head"><div><div class="row wrap"><h1>${b.nome}</h1>${tagMateria(materiaPorId(b.materia_id))}</div><p>${b.cartoes.length} ${plural(b.cartoes.length, "cartão", "cartões")} · ${hoje} para revisar hoje</p></div>
        <div class="row wrap"><button class="btn" data-a="editar-baralho">Editar</button><button class="btn danger" data-a="excluir-baralho">Excluir</button>
        ${hoje ? html`<a class="btn primary" href="#/flashcards/${b.id}/revisar">Revisar (${hoje})</a>` : html`<button class="btn primary" disabled>Em dia ✓</button>`}</div></div>
      <div class="grid c2" style="align-items:start">
        <div class="card in-up">${b.cartoes.length ? html`<div class="tblwrap"><table class="tbl"><thead><tr><th>Frente</th><th>Verso</th><th>Intervalo</th><th>Próxima</th><th></th></tr></thead><tbody>
          ${b.cartoes.map((c) => { const quando = fmtProxima(c.proxima_revisao); return html`<tr class="${quando === "hoje" ? "hoje" : ""}" data-id="${c.id}"><td><b>${c.frente}</b></td><td>${c.verso}</td>
            <td class="muted small">${c.intervalo_dias} ${plural(c.intervalo_dias, "dia", "dias")}</td><td>${quando === "hoje" ? html`<span class="pill">hoje</span>` : html`<span class="muted small">${quando}</span>`}</td>
            <td class="r"><details class="menu" style="display:inline-block"><summary aria-label="Opções do cartão">⋯</summary><div class="menu-pop"><button data-a="editar">Editar</button><button class="del" data-a="excluir">Excluir</button></div></details></td></tr>`; })}
          </tbody></table></div>` : vazio({ titulo: "Nenhum cartão ainda", texto: "Use o formulário ao lado para criar o primeiro." })}</div>
        <form class="card col g16 in-up" style="--i:1" data-novo novalidate><div class="eyebrow" style="margin:0">Novo cartão</div>
          <div class="field"><label for="c-frente">Frente (pergunta)</label><textarea id="c-frente" name="frente" maxlength="500" placeholder="Ex.: Qual é a fórmula do delta?"></textarea></div>
          <div class="field"><label for="c-verso">Verso (resposta)</label><textarea id="c-verso" name="verso" maxlength="500" placeholder="Ex.: Δ = b² − 4ac"></textarea></div>
          <div class="err-text" data-erro role="alert"></div><button class="btn primary" type="submit">Adicionar cartão</button>
          <p class="tiny muted">O cartão novo já entra na revisão de hoje.</p></form>
      </div>`);
    animar(el);
  }

  el.addEventListener("submit", async (e) => {
    if (!e.target.matches("[data-novo]")) return;
    e.preventDefault();
    const f = e.target, erro = f.querySelector("[data-erro]");
    try {
      b.cartoes.push(await api.post(`/baralhos/${id}/cartoes`, { frente: f.frente.value, verso: f.verso.value }));
      desenhar(); el.querySelector("#c-frente").focus();
    } catch (err) { erro.textContent = err.message; }
  });
  el.addEventListener("click", async (e) => {
    const a = e.target.closest("[data-a]");
    if (!a) return;
    const linha = a.closest("tr[data-id]"), c = linha && b.cartoes.find((x) => x.id === Number(linha.dataset.id));
    try {
      if (a.dataset.a === "editar-baralho") {
        const novo = await formulario({ titulo: "Editar baralho", campos: [{ nome: "nome", label: "Nome", valor: b.nome }, { nome: "materia_id", label: "Matéria", tipo: "select", opcoes: opcoesMat(materias), valor: b.materia_id }],
          onSubmit: (d) => api.put(`/baralhos/${id}`, { nome: d.nome, materia_id: Number(d.materia_id) }) });
        if (novo) { Object.assign(b, novo); desenhar(); }
      } else if (a.dataset.a === "excluir-baralho") {
        if (await confirmar({ titulo: "Excluir o baralho?", texto: `Os ${b.cartoes.length} cartões de “${b.nome}” também serão apagados. Essa ação não pode ser desfeita.`, ok: "Excluir", perigo: true })) {
          await api.del(`/baralhos/${id}`); location.hash = "#/flashcards";
        }
      } else if (a.dataset.a === "editar") {
        const novo = await formulario({ titulo: "Editar cartão", campos: [{ nome: "frente", label: "Frente (pergunta)", tipo: "textarea", valor: c.frente }, { nome: "verso", label: "Verso (resposta)", tipo: "textarea", valor: c.verso }],
          onSubmit: (d) => api.put(`/cartoes/${c.id}`, d) });
        if (novo) { Object.assign(c, novo); desenhar(); }
      } else if (a.dataset.a === "excluir") {
        if (await confirmar({ titulo: "Excluir o cartão?", texto: "Essa ação não pode ser desfeita.", ok: "Excluir", perigo: true })) {
          await api.del(`/cartoes/${c.id}`); b.cartoes = b.cartoes.filter((x) => x.id !== c.id); desenhar();
        }
      }
    } catch (err) { erroToast(err); }
  });
  desenhar();
}

// ------------------------------------------------------------------ revisão
export async function revisao(el, { params: [id] }) {
  el.innerHTML = String(carregando(1));
  const [b, fila] = await Promise.all([api.get(`/baralhos/${id}`), api.get(`/baralhos/${id}/revisar`)]);
  let i = 0, virado = false, acertos = 0, erros = 0, xp = 0, enviando = false;
  const conquistas = [];

  function fim() {
    el.innerHTML = String(html`<div class="card center in-up" style="max-width:560px;margin:30px auto;padding:36px 26px">
      <div class="levelcircle" style="margin:0 auto 14px;width:76px;height:76px;font-size:36px">✓</div>
      <h1>${fila.length ? "Revisão concluída!" : "Tudo em dia!"}</h1><p class="muted mt8">${b.nome}</p>
      ${fila.length ? html`<div class="grid c3 mt24"><div><div class="num" style="font-size:30px">${fila.length}</div><div class="small muted">${plural(fila.length, "cartão", "cartões")}</div></div>
        <div><div class="num" style="font-size:30px">${acertos} / ${erros}</div><div class="small muted">acertos / erros</div></div>
        <div><div class="num lime" style="font-size:30px">+${xp}</div><div class="small muted">XP</div></div></div>` : html`<p class="mt16">Nenhum cartão deste baralho vence hoje. Volte amanhã!</p>`}
      ${conquistas.map((c) => html`<div class="tile mt16" style="flex-direction:row;align-items:center;text-align:left"><div class="star on">★</div><div><b>${c.nome}</b><div class="small muted">Conquista desbloqueada · +${c.xp_bonus} XP</div></div></div>`)}
      <div class="row mt24 wrap" style="justify-content:center"><a class="btn primary" href="#/flashcards">Voltar aos baralhos</a><a class="btn" href="#/flashcards/${id}">Ver o baralho</a></div></div>`);
  }

  function desenhar() {
    if (i >= fila.length) { fim(); return; }
    const c = fila[i];
    el.innerHTML = String(html`<div class="row between mb16 wrap"><a class="btn sm" href="#/flashcards/${id}">← Sair da revisão</a><b>${b.nome}</b>
        <div class="row" style="min-width:170px"><span class="small bold" data-progresso>${i + 1} de ${fila.length}</span><div class="bar grow"><i style="width:${(i / fila.length) * 100}%"></i></div></div></div>
      <div class="fcwrap"><div class="fc ${virado ? "virado" : ""}" data-fc>
        <div class="face"><div class="lbl">Frente</div><div class="txt">${c.frente}</div></div>
        <div class="face verso"><div class="lbl">Verso</div><div class="txt">${c.verso}</div></div></div></div>
      ${virado ? html`<div class="answers"><button class="btn lg danger" data-r="0">✕ Errei<small>volta amanhã · +1 XP</small></button>
          <button class="btn lg primary" data-r="1">✓ Acertei<small>próxima em ${Math.min(c.intervalo_dias * 2, 365)} dias · +3 XP</small></button></div>`
        : html`<div class="center mt24"><button class="btn primary lg" data-a="virar">Mostrar resposta</button><p class="small muted mt8">ou aperte <span class="kbd">Espaço</span></p></div>`}`);
  }

  function virar() { if (!virado && i < fila.length) { virado = true; desenhar(); } }
  async function responder(acertou) {
    if (enviando || !virado || i >= fila.length) return;
    enviando = true;
    try {
      const r = await api.post(`/cartoes/${fila[i].id}/revisao`, { acertou });
      if (acertou) acertos++; else erros++;
      xp += r.gamificacao.pontos + r.gamificacao.xp_bonus_conquistas;
      conquistas.push(...r.gamificacao.conquistas_desbloqueadas);
      mostrarGamificacao(r.gamificacao, { silencioso: true });
      i++; virado = false; desenhar();
    } catch (err) { erroToast(err); }
    enviando = false;
  }

  el.addEventListener("click", (e) => {
    if (e.target.closest('[data-a="virar"]') || e.target.closest("[data-fc]")) virar();
    const r = e.target.closest("[data-r]");
    if (r) responder(r.dataset.r === "1");
  });
  const tecla = (e) => {
    if (/^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(e.target.tagName) && e.key === " " && e.target.dataset.a !== "virar") return;
    if (e.key === " " && !virado) { e.preventDefault(); virar(); }
    else if (virado && (e.key === "1" || e.key === "ArrowLeft")) responder(false);
    else if (virado && (e.key === "2" || e.key === "ArrowRight")) responder(true);
  };
  document.addEventListener("keydown", tecla);
  desenhar();
  return () => document.removeEventListener("keydown", tecla);
}

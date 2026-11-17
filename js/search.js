// Pesquisa do topo: atalhos do site + dados do usuário (tópicos, baralhos, cartões, matérias) vindos da API.
import { api } from "./api.js";
import { html, raw, esc, debounce } from "./util.js";
import { icone } from "./ui.js";

const ATALHOS = [
  { t: "Dashboard", d: "Visão geral dos seus estudos", h: "#/", k: "inicio painel resumo home", i: "dashboard" },
  { t: "Pomodoro", d: "Cronômetro de foco e pausas", h: "#/pomodoro", k: "timer cronometro foco tempo relogio sessao", i: "pomodoro" },
  { t: "Planner", d: "Tópicos por matéria", h: "#/planner", k: "topicos tarefas kanban planejar status", i: "planner" },
  { t: "Flashcards", d: "Baralhos e revisão espaçada", h: "#/flashcards", k: "baralhos cartoes revisao memorizar cards", i: "flashcards" },
  { t: "Conquistas e XP", d: "Nível, medalhas e extrato", h: "#/conquistas", k: "nivel medalhas xp extrato pontos", i: "conquistas" },
  { t: "Matérias", d: "Disciplinas e cores", h: "#/materias", k: "disciplinas cores materia", i: "materias" },
  { t: "Meu perfil", d: "Foto, nome, senha e conta", h: "#/perfil", k: "foto nome senha email conta configuracoes bio apelido", i: "usuario" },
  { t: "Mudar o tema", d: "Alternar entre claro e escuro", a: "tema", k: "tema claro escuro dark light modo sol lua", i: "sol" },
  { t: "Ver o guia interativo", d: "Tour com o fantasminha", a: "tour", k: "tutorial ajuda guia tour como usar fantasma", i: "ajuda" },
];
const GRUPOS = [
  ["topicos", "Tópicos", "planner", (x) => ({ t: x.titulo, d: `${x.materia} · ${{ nao_visto: "não visto", estudando: "estudando", revisado: "revisado" }[x.status]}`, h: "#/planner" })],
  ["baralhos", "Baralhos", "flashcards", (x) => ({ t: x.nome, d: x.materia, h: `#/flashcards/${x.id}` })],
  ["cartoes", "Cartões", "flashcards", (x) => ({ t: x.frente, d: `${x.verso} · ${x.baralho}`, h: `#/flashcards/${x.baralho_id}` })],
  ["materias", "Matérias", "materias", (x) => ({ t: x.nome, d: "Matéria", h: "#/materias" })],
  ["conquistas", "Conquistas", "conquistas", (x) => ({ t: x.nome, d: x.descricao, h: "#/conquistas" })],
];

const semAcento = (s) => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function destacar(texto, termo) {
  const pos = semAcento(texto).indexOf(semAcento(termo));
  if (pos < 0 || !termo) return esc(texto);
  return esc(texto.slice(0, pos)) + "<mark>" + esc(texto.slice(pos, pos + termo.length)) + "</mark>" + esc(texto.slice(pos + termo.length));
}

export function montarBusca(el, { aoPedir }) {
  el.innerHTML = String(html`<div class="search-campo">${icone.busca}
    <input type="text" inputmode="search" enterkeyhint="search" id="busca" placeholder="Pesquisar tópicos, baralhos, cartões, páginas..." autocomplete="off" spellcheck="false"
           aria-label="Pesquisar no StudyHub" role="combobox" aria-expanded="false" aria-controls="busca-res">
    <button class="limpar" type="button" aria-label="Limpar pesquisa" hidden>${icone.x}</button></div>`);
  const campo = el.querySelector("input"), limpar = el.querySelector(".limpar");
  let pop = null, seq = 0, sel = -1;

  function fechar() {
    if (pop) { pop.remove(); pop = null; }
    campo.setAttribute("aria-expanded", "false");
    sel = -1;
  }
  const itens = () => (pop ? [...pop.querySelectorAll(".sres")] : []);
  function marcar(n) {
    const lista = itens();
    if (!lista.length) return;
    sel = (n + lista.length) % lista.length;
    lista.forEach((x, k) => x.classList.toggle("sel", k === sel));
    lista[sel].scrollIntoView({ block: "nearest" });
  }

  function mostrar(termo, grupos, buscando) {
    if (!pop) {
      pop = document.createElement("div");
      pop.className = "search-pop"; pop.id = "busca-res"; pop.setAttribute("role", "listbox");
      el.appendChild(pop);
      pop.addEventListener("click", (e) => { const a = e.target.closest(".sres"); if (a) abrir(a); });
    }
    campo.setAttribute("aria-expanded", "true");
    const total = grupos.reduce((n, g) => n + g.itens.length, 0);
    const linha = (x, ic) => `<a class="sres" role="option" ${x.h ? `href="${esc(x.h)}"` : `href="#" data-acao="${esc(x.a)}"`}>${icone[ic]}
      <span class="grow"><b>${destacar(x.t, termo)}</b> <span class="muted small">· ${destacar(x.d, termo)}</span></span></a>`;
    pop.innerHTML = total
      ? grupos.filter((g) => g.itens.length).map((g) => `<h5>${esc(g.nome)}</h5>` + g.itens.map((x) => linha(x, x.i || g.icone)).join("")).join("")
        + (buscando ? `<p class="tiny muted" style="padding:8px 10px">Procurando nos seus dados...</p>` : "")
      : buscando ? `<p class="small muted" style="padding:14px">Procurando...</p>`
      : `<div style="padding:18px 14px" data-vazio><b>Nenhum resultado para “${esc(termo)}”</b><p class="small muted">Tente outra palavra, como o nome de uma matéria, de um tópico ou de um baralho.</p></div>`;
    sel = -1;
  }

  function abrir(a) {
    const acao = a.dataset.acao;
    campo.value = ""; limpar.hidden = true; fechar(); campo.blur();
    if (acao) { aoPedir(acao); return false; }
    return true;
  }

  const pesquisar = debounce(async (termo) => {
    const minha = ++seq;
    const n = semAcento(termo);
    const locais = ATALHOS.filter((a) => semAcento(a.t + " " + a.d + " " + a.k).includes(n));
    const grupos = [{ nome: "Atalhos", itens: locais }];
    if (termo.length < 2) { mostrar(termo, grupos, false); return; }
    mostrar(termo, grupos, true);
    try {
      const r = await api.get("/busca?q=" + encodeURIComponent(termo));
      if (minha !== seq) return;                           // chegou uma resposta antiga: ignora
      GRUPOS.forEach(([chave, nome, ic, mapa]) => grupos.push({ nome, icone: ic, itens: (r[chave] || []).map(mapa) }));
      mostrar(termo, grupos, false);
    } catch (e) {
      if (minha !== seq) return;
      mostrar(termo, grupos, false);
      if (pop && !locais.length) pop.innerHTML = `<p class="small" style="padding:14px;color:var(--danger-text)">${esc(e.message)}</p>`;
    }
  }, 220);

  campo.addEventListener("input", () => {
    const termo = campo.value.trim();
    limpar.hidden = !campo.value;
    if (!termo) { seq++; fechar(); return; }
    pesquisar(termo);
  });
  campo.addEventListener("focus", () => { if (campo.value.trim()) pesquisar(campo.value.trim()); });
  campo.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); marcar(sel + 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); marcar(sel - 1); }
    else if (e.key === "Enter") {
      const lista = itens(), alvo = lista[sel < 0 ? 0 : sel];
      if (alvo) { e.preventDefault(); const href = alvo.getAttribute("href"); if (abrir(alvo)) location.hash = href; }
    } else if (e.key === "Escape") { campo.value = ""; limpar.hidden = true; seq++; fechar(); campo.blur(); }
  });
  limpar.addEventListener("click", () => { campo.value = ""; limpar.hidden = true; seq++; fechar(); campo.focus(); });
  const fora = (e) => { if (!el.contains(e.target)) fechar(); };
  const atalho = (e) => {
    const digitando = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
    if ((e.key === "/" && !digitando) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k")) { e.preventDefault(); campo.focus(); }
  };
  document.addEventListener("mousedown", fora);
  document.addEventListener("keydown", atalho);
  return { focar: () => campo.focus(), destruir() { document.removeEventListener("mousedown", fora); document.removeEventListener("keydown", atalho); } };
}

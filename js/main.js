// Ponto de entrada: rotas (por #, compatíveis com o GitHub Pages), estrutura do site e sessão.
import { api, token, apiConfigurada, pedirSessaoDeOutraAba } from "./api.js";
import { state, carregarUsuario, definirUsuario, assinarUsuario } from "./state.js";
import { html, primeiroNome } from "./util.js";
import { icone, avatar, toast, blocoErro } from "./ui.js";
import { aplicarTema, alternarTema, temaAtual, assinarTema } from "./theme.js";
import * as T from "./timer.js";
import { montarFantasma, desmontarFantasma, ghostSvg } from "./ghost.js";
import { iniciarTour, encerrarTour, tourAtivo } from "./tour.js";
import { montarBusca } from "./search.js";
import { paginaAuth } from "./pages/auth.js";
import { dashboard } from "./pages/dashboard.js";
import { pomodoro } from "./pages/pomodoro.js";
import { planner } from "./pages/planner.js";
import { listaBaralhos, baralho, revisao } from "./pages/flashcards.js";
import { conquistas } from "./pages/conquistas.js";
import { materias } from "./pages/materias.js";
import { perfil } from "./pages/perfil.js";

const app = document.getElementById("app");
const PUBLICAS = ["/entrar", "/cadastro", "/recuperar", "/redefinir"];
const ROTAS = [
  [/^\/$/, dashboard, "dashboard"],
  [/^\/pomodoro$/, pomodoro, "pomodoro"],
  [/^\/planner$/, planner, "planner"],
  [/^\/flashcards$/, listaBaralhos, "flashcards"],
  [/^\/flashcards\/(\d+)$/, baralho, "flashcards"],
  [/^\/flashcards\/(\d+)\/revisar$/, revisao, "flashcards"],
  [/^\/conquistas$/, conquistas, "conquistas"],
  [/^\/materias$/, materias, "materias"],
  [/^\/perfil$/, perfil, ""],
];
// [id, endereço, nome, nome curto (menu de baixo do celular)]
const MENU = [["dashboard", "#/", "Dashboard", "Início"], ["pomodoro", "#/pomodoro", "Pomodoro", "Foco"], ["planner", "#/planner", "Planner", "Planner"],
  ["flashcards", "#/flashcards", "Flashcards", "Cartões"], ["conquistas", "#/conquistas", "Conquistas", "XP"], ["materias", "#/materias", "Matérias", "Matérias"]];

let vez = 0, limpar = null, shell = null, tourPendente = false;

export function rotaAtual() {
  const h = location.hash.replace(/^#/, "") || "/";
  const [caminho, qs] = h.split("?");
  return { caminho: caminho || "/", query: new URLSearchParams(qs || "") };
}
const ir = (hash) => { if (location.hash === hash) navegar(); else location.hash = hash; };

// ------------------------------------------------------------------ sessão
function aposEntrar() {
  aplicarTema(state.usuario.tema);          // o tema da conta vale em qualquer aparelho
  T.restaurar();
}

function aoEntrar({ token: novo, usuario }, lembrar) {
  token.gravar(novo, lembrar);
  definirUsuario(usuario);
  aposEntrar();
  ir("#/");
}

async function sair() {
  encerrarTour();
  try { await api.post("/auth/logout"); } catch (e) { /* mesmo sem resposta, sai deste navegador */ }
  token.limpar();
  T.esquecer();
  definirUsuario(null);
  ir("#/entrar");
}

window.addEventListener("studyhub:sessao-expirada", () => {
  if (!state.usuario && PUBLICAS.includes(rotaAtual().caminho)) return;
  encerrarTour();
  T.esquecer();
  definirUsuario(null);
  toast({ tipo: "erro", titulo: "Sua sessão terminou", texto: "Entre de novo para continuar." });
  ir("#/entrar");
});

// ------------------------------------------------------------------ guia e pedidos do mascote/busca
function comecarTour() {
  if (tourAtivo()) return;
  if (rotaAtual().caminho !== "/") { tourPendente = true; ir("#/"); return; }
  iniciarTour({
    aoTerminar: async () => {
      if (!state.usuario || state.usuario.tutorial_visto) return;
      state.usuario.tutorial_visto = true;
      try { await api.put("/perfil", { tutorial_visto: true }); } catch (e) { /* tenta de novo no próximo login */ }
    },
  });
}
function pedir(acao) {
  if (acao === "tour") comecarTour();
  else if (acao === "tema") alternarTema();
  else if (acao === "busca" && shell) shell.busca.focar();
}

// ------------------------------------------------------------------ estrutura (menu + topo)
function desmontarShell() {
  if (!shell) return;
  shell.desligar.forEach((fn) => fn());
  desmontarFantasma();
  shell = null;
}

function montarShell() {
  if (shell) return;
  app.innerHTML = String(html`<div class="shell">
    <aside class="side">
      <a class="logo" href="#/" aria-label="StudyHub, início"><i>${icone.check}</i>StudyHub</a>
      <nav class="nav" aria-label="Principal" data-tour="nav">${MENU.map(([id, href, nome, curto]) => html`<a href="${href}" data-nav="${id}" data-tour="nav-${id}" aria-label="${nome}">${icone[id]}<span class="nome">${nome}</span><span class="curto" aria-hidden="true">${curto}</span></a>`)}</nav>
      <a class="minitimer" href="#/pomodoro" hidden><span>Foco em andamento</span><b data-mini></b></a>
      <a class="xpchip" href="#/conquistas" data-xp></a>
    </aside>
    <div class="content">
      <header class="topbar">
        <div class="search" data-tour="busca"></div>
        <div class="acts" data-tour="perfil-area">
          <button class="iconbtn" data-a="tour" aria-label="Abrir o guia interativo" title="Guia interativo">${icone.ajuda}</button>
          <button class="iconbtn" data-a="tema" aria-label="Alternar tema claro e escuro" title="Alternar tema"></button>
          <div class="usermenu"><button class="userbtn" data-a="menu" aria-haspopup="menu" aria-expanded="false"></button></div>
        </div>
      </header>
      <main id="view" class="main"></main>
    </div></div>`);
  const $ = (s) => app.querySelector(s);
  const desligar = [];
  let pop = null;

  function pintarUsuario(u) {
    if (!u) return;
    $(".userbtn").innerHTML = String(html`${avatar(u, "sm")}<span>${primeiroNome(u.nome)}</span>`);
    $("[data-xp]").innerHTML = String(html`<div class="row between"><b>Nível ${u.nivel}</b><span class="tiny muted">${u.xp_total} XP</span></div>
      <div class="bar thin mt8"><i style="width:${u.xp_no_nivel}%"></i></div>
      <div class="tiny muted mt8">Faltam ${u.xp_para_proximo_nivel} XP para o nível ${u.nivel + 1}</div>`);
  }
  const pintarTema = () => {
    const claro = temaAtual() === "claro";
    const b = $('[data-a="tema"]');
    b.innerHTML = String(claro ? icone.lua : icone.sol);
    b.setAttribute("aria-pressed", String(claro));
    b.title = claro ? "Mudar para o tema escuro" : "Mudar para o tema claro";
  };
  const pintarTimer = () => {
    const mini = $(".minitimer");
    mini.hidden = T.timer.status === "parado";
    if (!mini.hidden) {
      mini.querySelector("span").textContent = T.timer.status === "pausado" ? "Pausado" : T.MODOS[T.timer.modo].rotulo + " em andamento";
      mini.querySelector("[data-mini]").textContent = T.formatar(T.restante());
    }
  };
  function fecharMenu() {
    if (pop) { pop.remove(); pop = null; $(".userbtn").setAttribute("aria-expanded", "false"); }
  }
  function abrirMenu() {
    if (pop) { fecharMenu(); return; }
    const u = state.usuario;
    pop = document.createElement("div");
    pop.className = "menu-pop"; pop.setAttribute("role", "menu");
    pop.innerHTML = String(html`<div class="who"><b>${u.nome}</b><div class="tiny muted">${u.email}</div></div>
      <a href="#/perfil" role="menuitem">${icone.usuario}Meu perfil</a>
      <a href="#/perfil?secao=config" role="menuitem">${icone.config}Configurações</a>
      <button data-a="tour" role="menuitem">${icone.ajuda}Guia interativo</button>
      <button class="del" data-a="sair" role="menuitem">${icone.sair}Sair</button>`);
    $(".usermenu").appendChild(pop);
    $(".userbtn").setAttribute("aria-expanded", "true");
  }

  const clique = (e) => {
    const a = e.target.closest("[data-a]");
    if (pop && !e.target.closest(".usermenu")) fecharMenu();
    if (!a || !app.contains(a)) return;
    const acao = a.dataset.a;
    if (acao === "menu") abrirMenu();
    else if (acao === "tema") alternarTema();
    else if (acao === "tour") { fecharMenu(); comecarTour(); }
    else if (acao === "sair") { fecharMenu(); sair(); }
    else if (acao === "recarregar") navegar();
    if (a.closest(".menu-pop") && a.tagName === "A") fecharMenu();
  };
  const tecla = (e) => { if (e.key === "Escape") fecharMenu(); };
  document.addEventListener("click", clique);
  document.addEventListener("keydown", tecla);
  desligar.push(() => document.removeEventListener("click", clique), () => document.removeEventListener("keydown", tecla));
  desligar.push(assinarUsuario(pintarUsuario), assinarTema(pintarTema), T.assinar(pintarTimer));
  const busca = montarBusca($(".search"), { aoPedir: pedir });
  desligar.push(busca.destruir);
  montarFantasma({ aoPedir: pedir, rotaAtual: () => rotaAtual().caminho });
  pintarUsuario(state.usuario); pintarTema(); pintarTimer();
  shell = { desligar, busca, fecharMenu };
}

function telaCheia(conteudo) {
  desmontarShell();
  app.innerHTML = `<div class="fullmsg"><div class="card in-up" style="max-width:520px">${conteudo}</div></div>`;
}

// ------------------------------------------------------------------ navegação
async function navegar() {
  const minha = ++vez;
  const { caminho, query } = rotaAtual();
  if (limpar) { try { limpar(); } catch (e) { /* a página já saiu */ } limpar = null; }
  encerrarTour();

  if (PUBLICAS.includes(caminho)) {
    if (token.ler() && !state.usuario) { try { await carregarUsuario(); aposEntrar(); } catch (e) { /* token inválido: fica na tela pública */ } }
    if (minha !== vez) return;
    if (state.usuario && caminho !== "/redefinir") { ir("#/"); return; }
    desmontarShell();
    limpar = paginaAuth(app, { modo: caminho.slice(1), query, aoEntrar }) || null;
    return;
  }

  if (!token.ler()) {                                      // rota protegida sem login (o servidor também recusa)
    const deOutraAba = apiConfigurada ? await pedirSessaoDeOutraAba() : null;
    if (minha !== vez) return;
    if (!deOutraAba) { ir("#/entrar"); return; }
  }
  if (!state.usuario) {
    telaCheia(`<div class="skel" style="height:14px;width:60%;margin:0 auto 12px"></div><p class="muted">Carregando a sua conta...</p>`);
    try { await carregarUsuario(); } catch (e) {
      if (minha !== vez || e.status === 401) return;       // 401: o aviso de sessão expirada já redireciona
      telaCheia(String(html`<div class="ghost-mini" style="width:72px;margin:0 auto 14px">${ghostSvg("surpreso")}</div><h2>Não deu para falar com o servidor</h2><p class="muted mt8">${e.message}</p>
        ${!apiConfigurada ? html`<p class="small muted mt8">Abra o arquivo <b>config.js</b> e informe o endereço do back-end em <b>API_URL</b>.</p>` : ""}
        <div class="mt16"><button class="btn primary" id="tentar">Tentar de novo</button></div>`));
      document.getElementById("tentar").onclick = () => navegar();
      return;
    }
    if (minha !== vez) return;
    aposEntrar();
  }

  montarShell();
  shell.fecharMenu();
  const achada = ROTAS.map(([re, pagina, menu]) => ({ m: caminho.match(re), pagina, menu })).find((r) => r.m);
  app.querySelectorAll("[data-nav]").forEach((a) => {
    const on = Boolean(achada) && a.dataset.nav === achada.menu;
    a.classList.toggle("on", on);
    if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
  });
  const view = document.getElementById("view");
  view.innerHTML = '<div class="page"></div>';
  const el = view.firstElementChild;
  window.scrollTo(0, 0);
  if (!achada) {
    el.innerHTML = String(html`<div class="empty"><h3>Página não encontrada</h3><p>Esse endereço não existe no StudyHub.</p><div class="mt16"><a class="btn primary" href="#/">Voltar para a dashboard</a></div></div>`);
    return;
  }
  let limpeza = null;
  try {
    limpeza = (await achada.pagina(el, { params: achada.m.slice(1).map(Number), query })) || null;
  } catch (e) {
    if (minha === vez && e.status !== 401) el.innerHTML = String(blocoErro(e.message || "Erro inesperado."));
  }
  if (minha !== vez) { if (limpeza) limpeza(); return; }   // o usuário já foi para outra página
  limpar = limpeza;

  if (caminho === "/" && state.usuario && (tourPendente || !state.usuario.tutorial_visto)) {
    tourPendente = false;
    setTimeout(() => { if (minha === vez) comecarTour(); }, 450);
  }
}

window.addEventListener("hashchange", navegar);
navegar();

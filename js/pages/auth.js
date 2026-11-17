// Login, cadastro e recuperação de senha: apresentação da plataforma de um lado, formulário do outro.
import { api, apiConfigurada } from "../api.js";
import { html, raw, emailValido, forcaSenha } from "../util.js";
import { icone, campoSenha, toast, ocupado } from "../ui.js";
import { alternarTema, temaAtual, assinarTema } from "../theme.js";
import { ghostSvg } from "../ghost.js";

const RECURSOS = [
  ["pomodoro", "Pomodoro", "Foque em blocos de 25 minutos e registre cada sessão."],
  ["planner", "Planner", "Organize os tópicos de cada matéria por status."],
  ["flashcards", "Flashcards", "Repetição espaçada: revise na hora certa."],
  ["conquistas", "XP e conquistas", "Ganhe pontos, suba de nível e desbloqueie medalhas."],
];

const apresentacao = () => html`<section class="auth-show" aria-label="Sobre o StudyHub">
    <div class="orb a"></div><div class="orb b"></div>
    <a class="logo in-up" href="#/entrar"><i>${icone.check}</i>StudyHub</a>
    <div class="floaty" aria-hidden="true">
      <div class="floatcard two"><b>+10 XP</b>Sessão de foco concluída</div>
      <div class="ghost-mini" style="width:92px;flex-basis:92px">${ghostSvg("feliz")}</div>
      <div class="floatcard"><b>12</b>cartões para revisar hoje</div>
    </div>
    <div style="margin-top:auto"><h1 class="in-up" style="--i:1">Estude com foco.<br><span class="hl">Evolua</span> todo dia.</h1>
      <p class="lead in-up mt16" style="--i:2">O StudyHub junta cronômetro Pomodoro, planner de tópicos e flashcards em um só lugar, e transforma o seu esforço em XP.</p></div>
    <div class="feats">${RECURSOS.map(([ic, t, d], i) => html`<div class="feat in-up" style="--i:${i + 3}"><i>${icone[ic]}</i><div><b>${t}</b><span>${d}</span></div></div>`)}</div>
  </section>`;

const TITULOS = {
  entrar: ["Bem-vindo de volta", "Entre para continuar de onde parou."],
  cadastro: ["Crie a sua conta", "É rápido: em um minuto você já está estudando."],
  recuperar: ["Esqueceu a senha?", "Informe o seu e-mail e enviaremos as instruções."],
  redefinir: ["Nova senha", "Escolha uma senha nova para a sua conta."],
};

function formulario(modo) {
  const email = html`<div class="field"><label for="f-email">E-mail</label><input id="f-email" name="email" type="email" inputmode="email" autocomplete="email" placeholder="voce@escola.com" required></div>`;
  const forca = html`<div class="forca" data-n="0" aria-hidden="true"><i></i><i></i><i></i><i></i></div><div class="tiny muted" data-forca aria-live="polite">Use 8 ou mais caracteres, com letras e números.</div>`;
  if (modo === "entrar") return html`${email}${campoSenha("senha", "Senha", 'autocomplete="current-password" placeholder="Sua senha" required')}
    <div class="row between wrap"><label class="check"><input type="checkbox" name="lembrar"> Lembrar de mim</label><a class="linkbtn small" href="#/recuperar">Esqueci minha senha</a></div>
    <div class="err-text" data-erro role="alert"></div>
    <button class="btn primary lg block" type="submit">Entrar</button>
    <p class="small muted center">Ainda não tem conta? <a class="linkbtn" href="#/cadastro">Cadastre-se</a></p>`;
  if (modo === "cadastro") return html`<div class="field"><label for="f-nome">Nome completo</label><input id="f-nome" name="nome" autocomplete="name" placeholder="Nome e sobrenome" required></div>
    ${email}${campoSenha("senha", "Senha", 'autocomplete="new-password" placeholder="Crie uma senha" required')}${forca}
    ${campoSenha("confirmar_senha", "Confirmar senha", 'autocomplete="new-password" placeholder="Repita a senha" required')}
    <div class="err-text" data-erro role="alert"></div>
    <button class="btn primary lg block" type="submit">Criar conta</button>
    <p class="small muted center">Já tem conta? <a class="linkbtn" href="#/entrar">Entrar</a></p>`;
  if (modo === "recuperar") return html`${email}<div class="err-text" data-erro role="alert"></div>
    <button class="btn primary lg block" type="submit">Enviar instruções</button>
    <p class="small muted center"><a class="linkbtn" href="#/entrar">← Voltar para o login</a></p>`;
  return html`${campoSenha("senha", "Nova senha", 'autocomplete="new-password" placeholder="Crie uma senha" required')}${forca}
    ${campoSenha("confirmar_senha", "Confirmar nova senha", 'autocomplete="new-password" placeholder="Repita a senha" required')}
    <div class="err-text" data-erro role="alert"></div>
    <button class="btn primary lg block" type="submit">Salvar nova senha</button>
    <p class="small muted center"><a class="linkbtn" href="#/entrar">← Voltar para o login</a></p>`;
}

export function paginaAuth(app, { modo, query, aoEntrar }) {
  if (!TITULOS[modo]) modo = "entrar";
  let estrutura = app.querySelector(".auth");
  const troca = Boolean(estrutura);
  if (!estrutura) {
    app.innerHTML = String(html`<div class="auth">${apresentacao()}
      <section class="auth-form"><button class="iconbtn temabtn" type="button" data-tema aria-label="Alternar tema claro e escuro"></button><div class="authbox"></div></section></div>`);
    estrutura = app.querySelector(".auth");
  }
  const caixa = estrutura.querySelector(".authbox"), btTema = estrutura.querySelector("[data-tema]");
  const pintarTema = () => { btTema.innerHTML = String(temaAtual() === "claro" ? icone.lua : icone.sol); btTema.title = temaAtual() === "claro" ? "Mudar para o tema escuro" : "Mudar para o tema claro"; };
  pintarTema();
  btTema.onclick = () => alternarTema();
  const desligarTema = assinarTema(pintarTema);

  const [titulo, sub] = TITULOS[modo];
  const abas = modo === "entrar" || modo === "cadastro";
  caixa.classList.remove("troca"); void caixa.offsetWidth;
  if (troca) caixa.classList.add("troca"); else caixa.classList.add("in-up");
  caixa.innerHTML = String(html`${abas ? html`<div class="tabs ${modo === "cadastro" ? "dir" : ""}" role="tablist">
      <a href="#/entrar" role="tab" aria-selected="${modo === "entrar"}" class="${modo === "entrar" ? "on" : ""}">Entrar</a>
      <a href="#/cadastro" role="tab" aria-selected="${modo === "cadastro"}" class="${modo === "cadastro" ? "on" : ""}">Criar conta</a></div>` : ""}
    <h2>${titulo}</h2><p class="muted mt8">${sub}</p>
    ${!apiConfigurada ? html`<div class="alert info mt16"><span><b>Falta ligar o back-end.</b> Informe o endereço da API em <b>config.js</b> (campo API_URL) para o login funcionar.</span></div>` : ""}
    <form novalidate data-modo="${modo}">${formulario(modo)}</form><div data-extra></div>`);

  const form = caixa.querySelector("form"), erro = form.querySelector("[data-erro]"), botao = form.querySelector("[type=submit]");
  const v = (nome) => (form.elements[nome] ? form.elements[nome].value : "");
  const marcar = (nome, ok) => { const c = form.elements[nome]; if (c) { c.classList.toggle("invalido", !ok); c.classList.toggle("valido", ok && Boolean(c.value)); } };

  // microinterações: força da senha e validação enquanto digita
  form.addEventListener("input", (e) => {
    erro.textContent = "";
    if (e.target.name === "senha" && form.querySelector(".forca")) {
      const f = forcaSenha(e.target.value);
      form.querySelector(".forca").dataset.n = f.nivel;
      form.querySelector("[data-forca]").textContent = f.rotulo ? `${f.rotulo}. ${f.dica}` : f.dica;
    }
    if ((e.target.name === "senha" || e.target.name === "confirmar_senha") && form.elements.confirmar_senha && v("confirmar_senha"))
      marcar("confirmar_senha", v("senha") === v("confirmar_senha"));
    if (e.target.name === "email" && e.target.classList.contains("invalido")) marcar("email", emailValido(v("email")));
  });
  form.addEventListener("focusout", (e) => { if (e.target.name === "email" && v("email")) marcar("email", emailValido(v("email"))); });

  function validar() {
    if (form.elements.nome && v("nome").trim().split(/\s+/).filter(Boolean).length < 2) { marcar("nome", false); return "Informe o seu nome completo (nome e sobrenome)."; }
    if (form.elements.email && !emailValido(v("email"))) { marcar("email", false); return "Informe um e-mail válido, como nome@escola.com."; }
    if (modo === "entrar" && !v("senha")) return "Digite a sua senha.";
    if (modo === "cadastro" || modo === "redefinir") {
      if (!forcaSenha(v("senha")).valida) { marcar("senha", false); return "A senha deve ter pelo menos 8 caracteres, com letras e números."; }
      if (v("senha") !== v("confirmar_senha")) { marcar("confirmar_senha", false); return "As senhas não coincidem."; }
    }
    return "";
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const problema = validar();
    if (problema) { erro.textContent = problema; return; }
    ocupado(botao, true);
    try {
      if (modo === "entrar") {
        const lembrar = form.elements.lembrar.checked;
        aoEntrar(await api.post("/auth/login", { email: v("email"), senha: v("senha"), lembrar }), lembrar);
      } else if (modo === "cadastro") {
        const dados = await api.post("/auth/cadastro", { nome: v("nome"), email: v("email"), senha: v("senha"), confirmar_senha: v("confirmar_senha"), tema: temaAtual() });
        toast({ tipo: "ok", titulo: "Conta criada!", texto: "Boas-vindas ao StudyHub." });
        aoEntrar(dados, false);
      } else if (modo === "recuperar") {
        const r = await api.post("/auth/esqueci-senha", { email: v("email") });
        form.hidden = true;
        caixa.querySelector("[data-extra]").innerHTML = String(html`<div class="alert info mt16" role="status"><span>${r.mensagem}</span></div>
          ${r.link_dev ? html`<p class="small muted mt16">Modo demonstração (sem servidor de e-mail): <a class="linkbtn" href="${r.link_dev}" data-link-dev>abrir o link de redefinição</a>.</p>` : ""}
          <p class="small muted mt16"><a class="linkbtn" href="#/entrar">← Voltar para o login</a></p>`);
      } else {
        await api.post("/auth/redefinir-senha", { token: query.get("token") || "", senha: v("senha"), confirmar_senha: v("confirmar_senha") });
        toast({ tipo: "ok", titulo: "Senha alterada", texto: "Entre com a sua nova senha." });
        location.hash = "#/entrar";
      }
    } catch (err) {
      erro.textContent = err.message;
      ocupado(botao, false);
    }
  });

  const primeiro = form.querySelector("input");
  if (primeiro && window.innerWidth > 900) primeiro.focus({ preventScroll: true });
  return () => { desligarTema(); };
}

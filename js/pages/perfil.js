import { api, token } from "../api.js";
import { state, definirUsuario } from "../state.js";
import { html, raw, fmtDataCurta } from "../util.js";
import { icone, avatar, animar, toast, erroToast, formulario, ocupado } from "../ui.js";
import { temaAtual, assinarTema } from "../theme.js";
import * as T from "../timer.js";

const TIPOS = ["image/jpeg", "image/png", "image/webp"];
const MAX_ORIGINAL = 8 * 1024 * 1024;      // arquivo escolhido: até 8 MB (o site reduz antes de enviar)
const MAX_ENVIO = 300 * 1024;              // o servidor aceita até 300 KB

// Reduz a foto para 256 x 256 (recorte central) e devolve um data URL JPEG/WebP leve
function prepararFoto(arquivo) {
  return new Promise((resolve, reject) => {
    if (!TIPOS.includes(arquivo.type)) { reject(new Error("Escolha uma imagem JPG, PNG ou WebP.")); return; }
    if (arquivo.size > MAX_ORIGINAL) { reject(new Error("A imagem é grande demais (máximo de 8 MB).")); return; }
    const url = URL.createObjectURL(arquivo), img = new Image();
    img.onload = () => {
      const lado = Math.min(img.naturalWidth, img.naturalHeight), alvo = 256;
      const c = document.createElement("canvas"); c.width = c.height = alvo;
      const ctx = c.getContext("2d");
      ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, alvo, alvo);
      ctx.drawImage(img, (img.naturalWidth - lado) / 2, (img.naturalHeight - lado) / 2, lado, lado, 0, 0, alvo, alvo);
      URL.revokeObjectURL(url);
      let dados = c.toDataURL("image/jpeg", 0.86);
      if (dados.length * 0.75 > MAX_ENVIO) dados = c.toDataURL("image/jpeg", 0.6);
      resolve(dados);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Não foi possível ler essa imagem.")); };
    img.src = url;
  });
}

export async function perfil(el, { query }) {
  let previa = null;
  const desligarTema = assinarTema(() => { const b = el.querySelector("[data-tema-atual]"); if (b) b.textContent = temaAtual() === "claro" ? "Claro" : "Escuro"; });

  function desenhar() {
    const u = state.usuario;
    const mostrado = previa ? { ...u, foto: previa } : u;
    el.innerHTML = String(html`
      <div class="head"><div><h1>Meu perfil</h1><p>Seus dados, sua foto e as configurações da conta</p></div></div>
      <div class="grid c2" style="align-items:start">
        <div class="col g16">
          <section class="card in-up" aria-labelledby="t-dados">
            <div class="row g16 wrap" style="align-items:center">
              <div class="fotoedit ${previa ? "previa" : ""}">${avatar(mostrado, "lg")}
                <button class="cam" type="button" data-a="foto" aria-label="Escolher nova foto" title="Escolher nova foto">${icone.camera}</button></div>
              <div class="grow" style="min-width:180px"><h2 id="t-dados">${u.nome}</h2><div class="muted small">${u.apelido ? "@" + u.apelido + " · " : ""}${u.email}</div>
                <div class="row wrap mt8" style="gap:6px"><span class="pill">Nível ${u.nivel}</span><span class="pill dim">${u.xp_total} XP</span><span class="pill dim">desde ${fmtDataCurta(u.criado_em)}</span></div></div>
            </div>
            <input type="file" accept="image/jpeg,image/png,image/webp" data-arquivo hidden>
            ${previa ? html`<div class="alert info mt16"><span>Pré-visualização da nova foto. Salve para aplicar.</span><span class="row" style="gap:6px"><button class="btn sm" data-a="foto-cancelar">Cancelar</button><button class="btn sm primary" data-a="foto-salvar">Salvar foto</button></span></div>`
              : html`<div class="row wrap mt16" style="gap:8px"><button class="btn sm" data-a="foto">${icone.camera} ${u.foto ? "Trocar foto" : "Enviar foto"}</button>${u.foto ? html`<button class="btn sm danger" data-a="foto-remover">Remover foto</button>` : ""}<span class="tiny muted">JPG, PNG ou WebP · até 8 MB</span></div>`}
            <form class="col g16 mt24" data-form="perfil" novalidate>
              <div class="field"><label for="p-nome">Nome completo</label><input id="p-nome" name="nome" maxlength="100" value="${u.nome}" autocomplete="name"></div>
              <div class="field"><label for="p-apelido">Apelido (nome de usuário)</label><input id="p-apelido" name="apelido" maxlength="31" value="${u.apelido || ""}" placeholder="Ex.: juju.estuda"></div>
              <div class="field"><label for="p-bio">Biografia</label><textarea id="p-bio" name="bio" maxlength="300" placeholder="Conte um pouco sobre você e o que está estudando">${u.bio || ""}</textarea><span class="tiny muted" data-cont>${(u.bio || "").length}/300</span></div>
              <div class="err-text" data-erro role="alert"></div>
              <div class="row"><button class="btn primary" type="submit">Salvar alterações</button><button class="btn" type="button" data-a="cancelar">Cancelar</button></div>
            </form>
          </section>
        </div>
        <div class="col g16" id="config">
          <section class="card in-up" style="--i:1" aria-labelledby="t-conta"><div class="eyebrow" id="t-conta">Conta e segurança</div>
            <div class="xprow"><span class="grow"><b>E-mail</b><br><span class="small muted">${u.email}</span></span><button class="btn sm" data-a="email">Alterar</button></div>
            <div class="xprow"><span class="grow"><b>Senha</b><br><span class="small muted">Troque de tempos em tempos</span></span><button class="btn sm" data-a="senha">Alterar</button></div></section>
          <section class="card in-up" style="--i:2" aria-labelledby="t-pref"><div class="eyebrow" id="t-pref">Configurações</div>
            <div class="xprow"><span class="grow"><b>Tema</b><br><span class="small muted">Fica salvo na sua conta: <b data-tema-atual>${temaAtual() === "claro" ? "Claro" : "Escuro"}</b></span></span><button class="btn sm" data-a="tema">${icone.sol} Alternar</button></div>
            <div class="xprow"><span class="grow"><b>Guia interativo</b><br><span class="small muted">Rever o tour com o fantasminha</span></span><button class="btn sm" data-a="tour">Ver de novo</button></div>
            <div class="xprow"><span class="grow"><b>Sair</b><br><span class="small muted">Encerra a sessão neste aparelho</span></span><button class="btn sm" data-a="sair">${icone.sair} Sair</button></div></section>
          <section class="card in-up" style="--i:3;border-style:dashed" aria-labelledby="t-risco"><div class="eyebrow" id="t-risco">Zona de risco</div>
            <p class="small muted">Excluir a conta apaga tópicos, sessões, baralhos, XP, conquistas e a foto. Não dá para desfazer.</p>
            <button class="btn sm danger mt16" data-a="excluir">Excluir minha conta</button></section>
        </div>
      </div>`);
    animar(el);
  }

  async function salvarCampos(f) {
    const erro = f.querySelector("[data-erro]"), b = f.querySelector("[type=submit]");
    erro.textContent = "";
    ocupado(b, true);
    try {
      const { usuario } = await api.put("/perfil", { nome: f.nome.value, apelido: f.apelido.value, bio: f.bio.value });
      definirUsuario(usuario); desenhar();
      toast({ tipo: "ok", titulo: "Perfil atualizado" });
    } catch (err) { erro.textContent = err.message; ocupado(b, false); }
  }

  el.addEventListener("submit", (e) => { if (e.target.matches('[data-form="perfil"]')) { e.preventDefault(); salvarCampos(e.target); } });
  el.addEventListener("input", (e) => { if (e.target.id === "p-bio") el.querySelector("[data-cont]").textContent = `${e.target.value.length}/300`; });
  el.addEventListener("change", async (e) => {
    if (!e.target.matches("[data-arquivo]") || !e.target.files[0]) return;
    try { previa = await prepararFoto(e.target.files[0]); desenhar(); } catch (err) { toast({ tipo: "erro", titulo: "Não deu para usar esse arquivo", texto: err.message }); }
    e.target.value = "";
  });
  el.addEventListener("click", async (e) => {
    const a = e.target.closest("[data-a]");
    if (!a) return;
    const acao = a.dataset.a;
    try {
      if (acao === "foto") el.querySelector("[data-arquivo]").click();
      else if (acao === "foto-cancelar") { previa = null; desenhar(); }
      else if (acao === "foto-salvar") {
        ocupado(a, true);
        const { usuario } = await api.put("/perfil/foto", { imagem: previa });
        previa = null; definirUsuario(usuario); desenhar();
        toast({ tipo: "ok", titulo: "Foto atualizada" });
      } else if (acao === "foto-remover") {
        const { usuario } = await api.del("/perfil/foto");
        definirUsuario(usuario); desenhar(); toast({ tipo: "ok", titulo: "Foto removida" });
      } else if (acao === "cancelar") { previa = null; desenhar(); }
      else if (acao === "email") {
        const r = await formulario({ titulo: "Alterar e-mail", descricao: "Por segurança, confirme a sua senha. Os outros aparelhos serão desconectados.", enviar: "Alterar e-mail",
          campos: [{ nome: "novo_email", label: "Novo e-mail", tipo: "email" }, { nome: "senha", label: "Sua senha", tipo: "senha" }],
          onSubmit: (d) => api.post("/perfil/email", d) });
        if (r) { definirUsuario(r.usuario); desenhar(); toast({ tipo: "ok", titulo: "E-mail alterado" }); }
      } else if (acao === "senha") {
        const r = await formulario({ titulo: "Alterar senha", descricao: "Use 8 ou mais caracteres, com letras e números. Os outros aparelhos serão desconectados.", enviar: "Alterar senha",
          campos: [{ nome: "senha_atual", label: "Senha atual", tipo: "senha" }, { nome: "nova_senha", label: "Nova senha", tipo: "senha" }, { nome: "confirmar_senha", label: "Confirmar nova senha", tipo: "senha" }],
          onSubmit: (d) => api.post("/perfil/senha", d) });
        if (r) toast({ tipo: "ok", titulo: "Senha alterada" });
      } else if (acao === "excluir") {
        const r = await formulario({ titulo: "Excluir a sua conta?", descricao: "Tudo será apagado para sempre. Digite a sua senha para confirmar.", enviar: "Excluir para sempre", perigo: true,
          campos: [{ nome: "senha", label: "Sua senha", tipo: "senha" }], onSubmit: (d) => api.post("/perfil/excluir", d) });
        if (r) { token.limpar(); T.esquecer(); definirUsuario(null); toast({ tipo: "ok", titulo: "Conta excluída", texto: "Sentiremos a sua falta." }); location.hash = "#/entrar"; }
      }
    } catch (err) { erroToast(err); ocupado(a, false); }
  });
  desenhar();
  if (query.get("secao") === "config") setTimeout(() => { const c = el.querySelector("#config"); if (c) c.scrollIntoView({ behavior: "smooth", block: "start" }); }, 80);
  return () => desligarTema();
}

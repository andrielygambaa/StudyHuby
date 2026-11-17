// Todas as chamadas ao back-end (Flask) passam por aqui, usando Fetch.
// O endereço da API vem do arquivo config.js, na raiz do site.

const cfg = window.STUDYHUB_CONFIG || {};
const RAIZ = String(cfg.API_URL || "").trim().replace(/\/+$/, "");
export const API_BASE = RAIZ + "/api";
// No GitHub Pages não existe back-end no mesmo endereço: sem API_URL não há com quem falar
export const apiConfigurada = Boolean(RAIZ) || !/\.github\.io$/i.test(location.hostname);

const CHAVE = "studyhub.token";
let emMemoria = null;                     // reserva para navegadores que bloqueiam o armazenamento
const seguro = (fn, padrao) => { try { return fn(); } catch (e) { return padrao; } };
export const token = {
  ler: () => seguro(() => sessionStorage.getItem(CHAVE) || localStorage.getItem(CHAVE), null) || emMemoria,
  // "lembrar de mim" guarda no navegador; sem isso, o login vale só até fechar a aba
  gravar(valor, lembrar) {
    token.limpar();
    emMemoria = valor;
    seguro(() => (lembrar ? localStorage : sessionStorage).setItem(CHAVE, valor));
  },
  limpar() {
    emMemoria = null;
    seguro(() => { sessionStorage.removeItem(CHAVE); localStorage.removeItem(CHAVE); });
  },
};

const CONFEREM_SENHA = ["/auth/login", "/perfil/email", "/perfil/senha", "/perfil/excluir"];

// Login sem "lembrar de mim" fica só na aba (sessionStorage): fechou o navegador, acabou a sessão, o que protege
// computadores compartilhados. Para um link aberto em ABA NOVA não pedir a senha de novo, a aba nova pergunta
// às abas já abertas do site, que respondem com a sessão.
const PEDIDO = "studyhub.pedido-sessao", RESPOSTA = "studyhub.resposta-sessao";
window.addEventListener("storage", (e) => {
  if (e.key !== PEDIDO || !e.newValue) return;
  const t = seguro(() => sessionStorage.getItem(CHAVE), null);
  if (t) seguro(() => { localStorage.setItem(RESPOSTA, JSON.stringify({ id: e.newValue, t })); localStorage.removeItem(RESPOSTA); });
});
export function pedirSessaoDeOutraAba(espera = 300) {
  return new Promise((resolve) => {
    const id = Math.random().toString(36).slice(2);
    let tempo = null;
    const ouvir = (e) => {
      if (e.key !== RESPOSTA || !e.newValue) return;
      const r = seguro(() => JSON.parse(e.newValue), null);
      if (r && r.id === id && r.t) fim(r.t);
    };
    function fim(t) {
      window.removeEventListener("storage", ouvir);
      clearTimeout(tempo);
      if (t) { emMemoria = t; seguro(() => sessionStorage.setItem(CHAVE, t)); }
      resolve(t || null);
    }
    window.addEventListener("storage", ouvir);
    tempo = setTimeout(() => fim(null), espera);
    seguro(() => { localStorage.setItem(PEDIDO, id); localStorage.removeItem(PEDIDO); });
  });
}

export class ApiError extends Error {
  constructor(status, mensagem) { super(mensagem); this.status = status; }
}

async function chamar(metodo, url, corpo) {
  if (!apiConfigurada) throw new ApiError(0, "O endereço do back-end ainda não foi configurado no arquivo config.js.");
  const cabecalhos = {};
  if (corpo !== undefined) cabecalhos["Content-Type"] = "application/json";
  const t = token.ler();
  if (t) cabecalhos.Authorization = "Bearer " + t;
  let resposta;
  try {
    resposta = await fetch(API_BASE + url, { method: metodo, headers: cabecalhos, body: corpo !== undefined ? JSON.stringify(corpo) : undefined });
  } catch (e) {
    throw new ApiError(0, "Não foi possível falar com o servidor. Confira a sua internet ou se o back-end está ligado.");
  }
  if (resposta.status === 204) return null;
  let dados = null;
  try { dados = await resposta.json(); } catch (e) { /* resposta sem JSON */ }
  if (!resposta.ok) {
    // 401 com token = a sessão acabou no servidor: sai e volta para o login.
    // (nas rotas abaixo, 401 quer dizer só "senha atual incorreta")
    if (resposta.status === 401 && t && !CONFEREM_SENHA.includes(url)) {
      token.limpar();
      window.dispatchEvent(new CustomEvent("studyhub:sessao-expirada"));
    }
    throw new ApiError(resposta.status, (dados && dados.erro) || `Erro inesperado (${resposta.status}).`);
  }
  return dados;
}

export const api = {
  get: (url) => chamar("GET", url),
  post: (url, corpo = {}) => chamar("POST", url, corpo),
  put: (url, corpo) => chamar("PUT", url, corpo),
  patch: (url, corpo) => chamar("PATCH", url, corpo),
  del: (url) => chamar("DELETE", url),
};

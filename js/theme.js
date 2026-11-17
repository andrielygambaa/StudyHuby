// Tema claro/escuro. Visitante: fica no navegador. Usuário logado: fica na conta (vale em qualquer aparelho).
import { api } from "./api.js";
import { state } from "./state.js";

const CHAVE = "studyhub.tema";
const ouvintes = new Set();
export const assinarTema = (fn) => { ouvintes.add(fn); return () => ouvintes.delete(fn); };

export const temaAtual = () => (document.documentElement.dataset.theme === "claro" ? "claro" : "escuro");

export function aplicarTema(tema, { animar = false } = {}) {
  tema = tema === "claro" ? "claro" : "escuro";
  const raiz = document.documentElement;
  if (animar) {
    raiz.classList.add("tema-anim");
    setTimeout(() => raiz.classList.remove("tema-anim"), 450);
  }
  raiz.dataset.theme = tema;
  try { localStorage.setItem(CHAVE, tema); } catch (e) { /* sem armazenamento */ }
  ouvintes.forEach((fn) => fn(tema));
}

export async function alternarTema() {
  const novo = temaAtual() === "claro" ? "escuro" : "claro";
  aplicarTema(novo, { animar: true });
  if (state.usuario) {
    state.usuario.tema = novo;
    try { await api.put("/perfil", { tema: novo }); } catch (e) { /* o tema continua valendo neste navegador */ }
  }
  return novo;
}

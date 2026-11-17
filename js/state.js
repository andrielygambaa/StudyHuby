// Estado do site: usuário logado e matérias dele.
import { api } from "./api.js";

export const state = { usuario: null, materias: [] };
const ouvintes = new Set();

export const assinarUsuario = (fn) => { ouvintes.add(fn); return () => ouvintes.delete(fn); };
const avisar = () => ouvintes.forEach((fn) => fn(state.usuario));

export const uid = () => (state.usuario ? state.usuario.id : null);

export function definirUsuario(usuario) {
  state.usuario = usuario;
  if (!usuario) state.materias = [];
  avisar();
}

export async function carregarUsuario() {
  const { usuario } = await api.get("/auth/eu");
  definirUsuario(usuario);
  return usuario;
}

// Depois de ganhar XP a resposta traz o total e o nível; atualiza o menu sem nova chamada
export function aplicarGamificacao(g) {
  if (!state.usuario || !g) return;
  Object.assign(state.usuario, { xp_total: g.xp_total, nivel: g.nivel, xp_no_nivel: g.xp_total % 100, xp_para_proximo_nivel: 100 - (g.xp_total % 100) });
  avisar();
}

export async function carregarMaterias(forcar = false) {
  if (forcar || !state.materias.length) state.materias = await api.get("/materias");
  return state.materias;
}
export const materiaPorId = (id) => state.materias.find((m) => m.id === id);

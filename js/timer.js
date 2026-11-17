// Cronômetro Pomodoro. Fica fora da página para continuar rodando se você navegar para outra tela.
import { api } from "./api.js";
import { uid } from "./state.js";
import { toast, erroToast, mostrarGamificacao } from "./ui.js";

const CHAVE = "studyhub.timer";
export const MODOS = { foco: { rotulo: "Foco", min: 25 }, pausa: { rotulo: "Pausa", min: 5 }, longa: { rotulo: "Pausa longa", min: 15 } };

const PADRAO = { modo: "foco", minutos: 25, materiaId: null, topicoId: null, status: "parado", fimEm: 0, restanteMs: 25 * 60000, dono: null };
export const timer = { ...PADRAO };
const ouvintes = new Set();
let tique = null;

export const assinar = (fn) => { ouvintes.add(fn); return () => ouvintes.delete(fn); };
const emitir = (evento = "tique") => ouvintes.forEach((fn) => fn(evento));
const salvar = () => { try { localStorage.setItem(CHAVE, JSON.stringify(timer)); } catch (e) { /* sem armazenamento */ } };

export const totalMs = () => timer.minutos * 60000;
export const restante = () => (timer.status === "rodando" ? Math.max(0, timer.fimEm - Date.now()) : timer.restanteMs);
export const formatar = (ms) => {
  const s = Math.ceil(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

function titulo() { document.title = timer.status === "rodando" ? `${formatar(restante())} · StudyHub` : "StudyHub"; }
function pararTique() { if (tique) clearInterval(tique); tique = null; }
function ligarTique() {
  pararTique();
  tique = setInterval(() => {
    if (restante() <= 0) { concluir(); return; }
    titulo(); emitir();
  }, 250);
}

export function configurar({ modo, minutos, materiaId, topicoId }) {
  if (timer.status !== "parado") return;
  if (modo) { timer.modo = modo; if (!minutos) minutos = MODOS[modo].min; }
  if (minutos) timer.minutos = Math.min(240, Math.max(1, Math.round(minutos)));
  if (materiaId !== undefined) timer.materiaId = materiaId;
  if (topicoId !== undefined) timer.topicoId = topicoId;
  timer.restanteMs = totalMs();
  salvar(); emitir("config");
}

// Iniciar e também retomar depois de uma pausa
export function iniciar() {
  if (timer.status === "rodando") return;
  if (timer.modo === "foco" && !timer.materiaId) { toast({ tipo: "erro", titulo: "Escolha uma matéria", texto: "Assim a sessão fica registrada no lugar certo." }); return; }
  timer.status = "rodando";
  timer.dono = uid();
  timer.fimEm = Date.now() + timer.restanteMs;
  salvar(); ligarTique(); titulo(); emitir("estado");
}

export function pausar() {
  if (timer.status !== "rodando") return;
  timer.restanteMs = restante();
  timer.status = "pausado";
  pararTique(); salvar(); titulo(); emitir("estado");
}

// Volta o relógio para o tempo cheio, sem registrar nada
export function reiniciar() {
  pararTique();
  timer.status = "parado";
  timer.restanteMs = totalMs();
  salvar(); titulo(); emitir("estado");
}

function apito() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.25].forEach((t) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = 880; g.gain.value = 0.08; o.connect(g); g.connect(ctx.destination);
      o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 0.18);
    });
  } catch (e) { /* o navegador pode bloquear o som */ }
}

const registrar = (duracao, concluida) => api.post(`/usuarios/${uid()}/sessoes`, {
  materia_id: timer.materiaId, topico_id: timer.topicoId || null, duracao_min: duracao, concluida,
});

export async function concluir() {
  const eraFoco = timer.modo === "foco", minutos = timer.minutos;
  reiniciar(); apito();
  if (!eraFoco) { toast({ tipo: "ok", titulo: "Pausa terminada", texto: "Bora voltar ao foco!" }); emitir("concluido"); return; }
  try {
    const { gamificacao } = await registrar(minutos, true);
    mostrarGamificacao(gamificacao);
  } catch (e) { erroToast(e); }
  emitir("concluido");
}

// Encerra antes do fim: a sessão fica registrada como interrompida (sem XP)
export async function encerrar() {
  if (timer.status === "parado") return;
  const gastoMs = totalMs() - restante(), eraFoco = timer.modo === "foco";
  reiniciar();
  if (!eraFoco) return;
  if (gastoMs < 60000) { toast({ titulo: "Sessão muito curta", texto: "Menos de 1 minuto não é registrado." }); return; }
  try {
    await registrar(Math.max(1, Math.round(gastoMs / 60000)), false);
    toast({ titulo: "Sessão interrompida registrada", texto: "Sem XP, porque não foi concluída." });
  } catch (e) { erroToast(e); }
  emitir("concluido");
}

// Ao abrir o site (já com o usuário carregado), retoma um cronômetro que estava em andamento
export function restaurar() {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE) || "null");
    if (salvo && salvo.dono === uid()) Object.assign(timer, salvo);
    else Object.assign(timer, PADRAO);
  } catch (e) { Object.assign(timer, PADRAO); }
  if (timer.status === "rodando") { if (restante() <= 0) concluir(); else ligarTique(); }
  titulo(); emitir("estado");
}

// Ao sair da conta: para tudo e esquece a matéria escolhida (os dados são de cada usuário)
export function esquecer() {
  pararTique();
  Object.assign(timer, PADRAO);
  try { localStorage.removeItem(CHAVE); } catch (e) { /* sem armazenamento */ }
  titulo();
}

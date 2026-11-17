// Utilitários: template HTML com escape automático e formatação de datas/números.

class Seguro { constructor(s) { this.s = s; } toString() { return this.s; } }

export const raw = (s) => new Seguro(String(s));

export const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function render(v) {
  if (v instanceof Seguro) return v.s;
  if (Array.isArray(v)) return v.map(render).join("");
  if (v === false || v === null || v === undefined) return "";
  return esc(v);
}

// html`<b>${nome}</b>`: tudo que entra em ${} é escapado, menos outro html`` ou raw()
export function html(strings, ...vals) {
  let out = "";
  strings.forEach((s, i) => { out += s; if (i < vals.length) out += render(vals[i]); });
  return new Seguro(out);
}

export const iniciais = (nome) => String(nome || "?").trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
export const primeiroNome = (nome) => String(nome || "").trim().split(/\s+/)[0] || "";

export function fmtMin(min) {
  min = Math.round(min || 0);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h}h ${m}min` : `${h}h`;
}

const doServidor = (s) => new Date(String(s).replace(" ", "T"));   // "2026-11-09 14:35:00" (hora local)
const mesmoDia = (a, b) => a.toDateString() === b.toDateString();

export function fmtQuando(s) {
  const d = doServidor(s), hoje = new Date(), ontem = new Date(Date.now() - 864e5);
  const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (mesmoDia(d, hoje)) return `hoje ${hora}`;
  if (mesmoDia(d, ontem)) return "ontem";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export function fmtDataCurta(iso) {           // "2026-11-09" -> "09/11"
  const [, m, d] = String(iso).slice(0, 10).split("-");
  return `${d}/${m}`;
}

export function fmtProxima(iso) {              // próxima revisão: "hoje", "amanhã" ou data
  const alvo = new Date(String(iso).slice(0, 10) + "T00:00:00"), h = new Date(); h.setHours(0, 0, 0, 0);
  const dias = Math.round((alvo - h) / 864e5);
  if (dias <= 0) return "hoje";
  if (dias === 1) return "amanhã";
  return fmtDataCurta(iso);
}

export const diaSemana = (iso) => new Date(iso + "T00:00:00").toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
export const hojeISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
export const plural = (n, um, varios) => (n === 1 ? um : varios);

export function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

export const emailValido = (v) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(v || "").trim());

// Força da senha: 0 (vazia) a 4 (forte), com dica do que falta
export function forcaSenha(s) {
  s = String(s || "");
  if (!s) return { nivel: 0, rotulo: "", dica: "Use 8 ou mais caracteres, com letras e números." };
  let pontos = 0;
  if (s.length >= 8) pontos++;
  if (s.length >= 12) pontos++;
  if (/[a-z]/.test(s) && /[A-Z]/.test(s)) pontos++;
  if (/\d/.test(s) && /[A-Za-z]/.test(s)) pontos++;
  if (/[^A-Za-z0-9]/.test(s)) pontos++;
  const valida = s.length >= 8 && /[A-Za-z]/.test(s) && /\d/.test(s);
  const nivel = !valida ? 1 : Math.max(2, Math.min(4, pontos - 1));
  const rotulo = ["", "Fraca", "Razoável", "Boa", "Forte"][nivel];
  const dica = s.length < 8 ? "Faltam caracteres: use pelo menos 8." : !/\d/.test(s) ? "Adicione pelo menos um número."
    : !/[A-Za-z]/.test(s) ? "Adicione pelo menos uma letra." : nivel < 4 ? "Para ficar mais forte: misture maiúsculas e símbolos." : "Ótima senha.";
  return { nivel, rotulo, dica, valida };
}

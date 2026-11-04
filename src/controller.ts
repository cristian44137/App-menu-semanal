// Controlador puro: recibe una acción de la interfaz y devuelve el nuevo estado (y, si hace falta, un efecto).
import { UI } from './screens';
import { DEFAULT, dishName, FA, allowed, autoTune, NS, ORDER, SLN, State, Plan, add, calc, changed, ctxOf, diffKeys, dayMeals, easiest, fmt, generate, lst, mask, mins, monday, newPlan, padPlan, pantrySoon, parse, pastDays, prod, shop, spare, subbed, storeOf, tune, ymd } from './logic';
import { DEF, ING } from './data';
import { VERSION } from './news';
import { PALETA } from './theme';
import { REVIEW_EMAILS } from './config';

export type Act = { type: string; params?: any };
export type Fx = { kind: string; data?: any } | undefined;
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));
const idxToday = () => (new Date().getDay() + 6) % 7;
const today = () => ymd(new Date());
export const firstUI = (): UI => ({ tab: 'plan', w: ymd(monday(new Date())), day: idxToday(), month: ymd(new Date(new Date().getFullYear(), new Date().getMonth(), 1)), sheet: null, intro: 0, timer: null });

/** Carga un estado guardado (o de la nube) y lo adapta a la versión actual de la app. */
export const mergeState = (x: any): State => {
  const out = mergeRaw(x); delete (out as any).cal;
  if ((out.dev as any).calSync) { out.set.calSync = true; delete (out.dev as any).calSync; }   // antes era solo de un dispositivo
  // Antes se podía marcar como cocinado un día futuro: esas marcas se quitan (un día que no ha llegado no se ha cocinado).
  const t = today();
  Object.entries(out.plans).forEach(([w, p]) => { if (p.done) Object.keys(p.done).forEach((key) => { if (ymd(add(parse(w), +key.split('-')[0])) > t) delete p.done![key]; }); });
  return out;
};

/* ---------- sincronización entre dispositivos ---------- */
/** Ajustes de diseño que se quedan en cada dispositivo (tu móvil y tu tablet pueden verse distinto). */
/**
 * ¿Tiene Nevú Plus? Comprado en este móvil (Play lo confirma al abrir la app) o con la cuenta de revisión de Google.
 * Plus desbloquea: Google Calendar, la sincronización y la copia en Google Drive, y el PDF / imprimir.
 */
export const hasPlus = (st: State) => !!st.dev?.plus || REVIEW_EMAILS.includes((st.sync?.email || '').toLowerCase());
/** Acciones de Export que necesitan Plus (calsync, solo al activarla). */
/** Colores con los que empieza el creador de temas (Azul y Rosa de la paleta). */
const DRAFT0: [string, string] = [PALETA[5][1], PALETA[2][1]];
export const PLUS_EXPORTS = ['pdf', 'print', 'shoppdf', 'printshop', 'sync'];
export const LOCAL_KEYS = ['mode', 'accent', 'grad', 'themes', 'text', 'dens', 'motion', 'haptics', 'sound', 'tapSound', 'simple', 'keepAwake'] as const;
const shared = (s: State['set']) => { const o: any = { ...s }; LOCAL_KEYS.forEach((k) => delete o[k]); return JSON.stringify(o); };
const J = (x: any) => JSON.stringify(x ?? null);
/** Apunta la hora de cada parte que ha cambiado entre a y b (semana a semana, producto a producto). */
export function stampChanges(a: State, b: State, now = Date.now()) {
  const s = b.stamp;
  new Set([...Object.keys(a.plans), ...Object.keys(b.plans)]).forEach((w) => { if (J(a.plans[w]) !== J(b.plans[w])) s.plans[w] = now; });
  new Set([...Object.keys(a.pantry), ...Object.keys(b.pantry)]).forEach((id) => { if (J(a.pantry[id]) !== J(b.pantry[id])) s.pantry[id] = now; });
  if (shared(a.set) !== shared(b.set)) s.set = now;
  if (J(a.perfil) !== J(b.perfil)) s.perfil = now;
  if (J(a.conf) !== J(b.conf)) s.conf = now;
}
/**
 * Junta lo de este dispositivo (local) con lo de la nube (remote) sin perder cambios: para cada semana del menú,
 * cada producto de la despensa, los ajustes, el perfil y los precios gana la versión cambiada más tarde. Si una
 * parte no tiene fecha (copias antiguas), gana la copia más reciente en conjunto. El diseño se queda el de aquí.
 */
export function mergeStates(local: State, r0: any): State {
  const remote = mergeState(r0), out = clone(local), newerR = remote.updated > local.updated;
  const pick = (lt = 0, rt = 0) => (lt === rt ? newerR : rt > lt);
  new Set([...Object.keys(local.plans), ...Object.keys(remote.plans)]).forEach((w) => {
    if (pick(local.stamp.plans[w], remote.stamp.plans[w]) && (remote.plans[w] || remote.stamp.plans[w])) {
      if (remote.plans[w]) out.plans[w] = remote.plans[w]; else delete out.plans[w];
      out.stamp.plans[w] = remote.stamp.plans[w] ?? local.stamp.plans[w];
    }
  });
  new Set([...Object.keys(local.pantry), ...Object.keys(remote.pantry)]).forEach((id) => {
    const lt = local.stamp.pantry[id] || 0, rt = remote.stamp.pantry[id] || 0;
    if (lt === rt ? newerR && (!local.pantry[id] || !!remote.pantry[id]) : rt > lt) {   // sin fechas: no borrar lo que hay aquí
      if (remote.pantry[id]) out.pantry[id] = remote.pantry[id]; else delete out.pantry[id];
      out.stamp.pantry[id] = rt;
    }
  });
  if (pick(local.stamp.set, remote.stamp.set)) { const keep: any = {}; LOCAL_KEYS.forEach((k) => (keep[k] = (local.set as any)[k])); out.set = { ...remote.set, ...keep }; out.stamp.set = remote.stamp.set; }
  if (pick(local.stamp.perfil, remote.stamp.perfil)) { out.perfil = remote.perfil; out.stamp.perfil = remote.stamp.perfil; }
  if (pick(local.stamp.conf, remote.stamp.conf)) { out.conf = remote.conf; out.stamp.conf = remote.stamp.conf; }
  out.intro = local.intro || remote.intro; out.updated = Math.max(local.updated, remote.updated);
  return out;
}
/** ¿Hay diferencias en lo que se sincroniza? */
export const sameCloud = (a: any, b: any) => { const f = (x: any) => { const { sync, dev, updated, intro, ...r } = x; void sync; void dev; void updated; void intro; return J({ ...r, set: shared(r.set) }); }; return f(a) === f(b); };
/** Copia para subir a la nube: sin lo que es solo de este dispositivo. */
export const cloudCopy = (st: State) => { const { dev, ...rest } = st; void dev; return rest; };
const mergeRaw = (x: any): State => {
  const d = clone(DEFAULT), old = x?.set || {}, ver = x?.ver || 1;
  const set = { ...d.set, ...old, ex: { ...d.set.ex, ...(old.ex || {}) } };
  if (ver < 3) {
    set.text = [1, 2, 3][old.text ?? 1] ?? 2;                 // antes había 3 tamaños, ahora 6
    if (old.ex?.meat) set.ex.cured = true;                    // «sin carne ni embutidos» pasa a ser dos opciones
    set.ex.fish = true;                                       // hasta ahora nunca había pescado ni marisco
    if ((old.maxMin ?? 10) <= 10) set.maxMin = 15;           // el tiempo ahora incluye sacar, pesar y recoger
  }
  // Color de acento: en la v4 el de por defecto pasó de Oasis a Océano; en la v5 Océano va el primero de la lista.
  let acc = old.accent ?? 0;
  if (ver < 4 && acc === 0) acc = 1;
  if (ver < 5) acc = acc === 0 ? 1 : acc === 1 ? 0 : acc;
  set.accent = acc;
  if (!Array.isArray(set.times)) set.times = d.set.times;
  while (set.times.length < NS) set.times.push(d.set.times[set.times.length]);
  const plans: Record<string, Plan> = {}; Object.entries(x?.plans || {}).forEach(([k, p]) => { plans[k] = padPlan(p); });
  // Semanas cuya compra se completó antes de existir «compra hecha»: si todo está en el carrito, ya están compradas.
  Object.entries(plans).forEach(([w, p]) => {
    if (p.bought !== undefined) return;
    const sh = shop(p, { ...d.set, ...set }, x?.conf || {}, x?.pantry || {}, w);
    if (sh.all > 0 && sh.done === sh.all) p.bought = true;
  });
  return { ...d, ...x, ver: 5, set, perfil: { ...d.perfil, ...(x?.perfil || {}) }, plans, conf: x?.conf || {}, pantry: x?.pantry || {}, sync: x?.sync ?? null, updated: x?.updated || 0, intro: !!x?.intro,
    // Datos solo de este dispositivo (no se suben a la nube). Antes los ids del calendario iban en «cal».
    dev: { ...d.dev, ...(x?.dev || {}), cal: { ...(x?.cal || {}), ...(x?.dev?.cal || {}) } },
    stamp: { ...d.stamp, ...(x?.stamp || {}), plans: { ...(x?.stamp?.plans || {}) }, pantry: { ...(x?.stamp?.pantry || {}) } } };
};

/** Paso del − y + de la despensa: 1 unidad, o una décima parte del envase en gramos y mililitros. */
export const pstep = (st: State, id: string) => { const G = ING[id]; if (G.u !== 'g' && G.u !== 'ml') return 1; const P = prod(st.set.store, id, st.conf); return Math.max(5, Math.round((P ? P.q : 500) / 10 / 5) * 5); };

// Ajustes que cambian qué platos encajan: al tocarlos se reajustan esta semana y las siguientes.
const RETUNE = ['budget', 'maxMin', 'store', 'snack', 'extra', 'drink', 'k', 'p', 'f', 'mood', 'cold', 'pantryUse', 'pantryFirst', 'pantryDays'];
const DATA = ['Sub', 'BuyAll', 'Rebuy', 'Easy', 'Choose', 'Portion', 'Apply', 'Pin', 'Gen', 'Check', 'Price', 'Cfg', 'Prof', 'PanQ', 'PanStep', 'PanAdd', 'PanDel', 'PanOpen', 'Cooked', 'Unlock', 'Lock', 'Veto', 'Restore', 'Intro'];

/**
 * Reajusta esta semana y las siguientes y devuelve cuántos platos han cambiado y cuáles (para marcarlos como
 * «Cambiado» en el plan). Los días pasados y los platos que elegiste a mano no se tocan.
 * fresh: vuelve a elegir desde cero los platos no fijados (al permitir algo que antes estaba excluido).
 */
function retune(st: State, from: string, fresh = false) {
  let n = 0; const keys: Record<string, string[]> = {};
  Object.keys(st.plans).filter((w) => w >= from).forEach((w) => {
    const old = st.plans[w]; st.plans[w] = tune(old, st.set, ctxOf(st, w), fresh ? Math.random : undefined, fresh);
    n += changed(old, st.plans[w]); keys[w] = diffKeys(old, st.plans[w]);
  });
  return { n, keys };
}
/** Cambios que mueven el resto de la semana (menú dinámico, ver autoTune): elegir, cocinar, raciones, despensa… */
const DYN = ['Choose', 'Easy', 'Portion', 'Apply', 'Cooked', 'Unlock', 'Lock', 'Sub', 'PanQ', 'PanStep', 'PanAdd', 'PanDel', 'PanOpen'];
/** Reajusta la semana en curso (y la que estás viendo, si es futura) tras un cambio. Con «Menú fijo» no hace nada. */
function dynamic(st: State, ui: UI) {
  const keys: Record<string, string[]> = {}; let n = 0;
  if (st.set.fixedMenu) return { n, keys };
  const cur = ymd(monday(new Date()));
  [...new Set([cur, ui.w])].filter((w) => w >= cur && st.plans[w]).forEach((w) => {
    const old = st.plans[w]; st.plans[w] = autoTune(old, st.set, ctxOf(st, w));
    n += changed(old, st.plans[w]); keys[w] = diffKeys(old, st.plans[w]);
  });
  return { n, keys };
}
/** Tras reajustar: marca los platos nuevos y prepara el aviso. */
/**
 * «Cambiado» marca los platos que la app acaba de cambiar sola (al reajustar), para que veas qué ha cambiado.
 * Se quita cuando ya lo has visto: al abrir ese plato o al salir de ese día o de la pestaña del menú.
 */
const seen = (ui: UI, key: string) => { const f = ui.fresh?.[ui.w]; if (f?.includes(key)) ui.fresh = { ...ui.fresh, [ui.w]: f.filter((x) => x !== key) }; };
const seenDay = (ui: UI, day: number) => { const f = ui.fresh?.[ui.w]; if (f?.some((x) => x.startsWith(day + '-'))) ui.fresh = { ...ui.fresh, [ui.w]: f.filter((x) => !x.startsWith(day + '-')) }; };
const retuned = (ui: UI, r: { n: number; keys: Record<string, string[]> }, extra = ''): Fx => {
  ui.fresh = r.keys;
  // Días con platos nuevos en la semana que estás viendo, para decirlo en el aviso.
  const dn = [...new Set((r.keys[ui.w] || []).map((k) => +k.split('-')[0]))].sort().map((i) => ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'][i]);
  return r.n ? { kind: 'retuned', data: { n: r.n, tab: ui.tab, days: dn } } : extra ? { kind: 'info', data: extra } : { kind: 'plans' };
};
const pantryAdd = (st: State, id: string, q: number, w?: string) => {
  const it = st.pantry[id] || { q: 0, at: today() };
  it.q = Math.max(0, it.q + q);
  if (w) { if (it.w !== w) { it.w = w; it.wq = 0; } it.wq = Math.max(0, (it.wq || 0) + q); }
  if (q > 0 && it.q === q) it.at = today();
  if (it.q <= 1e-9) delete st.pantry[id]; else st.pantry[id] = it;
};

/**
 * defer: la app pinta el cambio al momento y reajusta el resto de la semana justo después (acción «Auto» con user),
 * para que tocar sea instantáneo aunque el móvil sea lento. Los tests lo hacen todo de una vez (defer = false).
 */
export function handle(st0: State, ui0: UI, e: Act, defer = false): { st: State; ui: UI; fx?: Fx; later?: boolean } {
  const st = clone(st0), ui = clone(ui0), p = e.params || {}, plan = st.plans[ui.w];
  let fx: Fx;
  switch (e.type) {
    case 'Go': if (ui0.tab === 'plan' && p.tab !== 'plan') seenDay(ui, ui0.day); ui.tab = p.tab; ui.sheet = null; break;
    case 'Day': seenDay(ui, ui0.day); ui.day = p.i; break;
    case 'Open': ui.sheet = { kind: p.kind, k: p.k, from: p.from }; if (p.kind === 'recipe') seen(ui, `${ui.day}-${p.k}`); break;
    case 'Close': ui.sheet = null; break;
    case 'Draft': { const d = [...(ui.draft || DRAFT0)] as [string, string]; d[p.k] = p.c; ui.draft = d; break; }
    case 'ThemeAdd': {
      if (!hasPlus(st)) { ui.sheet = { kind: 'plus', k: 0 }; break; }
      const [l, g] = ui.draft || DRAFT0, list = st.set.themes || [];
      if (list.length < 12) { st.set.themes = [...list, { n: 'Tema ' + (list.length + 1), l, g }]; st.set.grad = list.length; }
      ui.sheet = null; ui.draft = undefined; break;
    }
    case 'ThemeDel': { const i = +p.i, list = st.set.themes || []; st.set.themes = list.filter((_, j) => j !== i); const gi = st.set.grad ?? -1; st.set.grad = gi === i ? -1 : gi > i ? gi - 1 : gi; break; }
    case 'Tips': st.dev = { ...st.dev, tips: [...(st.dev.tips || '').split(',').filter(Boolean), p.tab].join(',') }; break;
    case 'Dev': st.dev = { ...st.dev, ...p }; break;
    case 'Sub': {
      // Sustituto para esta semana: la receta y la lista usan la alternativa; si estaba en el carrito, se desmarca.
      if (!plan) break;
      const old = plan.sub?.[p.id]; plan.sub = { ...(plan.sub || {}) };
      if (p.to) plan.sub[p.id] = p.to; else delete plan.sub[p.id];
      [p.id, old].forEach((x) => { if (x && plan.c[x]) delete plan.c[x]; });
      // Si lo cambias desde una receta, vuelves a ella para ver el ingrediente nuevo.
      ui.sheet = ui0.sheet?.kind === 'swap' && ui0.sheet.k >= 0 ? { kind: 'recipe', k: ui0.sheet.k } : null; fx = { kind: 'info', data: p.to ? `Cambiado por ${ING[p.to].n.toLowerCase()} en las recetas de esta semana` : `Vuelves a ${ING[p.id].n.toLowerCase()}` };
      break;
    }
    case 'Choose': {
      // El plato elegido queda fijado y los días siguientes (lo no fijado) se reajustan: así no se repite lo mismo
      // y, con la compra hecha, lo que ese plato usa de casa se reparte bien entre el resto de la semana.
      if (plan) { plan.sel[ui.day][p.k] = p.j; plan.l = { ...plan.l, [`${ui.day}-${p.k}`]: true }; fx = { kind: 'plans' };
        // Con menú fijo, al quitar una merienda ese día reparte las raciones (sin cambiar platos).
        if (p.j < 0 && st.set.fixedMenu) st.plans[ui.w] = autoTune(plan, st.set, ctxOf(st, ui.w), undefined, '', ui.day); }
      ui.sheet = p.j >= 0 && ui0.sheet?.kind === 'pick' && ui0.sheet.from === 'recipe' ? { kind: 'recipe', k: p.k } : null; break;
    }
    case 'Lock': {
      // Candado: fija el plato (la ración la sigue ajustando la app). Al quitarlo, la app puede volver a elegir.
      if (!plan) break; const key = `${ui.day}-${p.k}`;
      if (plan.l?.[key]) { plan.l = { ...plan.l }; delete plan.l[key]; fx = { kind: 'info', data: 'Desbloqueado: la app puede cambiar este plato' }; }
      else { plan.l = { ...plan.l, [key]: true }; fx = { kind: 'info', data: 'Fijado: la app no cambiará este plato' }; }
      break;
    }
    case 'Veto': {
      // «No me gusta»: entra o sale de la lista y el menú se rehace sin ello (lo fijado con eso también se cambia).
      const v = String(p.v), on = !(st.set.veto || []).includes(v);
      st.set.veto = on ? [...(st.set.veto || []), v] : (st.set.veto || []).filter((x) => x !== v);
      const name = v.startsWith('i:') ? ING[v.slice(2)]?.n.toLowerCase() : v.slice(2);
      if (on) Object.values(st.plans).forEach((pl) => pl.l && Object.keys(pl.l).forEach((key) => { const [i, k] = key.split('-').map(Number), j = pl.sel[i]?.[k]; if (j >= 0 && lst(k)[j] && !allowed(st.set, k, j, false)) delete pl.l![key]; }));
      if (on) ui.sheet = null;
      const msg = on ? `No volverá a salir: ${name}` : `Vuelve a estar permitido: ${name}`;
      const r = retuned(ui, retune(st, ymd(monday(new Date()))), msg);
      if (r?.kind === 'retuned') r.data.pre = msg;
      fx = r;
      break;
    }
    case 'Unlock': if (plan?.l) { delete plan.l[`${ui.day}-${p.k}`]; st.plans[ui.w] = tune(plan, st.set, ctxOf(st, ui.w)); } ui.sheet = null; fx = { kind: 'plans' }; break;
    case 'Portion': if (plan) { const q = plan.q[ui.day]; q[p.k] = FA[(FA.indexOf(q[p.k] || 1) + 1) % FA.length]; plan.l = { ...plan.l, [`${ui.day}-${p.k}`]: true }; } fx = { kind: 'plans' }; break;
    case 'Apply': if (plan) { plan.sel[p.i][p.k] = p.j; plan.q[p.i][p.k] = p.f; } fx = { kind: 'plans' }; break;
    case 'Week': ui.w = ymd(add(parse(ui.w), 7 * p.d)); break;
    case 'Today': ui.w = ymd(monday(new Date())); ui.day = idxToday(); { const n = new Date(); ui.month = ymd(new Date(n.getFullYear(), n.getMonth(), 1)); } break;
    case 'Month': { const m = parse(ui.month); ui.month = ymd(new Date(m.getFullYear(), m.getMonth() + p.d, 1)); break; }
    case 'Jump': { const d = parse(p.date); ui.w = ymd(monday(d)); ui.day = (d.getDay() + 6) % 7; ui.tab = 'plan'; break; }
    case 'Pin': { const prev = Object.keys(st.plans).sort().filter((k) => k < ui.w).pop(); const pl = newPlan(prev ? st.plans[prev].sel : DEF); if (prev) pl.q = clone(st.plans[prev].q); st.plans[ui.w] = tune(pl, st.set, ctxOf(st, ui.w)); ui.tab = 'plan'; fx = { kind: 'plans' }; break; }
    case 'Perms': ui.perm = { ...ui.perm, ...p }; break;
    case 'Gen': {
      // Semana nueva, pero lo que ya has comido (días pasados), el carrito y lo cocinado se mantienen.
      const ctx = ctxOf(st, ui.w), g = generate(st.set, Math.random, ctx), fixed = pastDays(ui.w, ctx.today);
      // Con la compra hecha, la semana nueva se hace con lo que hay en casa (ctx.only) y sigue marcada como comprada.
      if (plan && fixed) { for (let i = 0; i < fixed; i++) { g.sel[i] = plan.sel[i]; g.q[i] = plan.q[i]; } st.plans[ui.w] = { ...tune(g, st.set, ctx, Math.random), c: plan.c, p: plan.p, done: plan.done, l: {}, bought: plan.bought, sub: plan.sub }; }
      else st.plans[ui.w] = { ...g, c: plan?.c || {}, done: plan?.done || {}, bought: plan?.bought, sub: plan?.sub };
      ui.tab = 'plan'; ui.fresh = {}; fx = { kind: 'plans' }; break;
    }
    case 'Easy': {
      if (!plan) break;
      const cur = plan.sel[ui.day][p.k], j = easiest(st.set, p.k, cur, plan.bought ? spare(plan, st.set, st.pantry, ui.w, today(), `${ui.day}-${p.k}`, true) : st.pantry, !!plan.bought);
      if (j === cur || j < 0) { fx = { kind: 'easy', data: '' }; break; }
      plan.sel[ui.day][p.k] = j; plan.q[ui.day][p.k] = 1; plan.l = { ...plan.l, [`${ui.day}-${p.k}`]: true };
      fx = { kind: 'easy', data: `${lst(p.k)[j][0]} · ${mins(lst(p.k)[j])} min` }; break;
    }
    case 'OpenTimer': if (ui.timer) { ui.w = ui.timer.w; ui.day = ui.timer.day; ui.tab = 'plan'; ui.sheet = { kind: 'recipe', k: ui.timer.k }; } break;
    case 'Check': {
      if (!plan) break;
      const line = Object.values(shop(plan, st.set, st.conf, st.pantry, ui.w).r).flat().find((l) => l.id === p.id);
      const P = prod(st.set.store, p.id, st.conf), qty = line && P ? line.n * P.q : 0;
      plan.c[p.id] = !plan.c[p.id];
      if (qty) pantryAdd(st, p.id, plan.c[p.id] ? qty : -qty, ui.w);   // lo que metes en el carrito pasa a tu despensa
      // Con todo en el carrito, la compra queda hecha: desde ahora los cambios usan lo que tienes en casa.
      if (!plan.bought) { const sh = shop(plan, st.set, st.conf, st.pantry, ui.w); if (sh.all > 0 && sh.done === sh.all) { plan.bought = true; fx = { kind: 'bought' }; } }
      break;
    }
    case 'BuyAll': {
      // «Ya he hecho la compra»: da la compra por hecha tal cual. Lo que no marcaste no se añade a la despensa
      // (si no lo compraste, no está en casa) y los cambios se harán solo con lo que sí tienes.
      if (!plan) break;
      plan.bought = true; fx = { kind: 'bought' }; break;
    }
    case 'Rebuy': if (plan) { plan.bought = false; fx = { kind: 'info', data: 'Vale: los cambios pueden volver a añadir cosas a la lista de la compra' }; } break;
    case 'Price': { const s = storeOf(st.set.store, p.id, st.conf), key = `${s}:${p.id}`; if (p.value > 0) st.conf[key] = { p: p.value, d: ymd(new Date()) }; else delete st.conf[key]; break; }
    case 'SyncSet': st.sync = p.email ? { email: p.email, at: p.at || st.sync?.at || 0 } : null; break;
    // Llega la copia de la nube: se junta con lo de aquí en este mismo momento (sin perder lo que acabas de tocar).
    case 'Merge': { const m = mergeStates(st, p.state); m.sync = st.sync; m.dev = st.dev; return { st: m, ui, fx: { kind: 'plans' } }; }
    case 'Replace': {
      // Llega una copia (de la nube o de un archivo): se queda lo que es solo de este móvil (sesión y calendario).
      const m = mergeState(p.state); m.sync = st.sync ? { ...st.sync, at: Date.now() } : null; m.dev = st.dev;
      if (p.keepIntro) m.intro = st.intro || m.intro;
      return { st: m, ui: ui0, fx: { kind: 'plans' } };
    }
    case 'Cfg': {
      const key = String(p.key);
      if (key.startsWith('ex.')) (st.set.ex as any)[key.slice(3)] = p.value; else if (/^t\d$/.test(key)) st.set.times[+key[1]] = p.value; else (st.set as any)[key] = p.value;
      if (key === 'accent') st.set.grad = -1;     // elegir un tema de la lista quita el tema propio
      if (key.startsWith('ex.') || RETUNE.includes(key)) {
        // Al permitir algo que antes estaba excluido, el menú se rehace desde cero (sin tocar lo fijado ni lo pasado).
        const fresh = key.startsWith('ex.') && p.value === false;
        fx = retuned(ui, retune(st, ymd(monday(new Date())), fresh), key === 'store' ? `Lista de la compra en ${['Mercadona', 'Día', 'la tienda más barata'][p.value] ?? ''}` : '');
      }
      if (!fx && (['notif', 'meals', 'exp', 'popup', 'nsound', 'buy', 'hour', 'store'].includes(key) || /^t\d$/.test(key))) fx = { kind: 'plans' };
      break;
    }
    case 'Prof': {
      (st.perfil as any)[p.key] = p.value; const c = calc(st.perfil);
      if (c) { st.set.k = c.kc; st.set.p = c.p; st.set.f = c.f; fx = retuned(ui, retune(st, ymd(monday(new Date())))); }
      break;
    }
    /* ---------- despensa ---------- */
    case 'PanAdd': { const P = prod(st.set.store, p.id, st.conf); if (P) pantryAdd(st, p.id, P.q); ui.sheet = null; break; }
    case 'PanStep': pantryAdd(st, p.id, p.d * pstep(st, p.id)); break;
    case 'PanQ': { const v = Math.max(0, +p.value || 0), it = st.pantry[p.id]; if (it) { if (v <= 0) delete st.pantry[p.id]; else { it.q = v; if (it.wq) it.wq = Math.min(it.wq, v); } } break; }
    case 'PanDel': delete st.pantry[p.id]; break;
    case 'PanOpen': { const it = st.pantry[p.id]; if (it) it.open = it.open ? undefined : today(); break; }
    case 'Cooked': {
      // Día y semana explícitos para poder deshacerlo desde el aviso aunque ya estés viendo otro día.
      const w = p.w ?? ui.w, day = p.day ?? ui.day, pl = st.plans[w];
      if (!pl || ymd(add(parse(w), day)) > today()) break;   // un día que aún no ha llegado no se puede dar por cocinado
      const plan = pl, key = `${day}-${p.k}`, m = dayMeals(mask(st.set, plan.sel[day]), plan.q[day])[p.k]; if (!m) break;
      const undo = !!plan.done?.[key];
      m[3].map(([g0, q0]) => subbed(plan, g0, q0)).forEach(([g, q]) => { if (st.pantry[g] || undo) pantryAdd(st, g, undo ? q : -q); const it = st.pantry[g]; if (it && !undo && ING[g].open && !it.open) it.open = today(); });
      plan.done = { ...plan.done, [key]: !undo };
      fx = { kind: undo ? 'plain' : 'cooked', data: { k: p.k, day, w } };
      break;
    }
    // Borrar todos los datos: el estado vuelve al inicial (con la presentación). La app quita además los eventos del
    // calendario y, con cloud, la copia de Google Drive (ver fx «wipe» en App.tsx).
    case 'Wipe': {
      const cloud = !!p.cloud && !!st.sync, cal = st.dev?.cal || {}, fresh = mergeState({}); fresh.dev = { cal: {}, syncErr: '', news: st.dev?.news, plus: st.dev?.plus, plusPrice: st.dev?.plusPrice };   // lo comprado no se borra
      Object.keys(st).forEach((k) => delete (st as any)[k]); Object.assign(st, fresh);
      Object.assign(ui, firstUI()); fx = { kind: 'wipe', data: { cloud, cal } }; break;
    }
    // Novedades vistas en este dispositivo (y, con open, abre la lista).
    case 'News': st.dev = { ...st.dev, news: VERSION }; ui.sheet = p.open ? { kind: 'news', k: 0 } : null; break;
    // Volver a poner una merienda quitada a mano: la app elige cuál y reorganiza el día (y, con menú dinámico, la semana).
    case 'Restore': {
      if (!plan) break; const key = `${ui.day}-${p.k}`, old = plan;
      st.plans[ui.w] = autoTune(plan, st.set, ctxOf(st, ui.w), undefined, key);
      const r = { n: changed(old, st.plans[ui.w]), keys: { [ui.w]: diffKeys(old, st.plans[ui.w]) } };
      fx = r.n > 1 ? retuned(ui, r) : (ui.fresh = r.keys, { kind: 'plans' }); break;
    }
    // Al abrir la app, al volver a ella y al cambiar de día: aplica los consejos al resto de la semana (menú dinámico).
    // user: viene de un cambio tuyo (se guarda y se sincroniza); quiet: sin aviso (para no tapar «Deshacer»).
    case 'Auto': { const r = dynamic(st, ui); if (!r.n) return { st: st0, ui: ui0, fx: undefined }; fx = retuned(ui, r); if (p.quiet) fx = { kind: 'plans' }; if (st.set.calSync) st.dev.calDirty = true; break; }
    case 'Intro': if (p.page < 0) { st.intro = true; ui.intro = 0; st.dev = { ...st.dev, news: VERSION }; } else { ui.intro = p.page; if (p.page === 0) st.intro = false; } break;
    case 'Export': fx = { kind: 'export', data: p.kind }; break;
    case 'TimerStart': ui.timer = { end: p.end, sec: p.sec, k: ui.sheet?.k ?? -1, day: ui.day, w: ui.w }; fx = { kind: e.type, data: p }; break;
    case 'TimerStop': ui.timer = null; fx = { kind: e.type, data: p }; break;
    // Solo una vez: lo avisan la receta (si está abierta) y la app; el segundo ya no encuentra temporizador.
    case 'TimerDone': if (!ui0.timer) return { st: st0, ui: ui0, fx: undefined }; ui.timer = null; fx = { kind: e.type, data: p }; break;
  }
  // Menú dinámico: el resto de la semana se adapta al cambio (salvo con «Menú fijo» en Ajustes).
  let later = false;
  if (DYN.includes(e.type) && !(e.type === 'Lock' && st.plans[ui.w]?.l?.[`${ui.day}-${p.k}`])) {
    if (defer && !st.set.fixedMenu) later = true; else {
    const r = dynamic(st, ui);
    if (r.n) { const prev = fx; fx = retuned(ui, r); if (prev?.kind === 'easy' || prev?.kind === 'cooked') fx = prev; }
  } }
  // «Auto» no cuenta como cambio tuyo: cada dispositivo lo calcula igual y así no pisa cambios de otro dispositivo al sincronizar.
  if (DATA.includes(e.type) || (e.type === 'Auto' && p.user)) {
    st.updated = Date.now(); stampChanges(st0, st, st.updated);
    // El calendario lo actualiza el dispositivo donde se hace el cambio (así no se duplican eventos).
    if (st.set.calSync) st.dev.calDirty = true;   // calSync() solo reescribe las semanas cuyos eventos han cambiado de verdad
  }
  return { st, ui, fx, later };
}

/* ---------- avisos ---------- */
/** Avisos futuros: compra, cada comida y productos de la despensa a punto de caducar. */
export function reminders(st: State, now = new Date()) {
  const out: { title: string; body: string; at: Date }[] = [], s = st.set;
  Object.keys(st.plans).forEach((wk) => {
    const W = parse(wk), p = st.plans[wk];
    if (s.notif) { const at = add(W, s.buy); at.setHours(s.hour, 0, 0, 0); if (at > now) out.push({ title: 'Hora de la compra', body: `${shop(p, s, st.conf, st.pantry, wk).all} productos para la semana del ${fmt(W)}`, at }); }
    if (s.meals) p.sel.forEach((d, i) => [0, 3, 1, 4, 2].forEach((k) => { const at = add(W, i); at.setHours(0, s.times[k], 0, 0); const v = mask(s, d)[k]; if (at > now && v >= 0) { const m = lst(k)[v]; out.push({ title: `${SLN[k]}: ${dishName(m[0], p, m[3])}`, body: `${mins(m)} min en la cocina`, at }); } }));
  });
  if (s.exp) pantrySoon(st.pantry, ymd(now), 14).forEach((x) => {
    const at = add(parse(x.exp!), -1); at.setHours(10, 0, 0, 0);
    if (at > now) { const P = prod(s.store, x.id, st.conf); out.push({ title: `Caduca mañana: ${P?.n || ING[x.id].n}`, body: 'Úsalo hoy o congélalo si se puede.', at }); }
  });
  return out.sort((a, b) => +a.at - +b.at).slice(0, 60);
}
export const calendarEvents = (st: State, ui: UI) => {
  const p = st.plans[ui.w], W = parse(ui.w), H = st.set.times;
  if (!p) return [];
  return p.sel.flatMap((d, i) => ORDER.filter((k) => k < 5).map((k) => { const v = mask(st.set, d)[k]; if (v < 0) return null; const m = lst(k)[v], start = add(W, i); start.setHours(0, H[k], 0, 0); return { key: `${i}-${k}`, title: `${SLN[k]}: ${dishName(m[0], p, m[3])}`, start, end: new Date(+start + mins(m) * 60000), notes: m[3].map(([g, q]: any) => `${q} ${ING[g].u} ${ING[g].n}`).join(', ') }; }).filter(Boolean) as { key: string; title: string; start: Date; end: Date; notes: string }[]);
};

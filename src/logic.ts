// Lógica pura (sin interfaz): nutrición, compra, despensa, caducidades, perfil y optimizador de menús.
import { ING, M, DEF, Meal, Prod } from './data';
import { MICRO, MN, refs, weights } from './nutri';
import { SECTIONS, sectionOf, subQty } from './subs';
import { extraMin, renderSteps } from './cook';

/* ---------- franjas del día ---------- */
// Índices fijos: 0 desayuno, 1 comida, 2 cena, 3 merienda (media mañana), 4 extra, 5 bebida.
export const K = 'DCNMXB';
export const SLN = ['Desayuno', 'Comida', 'Cena', 'Merienda de mañana', 'Merienda de tarde', 'Bebida'];
/** Orden en pantalla, en los ajustes y en el PDF: la merienda va entre el desayuno y la comida. */
export const ORDER = [0, 3, 1, 4, 2, 5];
export const NS = 6;
export const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
export const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const STORES = ['Mercadona', 'Día', 'Más barato'];
export const FA = [1, 1.5, 2];

/* ---------- tipos ---------- */
export type Ex = { meat: boolean; cured: boolean; fish: boolean; dairy: boolean; gluten: boolean; flour: boolean; egg: boolean; nuts: boolean };
export type Settings = {
  mode: 'auto' | 'light' | 'dark'; accent: number; /** Temas propios de Nevú Plus y el elegido (posición en themes; -1 o nada = ninguno). */ themes?: { n: string; l: string; g: string }[]; grad?: number; text: number; dens: number; haptics: boolean; sound: boolean;
  k: number; p: number; f: number; store: number; buy: number; hour: number;
  notif: boolean; meals: boolean; exp: boolean; popup: boolean; nsound: boolean;
  times: number[]; maxMin: number; budget: number; snack: boolean; extra: boolean; drink: boolean; ex: Ex;
  /** Con qué comida va la bebida del día (franja 0-4): su hora es la de esa comida. */
  drinkWith: number;
  /** Poner las comidas en el calendario de Google (lo escribe el dispositivo donde haces el cambio). */
  calSync: boolean;
  priceInfo: boolean; pantryUse: boolean; pantryFirst: boolean; pantryDays: number; mood: boolean; cold: boolean;
  /** Modo sencillo: solo lo que toca ahora, sin cifras. tapSound: sonido en cada toque. motion: animaciones. */
  simple: boolean; tapSound: boolean; motion: boolean;
  /** Lo que no te gusta y no debe salir nunca: «r:Nombre del plato» o «i:id del ingrediente». */
  veto: string[];
  /** Menú fijo: la app no cambia sola los platos (por ejemplo, si ya has imprimido la semana). */
  fixedMenu: boolean;
  /** Pantalla encendida: nunca, mientras ves una receta o tienes el temporizador en marcha, o siempre. */
  keepAwake: 'no' | 'receta' | 'siempre';
};
export type Perfil = { sex: 'm' | 'f'; age: number; h: number; w: number; act: number; goal: number };
/** sel y q: 7 días × 6 franjas. c: marcados en el carrito. l: platos fijados a mano. done: platos ya cocinados. */
export type Plan = {
  sel: number[][]; q: number[][]; c: Record<string, boolean>; p: Record<string, number>; l?: Record<string, boolean>; done?: Record<string, boolean>;
  /** La compra de esta semana ya está hecha: a partir de aquí, los cambios usan lo que hay en casa. */
  bought?: boolean;
  /** Sustitutos elegidos esa semana al no encontrar un producto: ingrediente → alternativa (ver src/subs.ts). */
  sub?: Record<string, string>;
};
/** Despensa: cantidad en la unidad del ingrediente, fecha de entrada, fecha de apertura y lo añadido desde la compra de la semana w. */
export type PItem = { q: number; at: string; open?: string; w?: string; wq?: number };
export type Pantry = Record<string, PItem>;
export type State = {
  ver: number; plans: Record<string, Plan>; set: Settings; perfil: Perfil; conf: Record<string, { p: number; d: string }>;
  pantry: Pantry; updated: number; sync: { email: string; at: number } | null; intro: boolean;
  /** Solo de este dispositivo: no se sube a la nube (ver cloudCopy en controller.ts). */
  dev: Dev;
  /** Cuándo cambió por última vez cada parte (para fusionar sin perder nada al sincronizar dos dispositivos). */
  stamp: Stamp;
};
export type Stamp = { plans: Record<string, number>; pantry: Record<string, number>; set: number; perfil: number; conf: number };
/** Datos de este dispositivo: eventos creados en su calendario, si los sincroniza solo y el último error de la nube. */
export type Dev = { cal: Record<string, string[]>; calSig?: Record<string, string>; calDirty?: boolean; syncErr: string; seen?: string;
  /** Última versión cuyas novedades se han visto en este dispositivo (ver src/news.ts). */
  news?: string;
  /** Calendario: lo último que pasó al escribir (o el error), para enseñarlo en Ajustes. */
  calInfo?: string; calErr?: string;
  /** Nevú Plus comprado con la cuenta de Google Play de este móvil (se comprueba con Play al abrir la app) y su precio. */
  plus?: boolean; plusPrice?: string;
  /** Pestañas cuyo consejo de primer uso ya se ha cerrado, separadas por comas. */
  tips?: string };
/** Contexto que necesitan el coste y la despensa. */
export type Ctx = {
  conf: State['conf']; pantry: Pantry; w: string; today: string; sex: 'm' | 'f';
  /** Compra de la semana ya hecha: los cambios se hacen con lo que hay en casa (ver Plan.bought). */
  only?: boolean;
  /** Platos ya cocinados esa semana («día-franja»): ya están descontados de la despensa. */
  done?: Record<string, boolean>;
};

export const DEFAULT: State = {
  ver: 5, plans: {},
  set: {
    mode: 'auto', accent: 0, text: 2, dens: 1, haptics: true, sound: true,
    k: 2200, p: 70, f: 25, store: 0, buy: -1, hour: 18,
    notif: false, meals: false, exp: true, popup: true, nsound: true,
    times: [480, 840, 1260, 660, 1020, 1050], maxMin: 15, budget: 0, snack: true, extra: true, drink: true, drinkWith: 4, calSync: false,
    ex: { meat: false, cured: false, fish: false, dairy: false, gluten: false, flour: false, egg: false, nuts: false },
    priceInfo: false, pantryUse: true, pantryFirst: false, pantryDays: 4, mood: false, cold: false,
    simple: false, tapSound: false, motion: true, veto: [], fixedMenu: false, keepAwake: 'receta',
  },
  perfil: { sex: 'm', age: 0, h: 0, w: 0, act: 1.375, goal: 0 },
  conf: {}, pantry: {}, updated: 0, sync: null, intro: false, dev: { cal: {}, syncErr: '' }, stamp: { plans: {}, pantry: {}, set: 0, perfil: 0, conf: 0 },
};
export const fmtTime = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

/* ---------- fechas ---------- */
export const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const parse = (s: string) => new Date(s + 'T00:00:00');
export const add = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const monday = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return add(x, -((x.getDay() + 6) % 7)); };
export const fmt = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;
export const days = (a: string, b: string) => Math.round((+parse(b) - +parse(a)) / 864e5);

/* ---------- platos ---------- */
/** Lista de platos de cada franja (merienda y extra comparten lista). */
export const lst = (k: number): Meal[] => M[k === 5 ? 'B' : k >= 3 ? 'M' : (K[k] as 'D' | 'C' | 'N')];
const listKey = (k: number) => (k === 5 ? 'B' : k >= 3 ? 'M' : K[k]);
/** Minutos de sacar, pesar y recoger: 1 min fijo más medio minuto por ingrediente. */
/** Minutos de sacar, pesar, cortar y recoger: crecen un poco con la ración (más que cortar y pesar). */
export const prep = (m: Meal, f = 1) => 1 + Math.ceil(m[3].length * 0.5 * (1 + 0.4 * (Math.max(1, f) - 1)));
/** Tiempo total del plato: cocina + preparación (los platos de scale() ya traen la cocina ajustada a su ración). */
export const mins = (m: Meal) => m[2] + prep(m, (m as any).f || 1);
/**
 * Plato para una ración f: cantidades y nutrición ×f, y además los tiempos ajustados (un porridge doble tarda más
 * en espesar, el horno con más cantidad también), los pasos con esos minutos y el temporizador.
 */
export const scale = (m: Meal, f: number): Meal => {
  const r = !f ? 1 : f, extra = extraMin(m[5], r);
  const out = [m[0], m[1], m[2] + extra, r === 1 ? m[3] : m[3].map(([g, q]) => [g, q * r] as [string, number]), r === 1 ? m[4] : m[4].map((x) => x * r), renderSteps(m[5], r), m[6], m[7] ? m[7] + extra * 60 : 0, m[8]] as Meal;
  (out as any).f = r;
  return out;
};
/** Hora a la que se toma cada franja (la bebida, a la de la comida a la que acompaña). */
export const slotTime = (s: Settings, k: number) => (k === 5 ? s.times[s.drinkWith ?? 4] : s.times[k]);
export const active = (s: Settings) => [true, true, true, s.snack, s.extra, s.drink];
const pad = <T,>(a: T[], v: T) => { const x = a.slice(0, NS); while (x.length < NS) x.push(v); return x; };
/** Selección del día con las franjas desactivadas en Ajustes puestas a -1. */
export const mask = (s: Settings, d: number[]) => pad(d, -1).map((v, k) => (active(s)[k] ? v : -1));
export const dayMeals = (d: number[], q: number[]) => pad(d, -1).map((v, k) => (v < 0 || !lst(k)[v] ? null : scale(lst(k)[v], q[k] || 1)));
export const nut = (d: number[], q: number[]) => dayMeals(d, q).reduce((a, m) => a.map((x, i) => x + (m ? m[4][i] : 0)), [0, 0, 0, 0, 0]);
export const minutes = (d: number[], q: number[]) => dayMeals(d, q).reduce((s, m) => s + (m ? mins(m) : 0), 0);

/* ---------- gramos y micronutrientes ---------- */
export const grams = (id: string, qty: number) => (ING[id].u === 'g' || ING[id].u === 'ml' ? qty : qty * (ING[id].gu ?? 0));
const microCache = new WeakMap<Meal, number[]>();
/** Micronutrientes del plato (ver MN en nutri.ts). La fibra es la del plato. */
export function micro(m: Meal): number[] {
  const hit = microCache.get(m); if (hit) return hit;
  const v = MN.map(() => 0);
  m[3].forEach(([id, q]) => { const r = MICRO[id], g = grams(id, q); if (r) r.forEach((x, i) => (v[i] += (x * g) / 100)); });
  v[0] = m[4][4];
  microCache.set(m, v); return v;
}

/* ---------- supermercados ---------- */
const unitPrice = (conf: State['conf'], st: 0 | 1, id: string) => { const P = ING[id][st ? 'D' : 'M']; return P ? (conf[`${st}:${id}`]?.p ?? P.p) / P.q : Infinity; };
/** Tienda real de un ingrediente: 0 Mercadona, 1 Día, -1 si no lo hay. Con «Más barato» (2) elige el menor precio por unidad. */
export const storeOf = (store: number, id: string, conf: State['conf'] = {}): -1 | 0 | 1 => {
  const G = ING[id]; if (!G) return -1;
  if (store === 0) return G.M ? 0 : -1;
  if (store === 1) return G.D ? 1 : -1;
  const a = unitPrice(conf, 0, id), b = unitPrice(conf, 1, id);
  return a === Infinity && b === Infinity ? -1 : a <= b ? 0 : 1;
};
/** Producto concreto de un ingrediente en el supermercado elegido. */
export const prod = (store: number, id: string, conf: State['conf'] = {}): Prod | undefined => { const st = storeOf(store, id, conf); return st < 0 ? undefined : ING[id][st ? 'D' : 'M']; };
export const avail = (store: number, m: Meal) => m[3].every(([g]) => storeOf(store, g) >= 0);
export const priceOf = (conf: State['conf'], store: number, id: string) => { const st = storeOf(store, id, conf); return st < 0 ? 0 : conf[`${st}:${id}`]?.p ?? ING[id][st ? 'D' : 'M']!.p; };
export const mealCost = (m: Meal, store: number, conf: State['conf'] = {}) => m[3].reduce((s, [g, q]) => { const P = prod(store, g, conf); return s + (P ? (q / P.q) * priceOf(conf, store, g) : 0); }, 0);
export const dayCost = (d: number[], q: number[], store: number, conf: State['conf'] = {}) => dayMeals(d, q).reduce((s, m) => s + (m ? mealCost(m, store, conf) : 0), 0);

/* ---------- dieta ---------- */
/** Qué etiqueta de ingrediente excluye cada opción de dieta. */
export const EX_TAG: Record<keyof Ex, string> = { meat: 'carne', cured: 'embutido', fish: 'pescado', dairy: 'lacteo', gluten: 'gluten', flour: 'harina', egg: 'huevo', nuts: 'frutoseco' };
const tagged = (id: string, tag: string) => (ING[id].t || '').split(' ').includes(tag);
/** ¿Encaja un ingrediente suelto con tu dieta? (para elegir sustitutos). */
/** Plato vetado («No me gusta»): por su nombre o porque lleva un ingrediente vetado. */
export const vetoed = (s: Settings, m: Meal) => !!s.veto?.length && (s.veto.includes('r:' + m[0]) || m[3].some(([g]) => s.veto.includes('i:' + g)));
export const allowedIng = (s: Settings, id: string) => !s.veto?.includes('i:' + id) && !(Object.keys(EX_TAG) as (keyof Ex)[]).some((g) => s.ex[g] && tagged(id, EX_TAG[g]));
export const allowed = (s: Settings, k: number, j: number, time = true) => {
  const m = lst(k)[j]; if (!m) return false;
  return avail(s.store, m) && (!time || mins(m) <= s.maxMin) && !vetoed(s, m) && !(Object.keys(EX_TAG) as (keyof Ex)[]).some((g) => s.ex[g] && m[3].some(([i]) => tagged(i, EX_TAG[g])));
};

/* ---------- despensa ---------- */
/** Fecha de caducidad estimada: desde que se abre (si cuenta desde la apertura) o desde que entró. Larga duración: null. */
export const expiry = (id: string, it: PItem): string | null => {
  const G = ING[id]; if (!G || G.life >= 30) return null;
  return ymd(add(parse(G.open && it.open ? it.open : it.at), G.life));
};
/** Productos de la despensa que caducan en los próximos n días, del más urgente al menos. */
export function pantrySoon(pantry: Pantry, today: string, n: number) {
  return Object.keys(pantry).filter((id) => pantry[id].q > 0 && ING[id]).map((id) => ({ id, it: pantry[id], exp: expiry(id, pantry[id]) }))
    .filter((x) => x.exp && days(today, x.exp) <= n).sort((a, b) => a.exp!.localeCompare(b.exp!)).map((x) => ({ ...x, left: days(today, x.exp!) }));
}
/** Stock que cuenta para la lista de la semana w (lo comprado esa misma semana no la reduce). */
const stock = (it: PItem | undefined, w: string) => (!it ? 0 : Math.max(0, it.q - (it.w === w ? it.wq || 0 : 0)));

/* ---------- optimizador semanal ---------- */
/** gi: ingredientes que cuentan para la variedad, como números (más rápido); key: plato para contar repeticiones. */
type Cand = { j: number; f: number; nut: number[]; mic: number[]; cost: number; r: boolean; min: number; ings: [string, number][]; gi: number[]; key: string };
const EMPTY: Cand = { j: -1, f: 1, nut: [0, 0, 0, 0, 0], mic: MN.map(() => 0), cost: 0, r: false, min: 0, ings: [], gi: [], key: '' };
/** Número de cada ingrediente (para contar repeticiones con un array en vez de con un objeto). */
const GIDX: Record<string, number> = {}; let GN = 0; const gid = (g: string) => (GIDX[g] ??= GN++);
const SEEN = new Uint8Array(512);
const cand = (k: number, j: number, f: number, s: Settings, conf: State['conf']): Cand => {
  const m = lst(k)[j];
  return { j, f, nut: m[4].map((x) => x * f), mic: micro(m).map((x) => x * f), cost: mealCost(m, s.store, conf) * f, r: m[1].includes('R'), min: mins(scale(m, f)), ings: m[3].map(([g, q]) => [g, q * f]),
    gi: m[3].filter(([g]) => !MINOR.has(g)).map(([g]) => gid(g)), key: listKey(k) + j };
};
/** Candidatos de cada franja: platos permitidos × raciones (las bebidas y el extra van siempre ×1; el extra se puede quitar). */
/** ¿Puedes hacer este plato con lo que tienes en casa? (todos sus ingredientes, en cantidad suficiente para la ración f). */
export const doable = (m: Meal, pantry: Pantry, f = 1) => m[3].every(([g, q]) => MINOR_OK.has(g) || (pantry[g]?.q || 0) >= q * f - 1e-9);
/**
 * Lo que queda libre en casa para cambiar un plato: la despensa menos lo que necesitan los demás platos que aún
 * no has cocinado esta semana (desde hoy). Así un cambio no te deja sin el pollo de mañana.
 */
/** onlyLocked: descuenta solo los platos fijados (los demás se reajustan después de elegir, así hay más donde escoger). */
export function spare(p: Plan, s: Settings, pantry: Pantry, w: string, today: string, skip = '', onlyLocked = false): Pantry {
  const out: Pantry = {}; Object.keys(pantry).forEach((g) => (out[g] = { ...pantry[g] }));
  const from = pastDays(w, today);
  p.sel.forEach((d, i) => { if (i >= from) dayMeals(mask(s, d), p.q[i]).forEach((m, k) => {
    const key = `${i}-${k}`; if (!m || key === skip || p.done?.[key] || (onlyLocked && !p.l?.[key])) return;
    m[3].forEach(([g0, q0]) => { const [g, q] = subbed(p, g0, q0); if (out[g]) out[g].q -= q; });
  }); });
  return out;
}
/** Básicos que casi siempre hay en casa y no impiden hacer un plato (se compran aparte si faltan). */
const MINOR_OK = new Set(['miel', 'limon', 'cacao', 'chia', 'jengi', 'manza']);
/** Los candidatos solo cambian si cambian los ajustes, los precios o (con la compra hecha) la despensa: se guardan los últimos. */
let candMemo: { key: string; C: Cand[][] } | null = null;
function candidates(s: Settings, conf: State['conf'], ctx?: Ctx) {
  const key = JSON.stringify([s, conf, ctx?.only ? Object.keys(ctx.pantry).filter((g) => ctx.pantry[g].q > 0).sort() : 0]);
  if (candMemo?.key === key) return candMemo.C;
  const C = candidatesRaw(s, conf, ctx); candMemo = { key, C }; return C;
}
function candidatesRaw(s: Settings, conf: State['conf'], ctx?: Ctx) {
  return [0, 1, 2, 3, 4, 5].map((k) => {
    if (!active(s)[k]) return [EMPTY];
    // Si una comida está activada en Ajustes, siempre se pone (la app no la quita por su cuenta; tú sí puedes quitarla).
    const out: Cand[] = [];
    // Con la compra hecha, solo entran platos cuyos ingredientes tienes (la cantidad la controla el optimizador).
    const has = (m: Meal) => !ctx?.only || m[3].every(([g]) => MINOR_OK.has(g) || (ctx.pantry[g]?.q || 0) > 0);
    // Raciones realistas: un plato no puede pasar de una parte razonable de las calorías del día.
    const cap = [0.35, 0.45, 0.42, 0.22, 0.2, 0.15][k] * s.k;
    lst(k).forEach((m, j) => { if (allowed(s, k, j) && has(m)) (k < 4 ? FA : [1]).forEach((f) => { if (f === 1 || (m[4][0] * f <= cap && mins(scale(m, f)) <= s.maxMin)) out.push(cand(k, j, f, s, conf)); }); });
    if (!out.length) lst(k).forEach((m, j) => { if (allowed(s, k, j, false) && has(m)) out.push(cand(k, j, 1, s, conf)); });
    if (!out.length) lst(k).forEach((_, j) => { if (allowed(s, k, j, false)) out.push(cand(k, j, 1, s, conf)); });
    return out.length ? out : [EMPTY];
  });
}

/** Ingredientes de acompañamiento que no cuentan para la variedad del día. */
const MINOR = new Set(['miel', 'limon', 'jengi', 'manza', 'cacao', 'chia', 'tomrall', 'tfrito', 'ensal', 'ceb']);
/** La semana en curso dentro del optimizador: sumas incrementales para evaluar cada cambio muy rápido. */
class Week {
  x: Cand[][]; dn: number[][]; dr: number[]; mic: number[]; cost = 0; cnt: Record<string, number> = {}; varSum = 0;
  use: Record<string, number[]> = {}; pids: string[]; pinfo: Record<string, { have: number; last: number; urg: number }> = {};
  R: number[]; Wt: number[]; dayT: number[];
  /** Compra real: cantidad usada de cada ingrediente en la semana y lo que costaría comprarlo en envases enteros. */
  qty: Record<string, number> = {}; buy = 0; pk: Record<string, { q: number; p: number; have: number } | null> = {};
  /** Días ya pasados de la semana: no se compran (no cuentan para el precio). */
  past: number;
  constructor(public s: Settings, public ctx: Ctx) {
    this.past = pastDays(ctx.w, ctx.today);
    this.x = Array.from({ length: 7 }, () => Array(NS).fill(EMPTY));
    this.dn = Array.from({ length: 7 }, () => [0, 0, 0, 0, 0]); this.dr = Array(7).fill(0); this.mic = MN.map(() => 0);
    this.R = refs(ctx.sex, s.f); this.Wt = weights(s.mood, s.cold);
    const wP = s.pantryFirst ? 1.2 : s.pantryUse ? 0.35 : 0;
    this.pids = wP ? Object.keys(ctx.pantry).filter((id) => ctx.pantry[id].q > 0 && ING[id]) : [];
    this.pids.forEach((id) => {
      const it = ctx.pantry[id], exp = expiry(id, it), left = exp ? days(ctx.today, exp) : 999;
      const urg = left <= s.pantryDays ? 1 + (s.pantryDays - Math.max(0, left)) / Math.max(1, s.pantryDays) : 0.25;
      this.pinfo[id] = { have: it.q, last: exp ? days(ctx.w, exp) : 99, urg: urg * wP };
      this.use[id] = Array(7).fill(0);
    });
    this.dayT = Array(7).fill(0);
  }
  /** Precio de comprar q de un ingrediente: envases enteros, descontando lo que ya hay en la despensa (igual que shop()). */
  private packCost(g: string, q: number) {
    let P = this.pk[g];
    if (P === undefined) { const pr = prod(this.s.store, g, this.ctx.conf); P = this.pk[g] = pr ? { q: pr.q, p: priceOf(this.ctx.conf, this.s.store, g), have: this.ctx.only ? this.ctx.pantry[g]?.q || 0 : stock(this.ctx.pantry[g], this.ctx.w) } : null; }
    if (!P || q <= 1e-9) return 0;
    const need = q - P.have; return need <= 1e-9 ? 0 : Math.ceil(need / P.q - 1e-9) * P.p;
  }
  apply(i: number, k: number, c: Cand, sign: 1 | -1) {
    if (c.j < 0) return;
    const d = this.dn[i]; for (let n = 0; n < 5; n++) d[n] += sign * c.nut[n];
    for (let n = 0; n < this.mic.length; n++) this.mic[n] += sign * c.mic[n];
    this.cost += sign * c.cost; if (c.r) this.dr[i] += sign;
    const key = c.key, n0 = this.cnt[key] || 0;
    if (sign > 0) { this.varSum += 0.12 * n0; this.cnt[key] = n0 + 1; } else { this.cnt[key] = n0 - 1; this.varSum -= 0.12 * (n0 - 1); }
    for (const [g, q] of c.ings) {
      if (this.use[g]) this.use[g][i] += sign * q;
      if (i < this.past || (this.ctx.only && this.ctx.done?.[`${i}-${k}`])) continue;   // pasado o ya cocinado: ya no se compra
      const q0 = this.qty[g] || 0, q1 = Math.max(0, q0 + sign * q); this.qty[g] = q1;
      this.buy += this.packCost(g, q1) - this.packCost(g, q0);
    }
  }
  set(i: number, k: number, c: Cand) { this.apply(i, k, this.x[i][k], -1); this.x[i][k] = c; this.apply(i, k, c, 1); this.dayT[i] = this.day(i); }
  day(i: number) {
    const s = this.s, n = this.dn[i], x = this.x[i];
    let v = Math.abs(n[0] - s.k) / s.k + Math.max(0, s.p - n[1]) / s.p + (0.6 * Math.max(0, s.f - n[4])) / s.f + (0.4 * Math.max(0, n[1] - 2 * s.p)) / s.p;
    if (s.cold && this.dr[i] <= 0) v += 0.3;
    if (x[3].j >= 0 && x[3].j === x[4].j) v += 0.5; // misma merienda y extra el mismo día
    // variedad dentro del día: repetir un ingrediente (huevo, pan, pollo…) en varios platos penaliza un poco
    for (const c of x) for (const g of c.gi) if (++SEEN[g] > 1) v += 0.06;
    for (const c of x) for (const g of c.gi) SEEN[g] = 0;
    if (s.maxMin >= 20) v -= (s.maxMin >= 30 ? 0.08 : 0.05) * ((x[1].min + x[2].min) / s.maxMin);
    return v;
  }
  week() {
    // Coste: lo que de verdad pagas en la compra (envases enteros), no la parte proporcional de cada plato.
    let v = this.varSum + 0.004 * this.buy;
    // Compra hecha: tener que comprar algo más pesa muchísimo (solo pasa si con lo que hay no se puede).
    if (this.ctx.only) v += 0.5 * this.buy;
    for (let n = 1; n < this.mic.length; n++) v += this.Wt[n] * Math.max(0, 1 - this.mic[n] / (7 * this.R[n]));
    // Presupuesto semanal; si ya han pasado días, la parte proporcional de los que quedan.
    const bud = this.s.budget * (7 - this.past) / 7;
    if (bud > 0) { const over = Math.max(0, this.buy - bud) / bud; v += 12 * over + 30 * over * over; }
    for (const id of this.pids) {
      const p = this.pinfo[id]; let used = 0;
      for (let d = 0; d < 7 && d <= p.last; d++) used += this.use[id][d];
      v -= p.urg * Math.min(1, Math.max(0, used) / p.have);
    }
    return v;
  }
  total() { return this.dayT.reduce((a, b) => a + b, 0) + this.week(); }
  /** Valor total si la franja (i, k) pasara a ser c (sin dejar el cambio hecho). */
  tryMove(i: number, k: number, c: Cand) {
    // Se calcula el día una sola vez (es lo más costoso) y se deshace el cambio sin recalcularlo.
    const old = this.x[i][k], oldT = this.dayT[i];
    this.apply(i, k, old, -1); this.x[i][k] = c; this.apply(i, k, c, 1);
    const t = this.total() - oldT + this.day(i);
    this.apply(i, k, c, -1); this.x[i][k] = old; this.apply(i, k, old, 1);
    return t;
  }
}

/** Franja que no se toca: día pasado (o anterior a «fixed») o plato fijado a mano. */
const locked = (p: Plan | undefined, i: number, k: number, fixed = 0) => i < fixed || !!p?.l?.[`${i}-${k}`] || !!p?.done?.[`${i}-${k}`];
/** Opciones del optimizador en una franja: un plato cocinado no se toca; en uno fijado, solo otras raciones del mismo plato. */
const optsAt = (C: Cand[][], p: Plan | undefined, i: number, k: number, cur: Cand) => (p?.done?.[`${i}-${k}`] ? [] : p?.l?.[`${i}-${k}`] ? C[k].filter((c) => c.j === cur.j) : C[k]);
function build(s: Settings, ctx: Ctx, C: Cand[][], p: Plan | undefined, rnd: () => number, fixed = 0) {
  const W = new Week(s, ctx);
  for (let i = 0; i < 7; i++) for (let k = 0; k < NS; k++) {
    const v = p ? (p.sel[i]?.[k] ?? -1) : -1, f = p ? (p.q[i]?.[k] || 1) : 1;
    let c = C[k].find((x) => x.j === v && x.f === f) || (v >= 0 && active(s)[k] && locked(p, i, k, fixed) && (i < fixed || allowed(s, k, v, false)) ? cand(k, v, f, s, ctx.conf) : undefined);
    if (!c && v < 0 && p && active(s)[k] && (i < fixed || p.l?.[`${i}-${k}`])) c = EMPTY;   // día pasado o la quitaste tú: sigue sin ella
    if (!c) c = C[k].filter((x) => x.j >= 0 && x.f === 1)[Math.floor(rnd() * C[k].filter((x) => x.j >= 0 && x.f === 1).length)] || C[k][0];
    W.set(i, k, c);
  }
  return W;
}
/** Mejora la semana con cambios de un plato o ración cada vez, hasta que ningún cambio mejore el total. */
function climb(W: Week, C: Cand[][], p: Plan | undefined, rnd: () => number, passes = 8, fixed = 0) {
  const spots: [number, number][] = []; for (let i = fixed; i < 7; i++) for (let k = 0; k < NS; k++) if (C[k].length > 1) spots.push([i, k]);
  for (let pass = 0; pass < passes; pass++) {
    let better = false;
    for (let a = spots.length - 1; a > 0; a--) { const b = Math.floor(rnd() * (a + 1)); [spots[a], spots[b]] = [spots[b], spots[a]]; }
    for (const [i, k] of spots) {
      const cur = W.total(); let best = W.x[i][k], bt = cur;
      for (const c of optsAt(C, p, i, k, W.x[i][k])) { if (c === W.x[i][k]) continue; const t = W.tryMove(i, k, c); if (t < bt - 1e-9) { bt = t; best = c; } }
      if (best !== W.x[i][k]) { W.set(i, k, best); better = true; }
    }
    if (!better) break;
  }
}
const toPlan = (W: Week, base?: Plan): Plan => ({ ...(base || { c: {}, p: {} }), sel: W.x.map((d) => d.map((c) => c.j)), q: W.x.map((d) => d.map((c) => c.f)) });
const seeded = (seed = 1) => { let x = seed; return () => (x = (x * 16807) % 2147483647) / 2147483647; };
export const ctxOf = (st: Pick<State, 'conf' | 'pantry' | 'perfil'> & { plans?: State['plans'] }, w: string, today = ymd(new Date())): Ctx =>
  ({ conf: st.conf, pantry: st.pantry || {}, w, today, sex: st.perfil?.sex || 'm', only: !!st.plans?.[w]?.bought, done: st.plans?.[w]?.done });

/** Genera una semana nueva optimizada para tus ajustes. */
export function generate(s: Settings, rnd: () => number = Math.random, ctx: Ctx = { conf: {}, pantry: {}, w: ymd(monday(new Date())), today: ymd(new Date()), sex: 'm' }): Plan {
  // Con presupuesto se prueban 3 puntos de partida y se queda la mejor semana (cuesta poco y evita quedarse por encima).
  const C = candidates(s, ctx.conf, ctx); let best: Week | null = null;
  for (let n = 0; n < (s.budget > 0 ? 4 : 1); n++) { const W = build(s, ctx, C, undefined, rnd); climb(W, C, undefined, rnd); if (!best || W.total() < best.total()) best = W; }
  return { ...toPlan(best!), c: {}, p: {}, l: {}, done: {} };
}
/** Días de la semana w que ya han pasado (no se tocan al reajustar ni al generar). */
export const pastDays = (w: string, today: string) => Math.max(0, Math.min(7, days(w, today)));
/** Reajusta una semana existente tras cambiar un ajuste (presupuesto, tiempo, dieta, supermercado…).
 *  Respeta los platos fijados a mano y los días que ya han pasado. */
/** from: no tocar los días anteriores a este (por ejemplo, al elegir un plato, solo se reajustan los días siguientes). */
export function tune(p: Plan, s: Settings, ctx: Ctx, rnd: () => number = seeded(7), fresh = false, from = 0): Plan {
  const fixed = Math.max(from, pastDays(ctx.w, ctx.today)), C = candidates(s, ctx.conf, ctx);
  // fresh: los platos no fijados de hoy en adelante se vuelven a elegir desde cero (por ejemplo, al permitir
  // otra vez el pescado, para que de verdad aparezca y no se quede el menú anterior porque ya era «bueno»).
  const start = fresh ? { ...p, sel: p.sel.map((d, i) => d.map((v, k) => (i < fixed || p.l?.[`${i}-${k}`] || p.done?.[`${i}-${k}`] ? v : -9))) } : p;
  const W = build(s, ctx, C, start, rnd, fixed);
  climb(W, C, p, rnd, 8, fixed);
  return toPlan(W, p);
}
/**
 * Menú dinámico: tras un cambio en el día (elegir, cocinar, la despensa…), reajusta el resto de la semana como si
 * aplicaras tú los consejos de cada día. No toca lo fijado a mano, lo cocinado, los días pasados ni las comidas de
 * hoy que ya tocan o han pasado (solo las que aún quedan por llegar). Con «Menú fijo» en Ajustes no cambia nada.
 */
export function autoTune(p: Plan, s: Settings, ctx: Ctx, minuteOfDay = new Date().getHours() * 60 + new Date().getMinutes(), free = '', day = -1): Plan {
  if (s.fixedMenu && !free && day < 0) return p;
  const ti = pastDays(ctx.w, ctx.today); if (ti >= 7) return p;
  const isToday = ymd(add(parse(ctx.w), ti)) === ctx.today, hold: Record<string, boolean> = {};
  if (s.fixedMenu) for (let i = ti; i < 7; i++) for (let k = 0; k < NS; k++) hold[`${i}-${k}`] = true;   // menú fijo: solo se rellena «free»
  else if (isToday) for (let k = 0; k < NS; k++) if (slotTime(s, k) - 60 <= minuteOfDay || p.done?.[`${ti}-${k}`]) hold[`${ti}-${k}`] = true;
  // Con menú fijo, al quitar o volver a poner una merienda, ese día puede cambiar raciones (no platos) para que cuadre.
  const fd = free ? +free.split('-')[0] : day, dish: Record<string, boolean> = {};
  if (s.fixedMenu && fd >= 0) for (let k = 0; k < NS; k++) { const key = `${fd}-${k}`; if (key !== free && hold[key] && !p.done?.[key] && !(isToday && fd === ti && slotTime(s, k) - 60 <= minuteOfDay)) { delete hold[key]; dish[key] = true; } }
  delete hold[free];
  const l = { ...p.l }; delete l[free];
  const out = tune({ ...p, l: { ...l, ...hold, ...dish } }, s, ctx, seeded(11), false, ti);
  out.l = l; out.sel = out.sel.map((d) => d.slice()); out.q = out.q.map((d) => d.slice());
  Object.keys(hold).forEach((key) => { const [i, k] = key.split('-').map(Number); out.sel[i][k] = p.sel[i][k]; out.q[i][k] = p.q[i][k]; });
  return out;
}
/** Franjas («día-franja») cuyo plato es distinto entre dos versiones de una semana. */
export const diffKeys = (a: Plan, b: Plan) => a.sel.flatMap((d, i) => d.map((v, k) => (v !== b.sel[i]?.[k] && (b.sel[i]?.[k] ?? -1) >= 0 ? `${i}-${k}` : '')).filter(Boolean));
/** Platos distintos entre dos versiones de una semana. */
export const changed = (a: Plan, b: Plan) => a.sel.reduce((n, d, i) => n + d.filter((v, k) => v !== b.sel[i]?.[k]).length, 0);

/** Una comida «toca ahora» desde 1 hora antes de su hora hasta 1 hora y media después. */
export const isNow = (s: Settings, k: number, minuteOfDay: number) => minuteOfDay >= s.times[k] - 60 && minuteOfDay <= s.times[k] + 90;
/**
 * Franja que enseña «Ahora toca»: la que está en su ventana de tiempo (ver isNow) y aún no has cocinado;
 * si no hay ninguna, la siguiente del día. Devuelve -1 si ya no queda ninguna hoy.
 */
export function nextSlot(s: Settings, d: number[], done: (k: number) => boolean, minuteOfDay: number) {
  const ks = ORDER.filter((k) => k !== 5 && active(s)[k] && d[k] >= 0 && !done(k)).sort((a, b) => s.times[a] - s.times[b]);
  const cur = ks.filter((k) => isNow(s, k, minuteOfDay)).pop();
  return cur ?? ks.find((k) => s.times[k] > minuteOfDay) ?? -1;
}
/** «Algo más fácil»: el plato permitido más rápido para esa franja (prefiere lo que hay en la despensa). */
export function easiest(s: Settings, k: number, cur: number, pantry: Pantry, only = false): number {
  const now = cur >= 0 && lst(k)[cur] ? mins(lst(k)[cur]) : 99, base = cur >= 0 && lst(k)[cur] ? lst(k)[cur][4][0] : s.k / 4;
  const opts = lst(k).map((m, j) => ({ m, j })).filter(({ m, j }) => j !== cur && allowed(s, k, j, false) && mins(m) < now && (!only || doable(m, pantry)));
  if (!opts.length) return cur;
  const val = ({ m }: { m: Meal }) => mins(m) * 2 + Math.abs(m[4][0] - base) / 60 - m[3].filter(([g]) => pantry[g]?.q > 0).length * 1.5;
  return opts.sort((a, b) => val(a) - val(b))[0].j;
}
/** Valoración completa de la semana (menor es mejor). Útil para tests y para comparar. */
export function weekScore(p: Plan, s: Settings, ctx: Ctx) { const C = candidates(s, ctx.conf, ctx); return build(s, ctx, C, p, seeded(1)).total(); }

/* ---------- consejo del día ---------- */
export type Advice = { k: number; j: number; f: number; i: number; text: string };
/** El mejor cambio de un plato o ración en el día i, si mejora la semana de forma clara. */
/**
 * Franjas de un día que aún tiene sentido cambiar: no cocinadas y, si es hoy, como mucho una comida por detrás de la
 * que toca ahora (a la hora de la merienda aún te da tiempo a la comida; casi a la hora de la cena, ya no).
 * La bebida va con la comida a la que está unida (Ajustes → La bebida va con). Los días pasados no se cambian.
 */
export function openSlots(p: Plan, i: number, s: Settings, ctx: Pick<Ctx, 'w' | 'today'>, minuteOfDay: number): boolean[] {
  const day = ymd(add(parse(ctx.w), i)), ok = Array(NS).fill(false);
  if (day < ctx.today) return ok;
  const ks = [0, 1, 2, 3, 4].filter((k) => active(s)[k]).sort((a, b) => s.times[a] - s.times[b]);
  let first = 0;
  if (day === ctx.today) { let cur = -1; ks.forEach((k, n) => { if (s.times[k] - 60 <= minuteOfDay) cur = n; }); first = Math.max(0, cur - 1); }
  const t0 = ks[first] != null ? s.times[ks[first]] : 0;
  ks.forEach((k, n) => (ok[k] = n >= first));
  ok[5] = active(s)[5] && slotTime(s, 5) >= t0;
  return ok.map((v, k) => v && !p.done?.[`${i}-${k}`]);
}
export function advice(p: Plan, i: number, s: Settings, ctx: Ctx, minuteOfDay = new Date().getHours() * 60 + new Date().getMinutes()): Advice | null {
  const open = openSlots(p, i, s, ctx, minuteOfDay); if (!open.some(Boolean)) return null;
  const C = candidates(s, ctx.conf, ctx), W = build(s, ctx, C, p, seeded(3)), base = W.total();
  let best: { k: number; c: Cand; t: number } | null = null;
  for (let k = 0; k < NS; k++) {
    if (!open[k]) continue;
    for (const c of optsAt(C, p, i, k, W.x[i][k])) { if (c === W.x[i][k] || (c.j === W.x[i][k].j && c.f === W.x[i][k].f)) continue; const t = W.tryMove(i, k, c); if (t < base - 0.03 && (!best || t < best.t)) best = { k, c, t }; }
  }
  if (!best) return null;
  const { k, c } = best, old = W.x[i][k], a = W.dn[i], dk = c.nut[0] - old.nut[0], dp = c.nut[1] - old.nut[1];
  const sg = (x: number) => `${x >= 0 ? '+' : ''}${Math.round(x)}`;
  const R = W.R, gain = MN.map((_, n) => (c.mic[n] - old.mic[n]) / R[n]).map((g, n) => [g, n]).filter(([g, n]) => n > 0 && g > 0.15).sort((x, y) => y[0] - x[0])[0];
  const extra = gain ? `, más ${MN[gain[1]].n.toLowerCase()}` : '';
  const nm = c.j < 0 ? '' : lst(k)[c.j][0];
  const text = (c.j < 0 ? `Quita el ${SLN[k].toLowerCase()}` : c.j === old.j ? `Ración de ${SLN[k].toLowerCase()} ×${String(c.f).replace('.', ',')}` : k === 4 && old.j < 0 ? `Añade ${nm}` : `${SLN[k]}: ${nm}`) + ` (${sg(dk)} kcal, ${sg(dp)} g prot.${extra})`;
  void a;
  return { k, j: c.j, f: c.f, i, text };
}

/* ---------- resumen semanal ---------- */
/** Cobertura semanal de cada micronutriente (1 = 100 % del objetivo), coste y nutrientes que no llegan al 80 %. */
export function weekStats(p: Plan, s: Settings, ctx: Ctx) {
  const R = refs(ctx.sex, s.f), tot = MN.map(() => 0);
  let cost = 0;
  p.sel.forEach((d, i) => dayMeals(mask(s, d), p.q[i]).forEach((m) => { if (!m) return; micro(m).forEach((x, n) => (tot[n] += x)); cost += mealCost(m, s.store, ctx.conf); }));
  const cov = tot.map((x, n) => x / (7 * R[n]));
  return { cov, tot, cost, low: MN.filter((_, n) => n > 0 && cov[n] < 0.8).map((x) => x.n) };
}

/* ---------- compra ---------- */
export type Line = { id: string; n: number; q: number; have: number; price: number; base: number; done: boolean; v: number; st: 0 | 1; conf?: string; sec: string; from?: string };
/** Ingrediente que de verdad se usa: el sustituto elegido para esa semana, si lo hay, con su cantidad equivalente. */
/**
 * Nombre del plato con los sustitutos de la semana: si cambias un ingrediente, el nombre cambia con él.
 * «Bebida de soja al cacao» con leche en vez de soja → «Leche semidesnatada al cacao»; «Porridge de soja» → «Porridge de leche».
 * Busca en el nombre el ingrediente entero («bebida de soja») o, si no está, su palabra principal («soja»).
 * Con `todas`, cambia todas las veces que sale (para los pasos de la preparación: «Calienta la bebida de soja…»).
 */
const STOP = new Set(['de', 'del', 'con', 'en', 'al', 'a', 'la', 'el', 'y', 'sin', 'para', 'tipo']);
export function dishName(name: string, p?: Plan, items?: [string, number][], todas = false): string {
  if (!p?.sub) return name;
  let out = name;
  for (const [g, to] of Object.entries(p.sub)) {
    if (!ING[g] || !ING[to] || (items && !items.some(([x]) => x === g))) continue;
    const full = ING[g].n.toLowerCase().replace(/\s*\(.*\)/, '').split(',')[0].trim(), nuevo = ING[to].n.toLowerCase().replace(/\s*\(.*\)/, '').split(',')[0].trim();
    const words = full.split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w));
    const esc = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Una palabra suelta vale en singular o plural («plátanos» encuentra «plátano»).
    const tryRe = (phrase: string, by: string, una = false) => {
      const pat = una ? esc(phrase.replace(/(es|s)$/, '')) + '(?:es|s)?' : esc(phrase);
      const re = new RegExp(`(^|[^\\p{L}])(${pat})(?=$|[^\\p{L}])`, todas ? 'giu' : 'iu');
      if (!out.match(re)) return false;
      out = out.replace(re, (_m, pre: string, hit: string) => pre + (hit[0] === hit[0].toUpperCase() ? by[0].toUpperCase() + by.slice(1) : by)); return true;
    };
    // 1) el nombre entero; 2) la última palabra con sentido («soja» de «bebida de soja»); 3) cualquier otra palabra
    if (tryRe(full, nuevo)) continue;
    const corto = nuevo.split(/\s+/).find((w) => w.length > 2 && !STOP.has(w)) || nuevo;
    for (const w of [...words].reverse()) if (tryRe(w, corto, true)) break;
  }
  return out;
}
/** Los pasos de la preparación (y las notas) con los sustitutos de la semana. */
export const subText = (text: string, p?: Plan, items?: [string, number][]) => dishName(text, p, items, true);
export const subbed = (p: Plan | undefined, g: string, q: number): [string, number] => { const to = p?.sub?.[g]; return to && ING[to] ? [to, subQty(g, to, q)] : [g, q]; };
/**
 * Lista de la compra de la semana w: lo que ya hay en la despensa (de antes de esa semana) no se compra, y de la
 * semana en curso solo cuentan los días que quedan (los que ya han pasado no hace falta comprarlos).
 */
export function shop(p: Plan, s: Settings, conf: State['conf'] = {}, pantry: Pantry = {}, w = '', today = ymd(new Date())) {
  const t: Record<string, number> = {}, from = w ? pastDays(w, today) : 0;
  p.sel.forEach((d, i) => { if (i >= from) dayMeals(mask(s, d), p.q[i]).forEach((m) => m && m[3].forEach(([g0, q0]) => { const [g, q] = subbed(p, g0, q0); t[g] = (t[g] || 0) + q; })); });
  const r: Record<'C' | 'F' | 'E', Line[]> = { C: [], F: [], E: [] };
  let sum = 0, done = 0, all = 0, doneSum = 0; const byStore = [0, 0];
  Object.keys(t).forEach((id) => {
    const G = ING[id], st = storeOf(s.store, id, conf); if (st < 0) return;
    const P = ING[id][st ? 'D' : 'M']!, have = stock(pantry[id], w), need = Math.max(0, t[id] - have);
    if (need <= 1e-9 && !p.c[id]) return;
    const n = Math.max(1, Math.ceil(need / P.q - 1e-9)), price = conf[`${st}:${id}`]?.p ?? P.p, dn = !!p.c[id];
    sum += n * price; byStore[st] += n * price; all++; if (dn) { done++; doneSum += n * price; }
    r[G.s].push({ id, n, q: t[id], have, price, base: P.p, done: dn, v: P.v, st: st as 0 | 1, conf: conf[`${st}:${id}`]?.d, sec: sectionOf(id), from: Object.keys(p.sub || {}).find((k) => p.sub![k] === id) });
  });
  (Object.keys(r) as ('C' | 'F' | 'E')[]).forEach((z) => r[z].sort((a, b) => a.st - b.st || prod(s.store, a.id, conf)!.n.localeCompare(prod(s.store, b.id, conf)!.n)));
  // Por secciones del súper (fruta y verdura, lácteos…), en el orden de SECTIONS.
  const sec = SECTIONS.map(([k, n]) => ({ k, n, lines: Object.values(r).flat().filter((l) => l.sec === k) })).filter((x) => x.lines.length);
  sec.forEach((x) => x.lines.sort((a, b) => a.st - b.st || prod(s.store, a.id, conf)!.n.localeCompare(prod(s.store, b.id, conf)!.n)));
  return { r, sum, all, done, doneSum, byStore, sec, days: 7 - from };
}
/** Margen del presupuesto: si te pasas por poco (menos de la mitad del camino a 5 € más), no se avisa. */
export const budgetFlex = (b: number) => Math.max(2.5, b * 0.04);

/* ---------- caducidades del menú ---------- */
const CONG = ['pollo', 'hamb', 'jamon', 'pavo', 'queso', 'pan', 'champ', 'tort', 'pita', 'salmahu', 'tofu'];
export function caduca(p: Plan, s: Settings, W: Date) {
  const u: Record<string, number[]> = {}; const out: { sev: number; name: string; text: string }[] = [];
  p.sel.forEach((d, i) => dayMeals(mask(s, d), p.q[i]).forEach((m) => m && m[3].forEach(([g]) => (u[g] = u[g] || []).push(i))));
  Object.keys(u).forEach((g) => {
    const G = ING[g]; if (G.life >= 30) return;
    const f = Math.min(...u[g]), l = Math.max(...u[g]), e = (G.open ? f : s.buy) + G.life;
    if (l > e) out.push({ sev: l - e, name: prod(s.store, g)?.n || G.n, text: `Aguanta hasta el ${fmt(add(W, e))} y lo usas hasta el ${DAYS[l]}. ` + (CONG.includes(g) ? 'Congela lo que uses después.' : 'Mueve esos platos antes o compra menos.') });
  });
  return out.sort((a, b) => b.sev - a.sev);
}

/* ---------- perfil: calorías y macros ---------- */
/**
 * Calorías (Mifflin-St Jeor × actividad) y reparto de macros. Cada dato cambia algo:
 *  · edad: el metabolismo baja con los años; desde los 65 la proteína sube a 1,2 g/kg (PROT-AGE, 2013) y el déficit se limita al 10 %;
 *  · altura y peso: metabolismo; con obesidad (IMC > 30) la proteína se calcula sobre el peso ajustado, no sobre el real;
 *  · actividad: factor de energía y proteína (1,0 g/kg sedentaria … 1,6 g/kg alta; ISSN recomienda 1,4–2,0 g/kg si entrenas);
 *  · objetivo «Bajar»: déficit del 15 % con +0,2 g/kg de proteína para no perder músculo; nunca en menores de edad ni con bajo peso;
 *  · grasa: 30 % de las calorías (EFSA: 20–35 %); hidratos: el resto (EFSA: 45–60 %); fibra: 14 g por 1000 kcal y como mínimo 25 g en adultos (EFSA).
 * Cambia aquí los números si quieres otro reparto.
 */
export function calc(q: Perfil) {
  if (!(q.age > 0 && q.h > 0 && q.w > 0)) return null;
  const bmr = 10 * q.w + 6.25 * q.h - 5 * q.age + (q.sex === 'm' ? 5 : -161), h2 = (q.h / 100) ** 2, bmi = q.w / h2, tdee = bmr * q.act;
  const minor = q.age < 18, senior = q.age >= 65, low = q.goal < 0 && bmi < 18.5;
  const g = q.goal < 0 ? (minor || low ? 0 : Math.max(q.goal, senior ? -0.1 : -1)) : q.goal;
  const kc = Math.round(Math.max(bmr, tdee * (1 + g)) / 10) * 10;
  const ref = bmi > 30 ? 25 * h2 + 0.25 * (q.w - 25 * h2) : q.w;
  const gkg = Math.min(2, (senior ? 1.2 : q.act >= 1.725 ? 1.6 : q.act >= 1.55 ? 1.4 : q.act >= 1.375 ? 1.2 : 1.0) + (g < 0 ? 0.2 : 0));
  const p = Math.round(gkg * ref), fat = Math.round((kc * 0.3) / 9), carb = Math.max(0, Math.round((kc - 4 * p - 9 * fat) / 4));
  const f = Math.max(minor ? 0 : 25, Math.round((kc / 1000) * 14));
  return { bmr: Math.round(bmr), tdee: Math.round(tdee), kc, p, f, fat, carb, gkg, bmi, low, minor };
}

/* ---------- plan nuevo ---------- */
export const newPlan = (sel: number[][] = DEF): Plan => ({ sel: sel.map((d) => pad(d.slice(), -1)), q: sel.map(() => [1, 1, 1, 1, 1, 1]), c: {}, p: {}, l: {}, done: {} });
/** Igualar el tamaño de un plan guardado con una versión anterior (5 franjas) al actual (6 franjas). */
export const padPlan = (p: any): Plan => ({ ...p, sel: (p.sel || DEF).map((d: number[]) => pad(d, -1)), q: (p.q || p.sel.map(() => [])).map((d: number[]) => pad(d, 1)), c: p.c || {}, p: p.p || {}, l: p.l || {}, done: p.done || {} });

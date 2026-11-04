// Cada pantalla se escribe en OpenUI Lang a partir del estado. Después el Renderer de library.tsx la dibuja con componentes nativos.
import { ING, fotoUrl } from './data';
import { ACCENTS, DENS, PALETA, SHOWN, TEXT } from './theme';
import { MN, refs } from './nutri';
import { SUBS, subQty } from './subs';
import { doneOf } from './cook';
import { antes, detalle } from './cocina';
import { NEWS, VERSION } from './news';
import { handle, hasPlus, mergeState } from './controller';
import {
  DAYS, MONTHS, ORDER, SLN, STORES, State, active, add, advice, allowed, allowedIng, budgetFlex, doable, spare, priceOf, subbed, avail, calc, caduca, ctxOf, dayMeals, days, expiry,
  dishName, subText, fmt, fmtTime, isNow, slotTime, lst, mask, mealCost, micro, mins, monday, nextSlot, nut, pantrySoon, parse, prep, prod, shop, storeOf, weekStats, ymd, generate,
} from './logic';

export type UI = {
  tab: 'plan' | 'mes' | 'compra' | 'desp' | 'tu' | 'aj' | 'adv'; w: string; day: number; month: string;
  /** Solo en la presentación: hora fija (minutos desde las 00:00) para el ejemplo. */
  clock?: number;
  sheet: null | { kind: 'pick' | 'recipe' | 'add' | 'breathe' | 'swap' | 'photo' | 'news' | 'wipe' | 'privacy' | 'plus' | 'theme'; k: number; from?: string }; intro: number;
  /** Temporizador en marcha (sigue aunque cierres la receta). */
  timer: null | { end: number; sec: number; k: number; day: number; w: string };
  /** Platos que acaban de cambiar al reajustar (por semana), para marcarlos como «Cambiado». */
  fresh?: Record<string, string[]>;
  /** Creador de temas (Nevú Plus): los dos colores que se están eligiendo. */
  draft?: [string, string];
  /** Estado de los permisos del móvil (lo rellena App.tsx; null = no se sabe). */
  perm?: { notif?: boolean | null };
};
const q = (x: any) => JSON.stringify(x), r = Math.round;
const eur = (n: number) => n.toFixed(2).replace('.', ',') + ' €';
const num = (n: number) => String(r(n * 10) / 10).replace('.', ',');
class B { lines: string[] = []; n = 0;
  add(call: string) { const id = 'n' + this.n++; this.lines.push(`${id} = ${call}`); return id; }
  list(ids: string[]) { return '[' + ids.join(', ') + ']'; }
  root(mode: string, kids: string[], extra = '') { return [`root = Screen(${this.list(kids)}, ${q(mode)}${extra})`, ...this.lines].join('\n'); } }
const ids = (m: any) => m[3].map((x: any) => x[0]);
const pill = (b: B, label: string, on: boolean, a: string, icon?: string) => b.add(`Pill(${q(label)}, ${on}, ${a}${icon ? ', ' + q(icon) : ''})`);
const row = (b: B, kids: string[], gap = 8, wrap = true) => b.add(`Stack(${b.list(kids)}, "row", ${gap}, ${wrap})`);
const photo = (st: State, id: string) => { const P = prod(st.set.store, id, st.conf); return P ? fotoUrl(P, 200) : ''; };
const unit = (id: string, x: number) => { const u = ING[id].u; return u === 'g' || u === 'ml' ? `${r(x)} ${u}` : `${num(x)} ${u}`; };
const storeTag = (st: State, id: string) => (st.set.store === 2 ? ['Mercadona', 'Día'][storeOf(2, id, st.conf)] || '' : '');

/* ---------- barra inferior ---------- */
export function nav(ui: UI) {
  const b = new B();
  const it = [['plan', 'plan', 'Plan'], ['mes', 'mes', 'Mes'], ['compra', 'compra', 'Compra'], ['desp', 'desp', 'Despensa'], ['tu', 'tu', 'Tú'], ['aj', 'aj', 'Ajustes']]
    .map(([t, i, l]) => b.add(`NavItem(${q(i)}, ${q(l)}, ${ui.tab === t || (t === 'aj' && ui.tab === 'adv')}, @Go(${q(t)}))`));
  return b.root('nav', it);
}

/* ---------- tarjeta de micronutrientes de la semana ---------- */
function microCard(b: B, st: State, w: string, title = 'Vitaminas y minerales de la semana') {
  const p = st.plans[w]; if (!p) return [];
  const ws = weekStats(p, st.set, ctxOf(st, w));
  const items = MN.map((m, i) => [m.n, Math.round(ws.cov[i] * 100)] as [string, number]).filter((_, i) => i > 0);
  const out = [b.add(`Micro(${q(title)}, ${q(items)})`)];
  if (ws.low.length) {
    const tips: string[] = [];
    if (ws.low.includes('Vitamina D')) tips.push('la vitamina D viene sobre todo del sol, no de la comida');
    if (ws.low.some((x) => x.startsWith('Omega')) && st.set.ex.fish) tips.push('el omega-3 sale casi solo del pescado: si lo comes, quita «Sin pescado ni marisco» en Ajustes');
    out.push(b.add(`Note(${q('A reforzar esta semana: ' + ws.low.join(', ') + '. ' + (tips.length ? 'Es normal: ' + tips.join('; ') + '.' : 'No pasa nada por una semana.'))})`));
  }
  return out;
}

/* ---------- Plan: día, calorías y platos ---------- */
const realMin = () => { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); };
// La presentación fija la hora (ui.clock) para que el ejemplo sea siempre igual.
let clock: number | undefined;
const nowMin = () => clock ?? realMin();
const DAYL = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
/** Saludo según la hora del día. */
export const greet = (h = new Date().getHours()) => (h >= 6 && h < 13 ? 'Buenos días' : h >= 13 && h < 21 ? 'Buenas tardes' : 'Buenas noches');
const calm = (b: B) => b.add(`Calm("Respira un minuto", "Una pausa guiada para soltar tensión", @Open("breathe", 0))`);
/** Tarjeta grande «Ahora toca»: el siguiente plato de hoy, con receta y una alternativa más fácil. */
function nowCard(b: B, st: State, ui: UI) {
  const p = st.plans[ui.w], s = st.set; if (!p) return null;
  const isToday = ui.w === ymd(monday(new Date())) && ui.day === (new Date().getDay() + 6) % 7; if (!isToday) return null;
  const d = mask(s, p.sel[ui.day]), k = nextSlot(s, d, (x) => !!p.done?.[`${ui.day}-${x}`], nowMin());
  if (k < 0) return b.add(`NowCard(-1, "Hoy ya está", "Has terminado las comidas de hoy. Descansa, mañana más.", ["fruta"], 0, null, null)`);
  const m = dayMeals(d, p.q[ui.day])[k]!, label = isNow(s, k, nowMin()) ? `Ahora toca · ${SLN[k]}` : `Lo siguiente · ${SLN[k]} a las ${fmtTime(slotTime(s, k))}`;
  return b.add(`NowCard(${k}, ${q(label)}, ${q(dishName(m[0], p, m[3]))}, ${q(ids(m))}, ${mins(m)}, @Open("recipe", ${k}), @Easy(${k}))`);
}
export function plan(st: State, ui: UI) {
  clock = ui.clock;
  const b = new B(), W = parse(ui.w), p = st.plans[ui.w], s = st.set, ctx = ctxOf(st, ui.w);
  const dt = add(W, ui.day);
  const head = b.add(`Head(${q(`${greet()} · ${MONTHS[dt.getMonth()]}`)}, ${q(`${DAYL[ui.day]} ${dt.getDate()}`)}, @Week(-1), @Today(), @Week(1))`);
  if (!p) {
    const e = b.add(`Empty("Una semana en blanco", "Te la preparo entera con un toque. Luego cambias lo que quieras.", ["pasta","tfrito","queso"], "Preparar mi semana", @Gen(), null, null, "Bol de macarrones con tomate")`);
    const prev = Object.keys(st.plans).some((k) => k < ui.w);
    return b.root('page', prev ? [head, e, b.add(`Btn("Copiar la semana anterior", @Pin(), "soft", "plan")`)] : [head, e]);
  }
  const d = mask(s, p.sel[ui.day]), qq = p.q[ui.day], ms = dayMeals(d, qq), n = nut(d, qq);
  const fr = ui.fresh?.[ui.w] || [];
  const days7 = row(b, p.sel.map((x, i) => b.add(`DayChip(${q(DAYS[i])}, ${add(W, i).getDate()}, ${s.simple ? 0 : Math.min(1, nut(mask(s, x), p.q[i])[0] / s.k).toFixed(2)}, ${i === ui.day}, @Day(${i}), ${fr.some((f) => f.startsWith(i + '-'))})`)), 6, false);
  const now = nowCard(b, st, ui);
  /* Modo sencillo: lo que toca ahora y la lista del día, sin cifras ni avisos. */
  // Tras actualizar la app: aviso pequeño con lo más importante (se cierra con la x o al ver las novedades).
  const news = st.intro && st.dev?.news !== VERSION ? [b.add(`News(${q(`Versión ${VERSION}`)}, ${q(NEWS[0].s)}, @News(true), @News(false), ${q(VERSION.split('.').slice(0, 2).join('.'))})`)] : [];
  if (s.simple) {
    const rows = ORDER.filter((k) => active(s)[k] && d[k] >= 0).map((k) => b.add(`SimpleRow(${k}, ${q(SLN[k] + ' · ' + fmtTime(slotTime(s, k)))}, ${q(dishName(ms[k]![0], p, ms[k]![3]))}, ${!!p.done?.[`${ui.day}-${k}`]}, @Open("recipe", ${k}), ${q(ids(ms[k]))})`));
    return b.root('page', [head, ...news, days7, ...(now ? [now] : []), b.add(`Section("Todo el día", "plan")`), b.add(`Card(${b.list(rows)})`), calm(b),
      b.add(`Btn("Ver más detalles", @Cfg("simple", false), "ghost", "spark")`)]);
  }
  // Con el menú dinámico los consejos ya se aplican solos (ver autoTune); el botón «Aplicar» sale solo con «Menú fijo».
  const a = s.fixedMenu ? advice(p, ui.day, s, ctx, nowMin()) : null;
  const seg = ORDER.map((k) => (d[k] < 0 ? 0 : r(ms[k]![4][0])));
  const minsDay = ms.reduce((t2, m) => t2 + (m ? mins(m) : 0), 0);
  const hero = b.add(`Hero(${q(`${DAYS[ui.day]} ${add(W, ui.day).getDate()}`)}, ${q(seg)}, ${r(n[0])}, ${s.k}, ${r(n[1])}, ${s.p}, ${r(n[4])}, ${s.f}, ${minsDay}, ${q(ORDER)})`);
  const left = now ? [now, hero] : [hero], more: string[] = [];
  if (a) left.push(b.add(`Tip(${q(a.text)}, "Aplicar", @Apply(${a.k}, ${a.j}, ${a.f}, ${ui.day}))`));
  // Poco en pantalla: el coste, las grasas y las vitaminas de la semana están en «Mes» y dentro de cada receta.
  if (s.cold) more.push(b.add(`Note("Modo resfriado: algo caliente o con vitamina C y zinc cada día. Bebe y descansa; si tienes fiebre alta, consulta a tu médico.")`));
  more.push(calm(b));
  if (perfilIncompleto(st)) more.unshift(b.add(`Nudge("Falta tu edad, altura y peso para calcular tu objetivo diario", @Go("tu"))`));
  const ord = ORDER.filter((k) => k !== 5).flatMap((k) => (k === (s.drinkWith ?? 4) ? [k, 5] : [k]));
  const pastDay = ymd(add(W, ui.day)) < ymd(new Date());
  const meals = ord.map((k) => {
    if (!active(s)[k]) return null;
    const v = d[k];
    // Quitada a mano: «Añadir» la vuelve a poner y la app elige cuál y reorganiza el día (luego puedes cambiarla).
    if (v < 0) return pastDay ? null : b.add(`Btn(${q('Añadir ' + SLN[k].toLowerCase())}, @Restore(${k}), "soft", "plus")`);
    const m = ms[k]!, bad = !avail(s.store, lst(k)[v]) ? `No disponible en ${STORES[s.store]}` : !allowed(s, k, v) ? 'No cumple tus ajustes de tiempo o dieta' : '';
    const done = !!p.done?.[`${ui.day}-${k}`], lockd = !!p.l?.[`${ui.day}-${k}`];
    const isNew = !!ui.fresh?.[ui.w]?.includes(`${ui.day}-${k}`);
    return b.add(`Meal(${k}, ${q(dishName(m[0], p, m[3]))}, ${q(ids(m))}, ${mins(m)}, ${r(m[4][0])}, ${r(m[4][1])}, ${qq[k] || 1}, ${q(bad)}, @Open("recipe", ${k}), @Portion(${k}), ${q(eur(mealCost(m, s.store, st.conf)))}, ${done}, ${lockd}, ${q(fmtTime(slotTime(s, k)))}, ${isNew}, @Lock(${k}))`);
  }).filter(Boolean) as string[];
  // Para la nevera: imprimir directamente (o guardar como PDF desde el diálogo de impresión) o compartir el PDF.
  more.push(b.add(`Fridge("Para la nevera", ${q(hasPlus(st) ? 'Imprime el menú o compártelo en PDF, con las recetas' : 'Nevú Plus: menú en PDF con recetas y tu semana en números')}, @Export("print"), @Export("pdf"))`));
  // Compra hecha: rehacer o cambiar platos usa lo que tienes en casa.
  if (p.bought) more.unshift(b.add(`Note("Compra hecha: si cambias un plato, te propongo recetas con lo que tienes en casa.")`));
  const acts = row(b, [b.add(`Btn(${q(p.bought ? 'Rehacer con lo que tengo' : 'Rehacer la semana')}, @Gen(), "soft", "wand")`)], 10, true);
  // Cols(a, b, c): en tablet, a y c a la izquierda y b a la derecha; en móvil, a, b y c seguidos (los platos antes que las cifras).
  return b.root('page', [head, ...news, days7, b.add(`Cols(${b.list(left)}, ${b.list(meals)}, ${b.list(more)})`), acts]);
}

/* ---------- Mes: calendario y estadísticas ---------- */
export function mes(st: State, ui: UI) {
  const b = new B(), s = st.set, M = parse(ui.month), y = M.getFullYear(), m = M.getMonth(), first = (new Date(y, m, 1).getDay() + 6) % 7, nd = new Date(y, m + 1, 0).getDate(), today = ymd(new Date());
  const head = b.add(`Head(${q(`Calendario · ${y}`)}, ${q(MONTHS[m][0].toUpperCase() + MONTHS[m].slice(1))}, @Month(-1), @Today(), @Month(1))`);
  const wd = b.add(`Wd(${q(DAYS)})`);
  const cells: string[] = []; for (let i = 0; i < first; i++) cells.push(b.add(`Cell(0, 0, false, false, [], @Go("mes"))`));
  for (let i = 1; i <= nd; i++) {
    const dt = new Date(y, m, i), pl = st.plans[ymd(monday(dt))], di = (dt.getDay() + 6) % 7, d = pl ? mask(s, pl.sel[di]) : null;
    const art = d && d[1] >= 0 ? ids(lst(1)[d[1]]) : [], fill = d ? Math.min(1, nut(d, pl.q[di])[0] / s.k) : 0, nm = d && d[1] >= 0 ? lst(1)[d[1]][0] : '';
    cells.push(b.add(`Cell(${i}, ${fill.toFixed(2)}, ${!!d}, ${ymd(dt) === today}, ${q(art.slice(0, 3))}, @Jump(${q(ymd(dt))}), ${q(nm)})`));
  }
  while (cells.length % 7) cells.push(b.add(`Cell(0, 0, false, false, [], @Go("mes"))`));
  const rows: string[] = []; for (let i = 0; i < cells.length; i += 7) rows.push(b.add(`Stack(${b.list(cells.slice(i, i + 7))}, "row", 4, false)`));
  const W = parse(ui.w), p = st.plans[ui.w], kids = [head, wd, b.add(`Stack(${b.list(rows)}, "column", 4)`)];
  if (p) {
    const ns = p.sel.map((d, i) => nut(mask(s, d), p.q[i])), av = ns.reduce((a, x) => a.map((v, i) => v + x[i] / 7), [0, 0, 0, 0, 0]), sh = shop(p, s, st.conf, st.pantry, ui.w);
    kids.push(b.add(`Section(${q(`Semana del ${fmt(W)}`)}, "mes")`), b.add(`Bars(${q(DAYS)}, ${q(ns.map((x) => r(x[0])))}, ${s.k})`),
      row(b, [b.add(`Tile("flame", ${q(r(av[0]) + ' kcal')}, "media diaria", ${Math.min(1, av[0] / s.k).toFixed(2)})`), b.add(`Tile("bolt", ${q(r(av[1]) + ' g')}, "proteína", ${Math.min(1, av[1] / s.p).toFixed(2)})`), b.add(`Tile("coin", ${q(r(sh.sum) + ' €')}, "compra semanal")`)], 10, true),
      ...microCard(b, st, ui.w, 'Cobertura de la semana'));
    const ex = caduca(p, s, W).slice(0, 4);
    if (ex.length) kids.push(b.add(`Section("Aprovecha antes de que caduque", "spark")`), ...ex.map((x) => b.add(`Note(${q(x.name + ': ' + x.text)}, "warn")`)));
  }
  return b.root('page', kids);
}

/* ---------- Compra ---------- */
export function compra(st: State, ui: UI) {
  const b = new B(), p = st.plans[ui.w], s = st.set, W = parse(ui.w), store = STORES[s.store];
  const head = b.add(`Head("Lista de la compra", ${q(store)}, @Week(-1), @Today(), @Week(1))`);
  if (!p) return b.root('page', [head, b.add(`Empty("Sin menú, sin lista", "Genera el menú de la semana del ${fmt(W)} y aquí aparece todo lo que necesitas comprar.", ["pan","tomrall","pavo"], "Generar mi semana", @Gen(), null, null, "Tostada con tomate y pavo")`)]);
  const sh = shop(p, s, st.conf, st.pantry, ui.w), kids = [head];
  // Presupuesto de los días que quedan (si la semana ya empezó, solo se compra lo que falta).
  const bud = s.budget > 0 ? Math.round((s.budget * sh.days) / 7 * 100) / 100 : 0;
  const tiles = [b.add(`Tile("check", ${q(`${sh.done}/${sh.all}`)}, "en el carrito", ${sh.all ? (sh.done / sh.all).toFixed(2) : 0})`), b.add(`Tile("coin", ${q(eur(sh.sum))}, ${q(bud > 0 ? (sh.days < 7 ? `de ${eur(bud)}: tu parte de ${eur(s.budget)} para ${sh.days} días` : `de ${eur(bud)} de presupuesto`) : 'total')}, ${bud > 0 ? Math.min(1, sh.sum / bud).toFixed(2) : 0})`)];
  if (sh.days < 7) kids.push(b.add(`Note(${q(sh.days ? `Solo para lo que queda de semana (${DAYS[7 - sh.days]}–${DAYS[6]}).` : 'Esta semana ya ha terminado.')})`));
  kids.push(row(b, tiles, 10, false));
  if (s.store === 2) kids.push(row(b, [b.add(`Tile("compra", ${q(eur(sh.byStore[0]))}, "en Mercadona")`), b.add(`Tile("compra", ${q(eur(sh.byStore[1]))}, "en Día")`)], 10, false));
  // Sin Nevú Plus, la gema avisa de que imprimir y el PDF son de Plus.
  const pl = hasPlus(st);
  kids.push(row(b, [b.add(`Btn("Imprimir", @Export("printshop"), "soft", ${q(pl ? 'print' : 'nplus')})`), b.add(`Btn("PDF", @Export("shoppdf"), "soft", ${q(pl ? 'share' : 'nplus')})`)], 10, false));
  // El menú ya se ajusta al precio real (envases enteros). Si aun así se pasa, es que no se puede sin dejar de cubrir tus objetivos.
  if (p.bought) kids.push(b.add(`Hint("Compra hecha", "Si cambias algún plato, te propongo recetas con lo que ya tienes en casa.", "check")`), b.add(`Btn("Volver a hacer la compra", @Rebuy(), "ghost", "compra")`));
  else if (sh.all > 0) kids.push(b.add(`Btn("Ya he hecho la compra", @BuyAll(), "soft", "check")`));
  // Límite flexible: pasarse un poco (menos de 2,50 € con 60 €) no merece un aviso.
  // Presupuesto de la semana repartido entre los días que quedan (la lista solo compra para esos días).
  if (bud > 0 && sh.sum > bud + budgetFlex(bud)) kids.push(b.add(`Hint("Un poco por encima del presupuesto", ${q(`${sh.days < 7 ? `De tus ${eur(s.budget)} a la semana, a estos ${sh.days} días les tocan ${eur(bud)}. ` : ''}Lo más ajustado que encuentro sin dejar de cubrir calorías, proteína y vitaminas son ${eur(sh.sum)}. Puedes «Rehacer la semana» o subir un poco el presupuesto.`)}, "coin")`));
  const all = sh.sec.flatMap((x) => x.lines);
  if (s.priceInfo) { const est = all.filter((l) => l.v !== 1 && !l.conf).length; if (est) kids.push(b.add(`Note(${q(`${est} de ${all.length} precios son estimaciones. Toca un precio para confirmarlo en tienda.`)})`)); }
  const rowOf = (l: (typeof all)[number]) => {
    const P = prod(s.store, l.id, st.conf)!;
    const st2 = !s.priceInfo ? '' : l.conf ? `Confirmado el ${l.conf.slice(8, 10)}/${l.conf.slice(5, 7)}` : l.v === 1 ? 'Contrastado' + (P.s ? ' · ' + P.s : '') : 'Precio estimado';
    const orig = l.from ? `En lugar de: ${ING[l.from].n}` : '', base = l.from || l.id, ph = fotoUrl(P, 200);
    return b.add(`ShopRow(${q(l.id)}, ${q(P.n)}, ${q(P.pk + (P.b ? ' · ' + P.b : ''))}, ${l.n}, ${l.price}, ${l.base}, ${l.done}, ${q(orig || st2)}, @Check(${q(l.id)}), ${q(ph)}, ${q(storeTag(st, l.id))}, ${SUBS[base]?.length || l.from ? `@Open("swap", -1, ${q(base)})` : 'null'}, ${ph ? `@Open("photo", 0, ${q(l.id)})` : 'null'})`);
  };
  // Secciones como en el súper: fruta y verdura, lácteos y huevos, pan y pasta…
  sh.sec.forEach((x) => kids.push(b.add(`Section(${q(x.n)})`), b.add(`Card(${b.list(x.lines.map(rowOf))})`)));
  if (!all.length) kids.push(b.add(`Empty("No hace falta comprar nada", "Con lo que tienes en la despensa te llega para el menú de esta semana.", ["leche","platano","avena"], "Ver la despensa", @Go("desp"), null, null, "Batido de plátano y avena")`));
  return b.root('page', kids);
}

/* ---------- Despensa ---------- */
export function despensa(st: State) {
  const b = new B(), s = st.set, today = ymd(new Date()), ids2 = Object.keys(st.pantry).filter((id) => ING[id] && st.pantry[id].q > 0);
  const head = b.add(`Head("Lo que tienes en casa", "Despensa")`);
  const soon = pantrySoon(st.pantry, today, s.pantryDays);
  const kids = [head, row(b, [b.add(`Tile("desp", ${q(String(ids2.length))}, "productos")`), b.add(`Tile("clock", ${q(String(soon.length))}, ${q(`caducan en ${s.pantryDays} días o menos`)})`)], 10, false),
    b.add(`Btn("Añadir producto", @Open("add", 0), "solid", "plus")`)];
  if (!ids2.length) {
    kids.push(b.add(`Empty("La despensa está vacía", "Lo que marcas en el carrito entra aquí solo. Al tocar «Lo he cocinado» en una receta, se descuenta.", ["yogur","fruta","fsecos"], "Ir a la compra", @Go("compra"), null, null, "Yogur con fruta y nueces")`));
    return b.root('page', kids);
  }
  const item = (id: string) => {
    const it = st.pantry[id], P = prod(s.store, id, st.conf), exp = expiry(id, it), left = exp ? days(today, exp) : 999;
    const pack = P ? P.q : it.q, fill = Math.min(1, it.q / pack);
    const sub = (P ? P.n + (P.b ? ' · ' + P.b : '') : ING[id].n);
    const when = left >= 999 ? 'Larga duración' : left < 0 ? 'Caducado' : left === 0 ? 'Caduca hoy' : left === 1 ? 'Caduca mañana' : `Caduca en ${left} días`;
    return b.add(`PantryRow(${q(id)}, ${q(photo(st, id))}, ${q(ING[id].n)}, ${q(sub)}, ${it.q}, ${q(ING[id].u)}, ${fill.toFixed(2)}, ${left}, ${q(when)}, ${!!it.open}, ${!!ING[id].open}, @PanStep(${q(id)}, -1), @PanStep(${q(id)}, 1), @PanOpen(${q(id)}), @PanDel(${q(id)}))`);
  };
  const soonIds = soon.map((x) => x.id), opened = ids2.filter((id) => !soonIds.includes(id) && st.pantry[id].open), rest = ids2.filter((id) => !soonIds.includes(id) && !st.pantry[id].open).sort((a, c) => ING[a].n.localeCompare(ING[c].n));
  if (soonIds.length) kids.push(b.add(`Section("Caduca pronto", "clock")`), b.add(`Card(${b.list(soonIds.map(item))})`));
  if (opened.length) kids.push(b.add(`Section("Abiertos", "spark")`), b.add(`Card(${b.list(opened.map(item))})`));
  if (rest.length) kids.push(b.add(`Section("En casa", "desp")`), b.add(`Card(${b.list(rest.map(item))})`));
  kids.push(b.add(`Note("Caducidad estimada: fíate siempre de la fecha del envase.")`));
  return b.root('page', kids);
}

/* ---------- Tú: perfil, objetivos y bienestar ---------- */
// Tipos de actividad física (factor de la fórmula), con lo que significa cada uno.
const ACTS: [number, string, string][] = [
  [1.2, 'Sedentaria', 'Trabajas o estudias sentado y apenas haces ejercicio.'],
  [1.375, 'Ligera', 'Caminas a diario o haces ejercicio suave 1–3 días por semana.'],
  [1.55, 'Moderada', 'Haces ejercicio de intensidad media 3–5 días por semana.'],
  [1.725, 'Alta', 'Entrenas fuerte 6–7 días por semana o tienes un trabajo físico.'],
];
/** ¿Faltan la edad, la altura o el peso? Sin ellos no se puede calcular tu objetivo diario. */
export const perfilIncompleto = (st: State) => !calc(st.perfil);
/** Formulario de tus datos (en «Tú» y en la presentación): al cambiar algo, el objetivo se recalcula al momento. */
function perfilForm(b: B, st: State) {
  const P = st.perfil, goals: [number, string][] = [[-0.15, 'Bajar'], [0, 'Mantener'], [0.1, 'Ganar']];
  const act = ACTS.find(([v]) => v === P.act);
  return [row(b, [b.add(`Field("Edad", "age", ${P.age}, "años")`), b.add(`Field("Altura", "h", ${P.h}, "cm")`), b.add(`Field("Peso", "w", ${P.w}, "kg")`)], 10, false),
    b.add(`Label("Género")`), row(b, [pill(b, 'Hombre', P.sex === 'm', '@Prof("sex", "m")'), pill(b, 'Mujer', P.sex === 'f', '@Prof("sex", "f")')]),
    b.add(`Label("Actividad física")`), row(b, ACTS.map(([v, l]) => pill(b, l, P.act === v, `@Prof("act", ${v})`))),
    ...(act ? [b.add(`Note(${q(act[2])})`)] : []),
    b.add(`Label("Objetivo")`), row(b, goals.map(([v, l]) => pill(b, l, P.goal === v, `@Prof("goal", ${v})`)))];
}
export function tu(st: State) {
  const b = new B(), P = st.perfil, c = calc(P), s = st.set;
  const head = b.add(`Head("Tus calorías y tu bienestar", "Tú")`);
  const form = perfilForm(b, st);
  const res: string[] = [];
  const stp = (label: string, k: string, v: number, u: string, d: number, lo: number, hi: number) => b.add(`Step(${q(label)}, ${q(v + ' ' + u)}, @Cfg(${q(k)}, ${Math.max(lo, v - d)}), @Cfg(${q(k)}, ${Math.min(hi, v + d)}))`);
  // Tu objetivo: lo que usa el menú. Se calcula con tus datos (y cambia en cuanto los cambias); puedes ajustarlo a mano.
  res.push(b.add(`Hero("Tu objetivo diario", [${s.k}], ${s.k}, ${s.k}, ${s.p}, ${s.p}, ${s.f}, ${s.f}, 0, [1])`),
    b.add(`Card(${b.list([stp('Calorías objetivo', 'k', s.k, 'kcal', 50, 1200, 4500), stp('Proteína mínima', 'p', s.p, 'g', 5, 30, 220), stp('Fibra mínima', 'f', s.f, 'g', 1, 10, 60)])})`));
  if (c) {
    res.push(row(b, [b.add(`Tile("flame", ${q(c.bmr + ' kcal')}, "metabolismo basal")`), b.add(`Tile("bolt", ${q(c.tdee + ' kcal')}, "gasto total")`), b.add(`Tile("tu", ${q(c.bmi.toFixed(1).replace('.', ','))}, "IMC")`)], 10, false));
    res.push(b.add(`Note(${q(`Reparto orientativo: ${num(c.carb)} g de hidratos, ${num(c.fat)} g de grasa (30 %) y proteína a ${num(c.gkg)} g por kg de peso. Cambia con tu edad, tu peso, tu altura y tu actividad.`)})`));
    if (c.minor) res.push(b.add(`Note("Eres menor de edad: estas fórmulas son para adultos. Consulta con tu médico antes de seguir un objetivo de peso.", "warn")`));
    if (c.low) res.push(b.add(`Note("Con tu IMC no recomiendo bajar de peso, así que he calculado para mantener.", "warn")`));
    res.push(b.add(`Note(${q(c.kc === s.k && c.p === s.p && c.f === s.f ? 'Calculado con tus datos (Mifflin-St Jeor) y ya aplicado a tu menú. Si cambias tu peso o tu actividad, se recalcula solo.' : `Con tus datos te saldrían ${c.kc} kcal, ${c.p} g de proteína y ${c.f} g de fibra; lo has ajustado a mano. Al cambiar tus datos se vuelve a calcular.`)})`));
  } else res.push(b.add(`Note("Faltan tu edad, altura o peso: con ellos calculo tu objetivo a tu medida. Mientras, uso un objetivo general.", "warn")`));
  const R = refs(P.sex, s.f);
  const bien = [
    b.add(`Toggle("Ánimo y estrés", "Prioriza omega-3, folato, B12, vitamina D, magnesio, zinc, hierro y fibra", ${s.mood}, @Cfg("mood", ${!s.mood}))`),
    b.add(`Toggle("Estoy resfriado", "Platos calientes, cítricos, vitamina C y zinc toda la semana", ${s.cold}, @Cfg("cold", ${!s.cold}))`),
    b.add(`Note("Basado en estudios sobre dieta y ánimo (SMILES 2017; omega-3, Liao 2019) y en los valores de la EFSA. Es un apoyo, no un tratamiento: si lo pasas mal, habla con tu médico.")`),
  ];
  // Tus datos y, justo debajo, tu objetivo (así ves al momento cómo cambia); en tablet, el bienestar a la derecha.
  return b.root('page', [head, b.add(`Cols(${b.list([b.add(`Card(${b.list(form)})`), ...res])}, ${b.list([b.add(`Section("Bienestar", "spark")`), calm(b), b.add(`Card(${b.list(bien)})`)])})`)]);
}

/* ---------- Nevú Plus (pago único) ---------- */
// Qué incluye y los botones de compra; sale en Ajustes y en la hoja que se abre al tocar algo de Plus.
function plusKids(b: B, st: State) {
  return [b.add(`PlusCard(${hasPlus(st)}, ${q(st.dev?.plusPrice || '3,99 €')}, @Export("buy"), @Export("restorebuy"))`)];
}

/* ---------- Ajustes ---------- */
export function ajustes(st: State, ui?: UI) {
  const b = new B(), s = st.set, cfg = (k: string, v: any) => `@Cfg(${q(k)}, ${q(v)})`;
  const tg = (label: string, sub: string, k: string, on: boolean) => b.add(`Toggle(${q(label)}, ${q(sub)}, ${on}, ${cfg(k, !on)})`);
  const ex = (label: string, sub: string, k: keyof typeof s.ex) => b.add(`Toggle(${q(label)}, ${q(s.ex[k] ? 'No saldrá en tu menú' + (sub ? ': ' + sub.toLowerCase() : '') : 'Puede salir en tu menú')}, ${s.ex[k]}, ${cfg('ex.' + k, !s.ex[k])})`);
  const st2 = (label: string, k: string, v: number, u: string, stp: number, lo: number, hi: number) => b.add(`Step(${q(label)}, ${q(v + ' ' + u)}, ${cfg(k, Math.max(lo, v - stp))}, ${cfg(k, Math.min(hi, v + stp))})`);
  const hr = (i: number) => b.add(`Step(${q(SLN[i])}, ${q(fmtTime(s.times[i]))}, ${cfg('t' + i, (s.times[i] + 1425) % 1440)}, ${cfg('t' + i, (s.times[i] + 15) % 1440)})`);
  const card = (title: string, icon: string, kids: string[]) => [b.add(`Section(${q(title)}, ${q(icon)})`), b.add(`Card(${b.list(kids)})`)];
  const ap = () => card('Aspecto', 'spark', [
    b.add(`Label("Tema")`), row(b, [['auto', 'Automático'], ['light', 'Claro'], ['dark', 'Oscuro']].map(([v, l]) => pill(b, l, s.mode === v, cfg('mode', v)))),
    b.add(`Label("Tamaño del texto")`), row(b, TEXT.map((x, i) => pill(b, x.n, s.text === i, cfg('text', i))))]);
  const apAv = () => card('Aspecto avanzado', 'spark', [
    tg('Modo sencillo', 'Solo lo que toca ahora, sin cifras. Útil en días difíciles', 'simple', s.simple),
    b.add(`Label("Tema de color")`), row(b, [...new Set([...SHOWN, s.accent])].filter((i) => ACCENTS[i]).map((i) => { const a = ACCENTS[i]; return b.add(`Swatch(${q(a.l)}, ${(s.grad ?? -1) < 0 || !hasPlus(st) ? s.accent === i : false}, ${cfg('accent', i)}, ${q(a.n)}, ${q(a.g)})`); }), 10, true),
    b.add(`Label("Mis temas (Nevú Plus)")`),
    row(b, [...(hasPlus(st) ? (s.themes || []) : []).map((th, i) => b.add(`Swatch(${q(th.l)}, ${s.grad === i}, ${cfg('grad', i)}, ${q(th.n)}, ${q(th.g)})`)),
      b.add(`Swatch("", false, ${hasPlus(st) ? '@Open("theme", 0)' : '@Open("plus", 0)'}, "Nuevo tema", "", "plus")`)], 10, true),
    ...(hasPlus(st) ? [b.add(`Note("Toca «+» para crear un tema con tus dos colores favoritos. Se guarda solo en este móvil.")`), ...((s.grad ?? -1) >= 0 && (s.themes || [])[s.grad!] ? [b.add(`Btn(${q('Eliminar el tema «' + s.themes![s.grad!].n + '»')}, @ThemeDel(${s.grad}), "ghost", "x")`)] : [])]
      : [b.add(`Note("Con Nevú Plus creas tus propios temas de color y los guardas aquí.")`)]),
    b.add(`Label("Espaciado")`), row(b, DENS.map((x, i) => pill(b, x.n, s.dens === i, cfg('dens', i))))]);
  const so = () => card('Sonido, vibración y movimiento', 'bolt', [tg('Sonidos', 'Temporizador, compra completa y plato cocinado', 'sound', s.sound),
    tg('Sonido al tocar y al cambiar de pestaña', '', 'tapSound', s.tapSound), tg('Vibración al tocar', '', 'haptics', s.haptics),
    tg('Animaciones', 'Transiciones y movimiento de la app (también la presentación)', 'motion', s.motion),
    b.add(`Label("Pantalla encendida")`), row(b, [['no', 'No'], ['receta', 'Al cocinar'], ['siempre', 'Siempre']].map(([v, l]) => pill(b, l, (s.keepAwake || 'receta') === v, cfg('keepAwake', v)))),
    b.add(`Note("«Al cocinar»: mientras ves una receta o tienes el temporizador en marcha.")`)]);
  const di = () => card('Dieta', 'leaf', [
    ex('Sin carne', 'Pollo, hamburguesas, kebab y caldo de carne', 'meat'), ex('Sin embutidos', 'Pavo y jamón cocido', 'cured'),
    ex('Sin pescado ni marisco', 'Atún, salmón, merluza, sardinas y gambas', 'fish'), ex('Sin lactosa ni lácteos', '', 'dairy'),
    ex('Sin gluten', '', 'gluten'), ex('Sin harinas', 'Pan, pasta, wraps, pizza, cuscús, ñoquis y gyozas', 'flour'), ex('Sin huevo', '', 'egg'), ex('Sin frutos secos', '', 'nuts'),
    b.add(`Note("Con alergias, revisa siempre la etiqueta: algunos productos avisan de trazas.")`),
    b.add(`Label("No me gusta")`),
    ...((s.veto || []).length
      ? [row(b, (s.veto || []).map((v) => b.add(`Chip(${q(v.startsWith('i:') ? ING[v.slice(2)]?.n || v.slice(2) : v.slice(2))}, @Veto(${q(v)}))`)), 8, true)]
      : [b.add(`Note("Toca «No me gusta» en una receta o al cambiar un ingrediente y no volverá a salir. Aquí puedes quitarlo.")`)])]);
  const opt = (k: number) => (k === 3 ? tg('Merienda de mañana', 'Entre el desayuno y la comida', 'snack', s.snack) : k === 4 ? tg('Merienda de tarde', 'Entre la comida y la cena', 'extra', s.extra) : tg('Bebida', 'Zumos, batidos, kéfir e infusiones', 'drink', s.drink));
  const co = () => card('Comidas', 'clock', [
    tg('Menú fijo', s.fixedMenu ? 'No cambio platos por mi cuenta (útil si ya lo has imprimido)' : 'Si cambias algo del día o de la despensa, adapto el resto de la semana', 'fixedMenu', s.fixedMenu),
    st2('Tiempo máximo por plato', 'maxMin', s.maxMin, 'min', s.maxMin < 20 ? 5 : 10, 5, 60),
    b.add(`Note("Incluye sacar, pesar y recoger. Con más de 20 min entran horno y guisos.")`),
    st2('Presupuesto semanal', 'budget', s.budget, '€', 5, 0, 300),
    b.add(`Note(${q(s.budget ? 'Precio real de la compra. Al cambiarlo reajusto el menú sin perder nutrientes.' : 'Con 0 € no hay límite.')})`),
    ...ORDER.filter((k) => k >= 3).map(opt),
    ...(s.drink ? [b.add(`Label("La bebida va con")`), row(b, [[0, 'Desayuno'], [3, 'Media mañana'], [1, 'Comida'], [4, 'Merienda'], [2, 'Cena']].map(([k, l]) => pill(b, l as string, (s.drinkWith ?? 4) === k, cfg('drinkWith', k))))] : []),
    b.add(`Note("Tus calorías, proteína y fibra están en «Tú», junto a tus datos.")`)]);
  const ho = () => card('Horario de las comidas', 'clock', [...ORDER.filter((i) => active(s)[i] && i !== 5).map(hr)]);
  const sp = () => card('Compra', 'compra', [
    row(b, STORES.map((l, i) => pill(b, l, s.store === i, cfg('store', i)))),
    ...(s.store === 2 ? [b.add(`Note("Cada producto, donde salga más barato. La lista te dice dónde.")`)] : []),
    tg('Mostrar el origen de cada precio', 'Si está contrastado, estimado o confirmado por ti', 'priceInfo', s.priceInfo),
    b.add(`Label("Día de la compra")`), row(b, ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((l, i) => pill(b, l, s.buy === i - 1, cfg('buy', i - 1)))), st2('Hora del aviso de compra', 'hour', s.hour, 'h', 1, 7, 22)]);
  const de = () => card('Despensa', 'desp', [
    tg('Usar lo que hay en la despensa', 'El menú aprovecha lo que caduca antes, sin dejar de variar', 'pantryUse', s.pantryUse),
    tg('Dar prioridad a la despensa', 'Gastar lo que tienes pesa más que la variedad', 'pantryFirst', s.pantryFirst),
    st2('Tener en cuenta lo que caduca en', 'pantryDays', s.pantryDays, 'días', 1, 1, 14)]);
  const pm = ui?.perm || {};
  const av = () => card('Avisos', 'bolt', [tg('Aviso para hacer la compra', 'El día y la hora elegidos', 'notif', s.notif), tg('Aviso de cada comida', 'A las horas de tu horario', 'meals', s.meals),
    tg('Aviso de caducidad', 'El día antes de que caduque algo de la despensa', 'exp', s.exp)]);
  const avAv = () => card('Avisos: detalles y permisos', 'bolt', [
    tg('Sonido propio de la app', 'Si lo desactivas, usa el sonido del móvil', 'nsound', s.nsound),
    b.add(`Label("Permisos del móvil")`),
    b.add(`Perm("Permitir avisos", "Sin este permiso no llega ningún aviso", ${pm.notif === true ? '"ok"' : pm.notif === false ? '"off"' : '""'}, @Export("perm-notif"))`),
    b.add(`Perm("Avisos a la hora exacta", "Android 12 o más: «Alarmas y recordatorios»", "", @Export("perm-alarm"))`),
    b.add(`Perm("Sin ahorro de batería", "Para que el móvil no retrase los avisos", "", @Export("perm-battery"))`)]);
  const pl = () => [b.add(`Section("Nevú Plus", "nplus")`), ...plusKids(b, st)];
  const ca = () => card('Calendario', 'plan', [
    b.add(`Toggle("Sincronizar con Google Calendar", ${q(st.sync ? `Pone tus comidas en el calendario de ${st.sync.email} y las cambia solas si cambias un plato o un horario` : 'Inicia sesión con Google (en Cuenta, más abajo) para que tus comidas vayan al calendario de esa cuenta')}, ${!!s.calSync}, @Export("calsync"))`),
    ...(!hasPlus(st) ? [b.add(`Note("El calendario es de Nevú Plus.")`)] : []),
    ...(s.calSync && !st.sync ? [b.add(`Note("Sin sesión iniciada no actualizo el calendario.", "warn")`)] : []),
    ...(st.dev?.calErr ? [b.add(`Note(${q('Calendario: ' + st.dev.calErr)}, "warn")`)] : st.dev?.calInfo ? [b.add(`Note(${q(st.dev.calInfo)})`)] : []),
    row(b, [b.add(`Btn("Abrir mi semana en el calendario", @Export("calendar"), "soft", "plan")`), b.add(`Btn("Borrar los eventos de la app", @Export("calpurge"), "ghost", "x")`)], 8, true)]);
  const nube = () => st.sync
    ? [b.add(`Note(${q('Sesión iniciada como ' + st.sync.email + (hasPlus(st) ? '. Se sincroniza solo (el diseño es de cada dispositivo).' : '. Guarda y recupera tu copia a mano; con Nevú Plus se sincroniza sola entre tus dispositivos.') + (st.sync.at ? ' Última vez: ' + new Date(st.sync.at).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }) + '.' : ''))})`),
      ...(st.dev?.syncErr ? [b.add(`Note(${q('Última sincronización fallida: ' + st.dev.syncErr)}, "warn")`)] : []), row(b, [...(st.dev?.syncErr ? [b.add(`Btn("Reintentar", @Export("sync"), "solid", "share")`)] : []), b.add(`Btn("Guardar copia en la nube", @Export("cloudsave"), "soft")`), b.add(`Btn("Restaurar copia", @Export("cloudrestore"), "ghost")`), b.add(`Btn("Cerrar sesión", @Export("signout"), "ghost")`)], 8, true)]
    : [b.add(`Note(${q(hasPlus(st) ? 'Con Google, tus menús, despensa y ajustes se sincronizan entre tus dispositivos.' : 'Inicia sesión con Google para guardar una copia de tus menús, despensa y ajustes en tu Drive y recuperarla en otro móvil. Con Nevú Plus, además, se sincroniza sola.')})`), b.add(`Btn("Iniciar sesión con Google", @Export("signin"), "solid", "tu")`)];
  const da = () => card('Cuenta y copias de seguridad', 'share', [...nube(), row(b, [b.add(`Btn("Copia en un archivo", @Export("backup"), "soft")`), b.add(`Btn("Restaurar de un archivo", @Export("restore"), "ghost")`)], 8, true),
    b.add(`Btn("Borrar todos mis datos", @Open("wipe", 0), "ghost", "x")`)]);
  const ayuda = () => card('Ayuda', 'info', [row(b, [b.add(`Btn("Ver la presentación", @Intro(0), "soft", "info")`), b.add(`Btn("Privacidad", @Open("privacy", 0), "ghost", "lock")`)], 8, true)]);
  // Al final: la versión instalada y sus novedades.
  const ver = () => [b.add(`Note(${q(`Nevú · versión ${VERSION}`)})`), b.add(`Btn("Novedades", @News(true), "ghost", "info")`)];
  // Pantalla principal: solo lo que casi todo el mundo toca. Lo demás vive en «Ajustes más avanzados».
  if (ui?.tab === 'adv') {
    return b.root('page', [b.add(`Head("Ajustes", "Más avanzados", @Go("aj"))`), b.add(`Note("Aquí está todo lo demás. Nevú funciona bien sin tocar nada de esto.")`),
      ...apAv(), ...so(), ...co(), ...ho(), ...sp(), ...de(), ...avAv(), ...ca(), ...da()]);
  }
  const mas = [b.add(`Section("Más opciones", "info")`), b.add(`Card(${b.list([b.add(`Btn("Ajustes más avanzados", @Go("adv"), "soft", "aj")`), b.add(`Note("Horarios, presupuesto, despensa, sonido, calendario y copias de seguridad.")`)])})`)];
  return b.root('page', [b.add(`Head("Personaliza", "Ajustes")`), ...pl(), ...di(), ...av(), ...ap(), ...mas, ...ayuda(), ...ver()]);
}

/* ---------- hojas: receta, elegir plato y añadir a la despensa ---------- */
export function sheet(st: State, ui: UI) {
  if (!ui.sheet) return null;
  const b = new B(), s = st.set, close = '@Close()';
  if (ui.sheet.kind === 'photo' && ui.sheet.from) {
    const id = ui.sheet.from, P = prod(s.store, id, st.conf); if (!P) return null;
    return b.root('sheet', [b.add(`Zoom(${q(fotoUrl(P, 900))}, ${q(P.n)}, ${q([P.b, P.pk, eur(priceOf(st.conf, s.store, id))].filter(Boolean).join(' · '))}, ${q([id])})`)], `, ${q(ING[id].n)}, ${close}`);
  }
  if (ui.sheet.kind === 'swap' && ui.sheet.from) {
    const id = ui.sheet.from, p = st.plans[ui.w]; if (!p) return null;
    // Desde una receta (k ≥ 0) la cantidad es la de esa receta; desde la lista (k = -1), la de toda la semana.
    const fromRecipe = ui.sheet.k >= 0, rm = fromRecipe ? dayMeals(mask(s, p.sel[ui.day]), p.q[ui.day])[ui.sheet.k] : null;
    const cur = p.sub?.[id], line = shop(p, s, st.conf, st.pantry, ui.w).sec.flatMap((x) => x.lines).find((l) => l.id === (cur || id));
    const need = rm ? (rm[3].find(([g]: any) => g === id)?.[1] ?? 0) : line ? (cur ? subQty(cur, id, line.q) : line.q) : 0;
    // Alternativas que respetan tu dieta y hay en tu supermercado, con lo que costaría la cantidad de esta semana.
    const opt = (to: string) => {
      const P = prod(s.store, to, st.conf); if (!P) return '';
      const qn = subQty(id, to, need), n = Math.max(1, Math.ceil(qn / P.q - 1e-9)), price = n * priceOf(st.conf, s.store, to);
      return b.add(`IngRow(${q(fotoUrl(P, 200))}, ${q(ING[to].n)}, ${q(`${P.n} · ${P.pk}`)}, ${q(eur(price))}, ${q([to])}, ${q(fromRecipe ? `En esta receta: ${unit(to, qn)}` : `Necesitas ${unit(to, qn)} · ${n} ${n === 1 ? 'envase' : 'envases'}`)}, @Sub(${q(id)}, ${q(to === id ? '' : to)}))`);
    };
    const alts = [...(cur ? [id] : []), ...(SUBS[id] || []).filter((to) => to !== cur && allowedIng(s, to))].map(opt).filter(Boolean);
    const intro = fromRecipe ? `Elige otro producto: se usará en todas las recetas de esta semana que lleven ${ING[id].n.toLowerCase()}, y la lista de la compra se ajusta sola.` : `¿No hay ${ING[id].n.toLowerCase()}? Cualquiera de estos sirve para las mismas recetas de esta semana. La cantidad y el precio ya están ajustados; la nutrición será parecida.`;
    const kids = [b.add(`Note(${q(alts.length ? intro : 'No tengo un sustituto que encaje con tu dieta en este supermercado.')})`), ...(alts.length ? [b.add(`Card(${b.list(alts)})`)] : [])];
    // Vetar: si no te gusta, no vuelve a salir ningún plato con este ingrediente (se puede quitar en Ajustes).
    kids.push(b.add(`Btn(${q(`No me gusta: no usar nunca ${ING[id].n.toLowerCase()}`)}, @Veto(${q('i:' + id)}), "ghost", "ban")`));
    return b.root('sheet', kids, `, "Cambiar por otro producto", ${close}`);
  }
  if (ui.sheet.kind === 'news') {
    // Registro de cambios: la versión instalada primero; cada cambio con su etiqueta (Nuevo, Mejorado, Corregido).
    const kids = NEWS.flatMap((n, i) => [
      ...(i === 1 ? [b.add(`Section("Versiones anteriores")`)] : []),
      b.add(`Ver(${q(n.v)}, ${q(i === 0 ? `Instalada · ${n.d}` : n.d)}, ${b.list(n.items.map(([k, x]) => b.add(`Change(${q(k)}, ${q(x)})`)))})`),
    ]);
    return b.root('sheet', kids, `, "Novedades", ${close}`);
  }
  if (ui.sheet.kind === 'wipe') {
    // Borrar todo: en este móvil (y, si quieres, también la copia de tu Google Drive). No se puede deshacer.
    const kids = [b.add(`Note("Se borran tus menús, la lista de la compra, la despensa, tu perfil y tus ajustes de este móvil, y los eventos que la app puso en tu calendario. No se puede deshacer.", "warn")`),
      b.add(`Btn("Borrar en este móvil", @Wipe(false), "soft", "x")`),
      ...(st.sync ? [b.add(`Btn("Borrar aquí y en mi Google Drive", @Wipe(true), "soft", "x")`), b.add(`Note("La copia de Google Drive está en una carpeta privada de la app; al borrarla también se cierra la sesión.")`)] : []),
      b.add(`Btn("Cancelar", @Close(), "ghost")`)];
    return b.root('sheet', kids, `, "Borrar todos mis datos", ${close}`);
  }
  if (ui.sheet.kind === 'theme') {
    const [c1, c2] = ui.draft || [PALETA[5][1], PALETA[2][1]], list = st.set.themes || [];
    const pal = (k: number, cur: string) => row(b, PALETA.map(([n, c]) => b.add(`Swatch(${q(c)}, ${cur === c}, @Draft(${k}, ${q(c)}), ${q(n)})`)), 10, true);
    return b.root('sheet', [b.add(`Swatch(${q(c1)}, true, null, "Vista", ${q(c2)})`), b.add(`Label("Color principal")`), pal(0, c1), b.add(`Label("Segundo color")`), pal(1, c2),
      b.add(`Btn("Guardar tema", @ThemeAdd(), "solid", "check")`),
      ...(list.length ? [b.add(`Label("Mis temas")`), ...list.map((th, i) => b.add(`Btn(${q('Eliminar «' + th.n + '»')}, @ThemeDel(${i}), "ghost", "x")`))] : [])], `, "Crear un tema", ${close}`);
  }
  if (ui.sheet.kind === 'plus') return b.root('sheet', [b.add(`Note("Esto es de Nevú Plus. Todo lo demás de la app es gratis.")`), ...plusKids(b, st), b.add(`Btn("Ahora no", @Close(), "ghost")`)], `, "Nevú Plus", ${close}`);
  if (ui.sheet.kind === 'privacy') {
    const P = (t: string, x: string) => b.add(`Hint(${q(t)}, ${q(x)}, "lock")`);
    const kids = [
      P('Tus datos se quedan contigo', 'Menús, despensa, perfil y ajustes se guardan en tu móvil. La app no tiene servidores propios ni envía nada a terceros.'),
      P('Google (opcional)', 'Si inicias sesión, se guarda una copia en una carpeta privada de la app dentro de tu Google Drive, que solo ve esta app con tu cuenta. Si activas el calendario, tus comidas se escriben en tu Google Calendar.'),
      P('Fotos y precios', 'Las fotos de los productos se cargan desde las webs de Mercadona y Día. Los precios son orientativos y pueden cambiar en la tienda. Nevú no está relacionada con estos supermercados.'),
      P('Permisos', 'Avisos (para recordarte las comidas), calendario (solo si lo activas) y alarmas exactas (para que el aviso llegue a su hora). Puedes quitarlos cuando quieras en los ajustes de Android.'),
      P('Salud', 'La app da orientación nutricional general, no consejo médico. Si tienes una condición de salud o alergias, consulta a tu médico y revisa siempre la etiqueta.'),
      P('Borrar tus datos', 'En Ajustes → Cuenta y copias de seguridad → «Borrar todos mis datos» lo borras todo del móvil y, si quieres, de tu Google Drive.'),
    ];
    return b.root('sheet', kids, `, "Privacidad", ${close}`);
  }
  // k = 1: en la presentación, la respiración empieza sola.
  if (ui.sheet.kind === 'breathe') return b.root('sheet', [b.add(`Breathe(${ui.sheet.k === 1})`)], `, "Respira un minuto", ${close}`);
  if (ui.sheet.kind === 'add') {
    const all = Object.keys(ING).filter((id) => prod(s.store, id, st.conf)).sort((a, c) => ING[a].n.localeCompare(ING[c].n));
    const kids = all.map((id) => { const P = prod(s.store, id, st.conf)!; return b.add(`IngRow(${q(fotoUrl(P, 200))}, ${q(ING[id].n)}, ${q(P.n + ' · ' + P.pk)}, ${q('+ 1 envase')}, ${q([id])}, ${q(st.pantry[id] ? 'Ya tienes ' + unit(id, st.pantry[id].q) : '')}, @PanAdd(${q(id)}))`); });
    return b.root('sheet', kids, `, "Añadir a la despensa", ${close}`);
  }
  const p = st.plans[ui.w]; if (!p) return null;
  const { kind, k } = ui.sheet, d = mask(s, p.sel[ui.day]);
  if (kind === 'recipe') {
    const m = dayMeals(d, p.q[ui.day])[k]; if (!m) return null;
    const R = refs(st.perfil.sex, s.f), mic = micro(m), done = !!p.done?.[`${ui.day}-${k}`];
    const good = MN.map((x, i) => [x.n, mic[i] / R[i]] as [string, number]).filter(([, v], i) => i > 0 && v >= 0.2).sort((x, y) => y[1] - x[1]).map(([n, v]) => `${n} ${Math.round(v * 100)} %`);
    const qn = p.q[ui.day][k] || 1;
    const name = dishName(m[0], p, m[3]), kids = [b.add(`Art(${q(ids(m))}, 180, ${q(m[0])}, ${k})`),
      b.add(`Chips(${q([`${mins(m)} min`, `${r(m[4][0])} kcal`, `${r(m[4][1])} g prot.`, eur(mealCost(m, s.store, st.conf)), ...(qn !== 1 ? [`ración ×${String(qn).replace('.', ',')}`] : [])])})`),
      row(b, [b.add(`Btn("Cambiar plato", @Open("pick", ${k}, "recipe"), "solid", "wand")`), b.add(`Btn("Cambiar ración", @Portion(${k}), "soft", "plus")`)], 8, true),
      b.add(`Section("Ingredientes", "compra")`),
      b.add(`Card(${b.list(m[3].map(([g0, qt0]: any) => { const [g, qt] = subbed(p, g0, qt0), P = prod(s.store, g, st.conf), have = st.pantry[g]; return b.add(`IngRow(${q(photo(st, g))}, ${q(ING[g].n)}, ${q(P ? P.n + (P.b ? ' · ' + P.b : '') + (storeTag(st, g) ? ' · ' + storeTag(st, g) : '') : '')}, ${q(unit(g, qt))}, ${q([g])}, ${q(have ? 'En tu despensa: ' + unit(g, have.q) : '')}, null, ${SUBS[g0]?.length ? `@Open("swap", ${k}, ${q(g0)})` : 'null'})`); }))})`)];
    const demo = ui.sheet.from === 'demo';
    if (good.length && !demo) kids.push(b.add(`Section("Lo que más aporta", "spark")`), b.add(`Chips(${q(good.slice(0, 6))})`));
    const [punto, alino] = doneOf(m);
    // Antes de empezar: si hay que pelar (o no) la fruta y la verdura. En los pasos, el fuego (1–6) y el tamaño de los cortes.
    const prev = antes(m[3].map(([g0, q0]: any) => subbed(p, g0, q0)), (g) => ING[g].n);
    if (prev.length && !demo) kids.push(b.add(`Hint("Antes de empezar", ${q(prev.map(([n, x]) => `${n}: ${x}`).join('\n'))}, "leaf")`));
    kids.push(b.add(`Section("Preparación", "plan")`), ...subText(m[5], p, m[3]).split('|').map((t: string, i: number) => b.add(`Cook(${i + 1}, ${q(detalle(t))})`)));
    // Cómo debe quedar y con qué aliñarlo: lo que no viene en los pasos y marca la diferencia.
    if (punto && !demo) kids.push(b.add(`Hint("Cómo debe quedar", ${q(subText(punto, p, m[3]))}, "check")`));
    if (alino && !demo) kids.push(b.add(`Hint("Sal, especias y aceite", ${q(subText(alino, p, m[3]))}, "leaf")`));
    if (!demo) kids.push(b.add(`Note(${q(`${m[6]}. ${qn !== 1 ? `Tiempos para ración ×${String(qn).replace('.', ',')}. ` : ''}Revisa los alérgenos en la etiqueta.`)})`));
    if (m[7]) kids.push(b.add(`Timer(${m[7]}, ${ui.timer && ui.timer.k === k && ui.timer.day === ui.day && ui.timer.w === ui.w ? ui.timer.end : 0}, ${ui.sheet.from === 'demo'})`));
    // «Lo he cocinado» solo hoy o días pasados (un día futuro aún no ha llegado).
    const future = ymd(add(parse(ui.w), ui.day)) > ymd(new Date());
    if (!demo) kids.push(row(b, [...(future && !done ? [] : [b.add(`Btn(${q(done ? 'No lo he cocinado' : 'Lo he cocinado')}, @Cooked(${k}), ${q(done ? 'ghost' : 'soft')}, "check")`)]), b.add(`Btn("Abrir en el calendario", @Export("event"), "ghost", "plan")`)], 8, true));
    // Las meriendas se pueden quitar un día (y volver a poner desde el menú con «Añadir»).
    if (!demo) kids.push(row(b, [...(k === 3 || k === 4 ? [b.add(`Btn(${q('Quitar este día')}, @Choose(${k}, -1), "ghost", "x")`)] : []), b.add(`Btn("No me gusta este plato", @Veto(${q('r:' + m[0])}), "ghost", "ban")`)], 8, true));
    return b.root('sheet', kids, `, ${q(name)}, ${close}`);
  }
  const cur = d[k], base = cur >= 0 && lst(k)[cur] ? lst(k)[cur][4][0] : s.k / 4;
  // Con la compra hecha, por defecto solo platos que puedes hacer con lo que queda libre en casa.
  // «Con lo que tengo» (por defecto si la compra está hecha) o «Todos»: siempre se puede cambiar con los dos botones de arriba.
  const onlyHome = ui.sheet.from === 'home' || (!!p.bought && ui.sheet.from !== 'all'), free = onlyHome ? spare(p, s, st.pantry, ui.w, ymd(new Date()), `${ui.day}-${k}`, true) : null, fq = p.q[ui.day][k] || 1;
  const opts = lst(k).map((m, j) => ({ m, j })).filter(({ m, j }) => (allowed(s, k, j) && (!free || doable(m, free, fq))) || j === cur).sort((x, y) => (x.j === cur ? -1 : y.j === cur ? 1 : Math.abs(x.m[4][0] - base) - Math.abs(y.m[4][0] - base)));
  const kids = opts.map(({ m, j }) => b.add(`Meal(${k}, ${q(dishName(m[0], p, m[3]))}, ${q(ids(m))}, ${mins(m)}, ${r(m[4][0])}, ${r(m[4][1])}, 1, ${q(j === cur ? 'Elegido ahora' : '')}, @Choose(${k}, ${j}), null, ${q(eur(mealCost(m, s.store, st.conf)))}, false, false)`));
  if (k >= 3) kids.unshift(b.add(`Btn(${q('Quitar ' + SLN[k].toLowerCase())}, @Choose(${k}, -1), "ghost", "x")`));
  const toggle = row(b, [pill(b, 'Con lo que tengo', onlyHome, `@Open("pick", ${k}, "home")`, 'desp'), pill(b, 'Todos los platos', !onlyHome, `@Open("pick", ${k}, "all")`, 'compra')], 8, true);
  if (onlyHome && opts.length <= 1) kids.unshift(b.add(`Note("Con lo que tienes en casa no hay otra opción para esta comida. Mira «Todos los platos».")`));
  kids.unshift(toggle);
  if (p.l?.[`${ui.day}-${k}`]) kids.unshift(b.add(`Btn("Que la app elija por mí", @Unlock(${k}), "soft", "wand")`));
  kids.push(b.add(`Note("Al elegir, el plato queda fijado y reajusto los días siguientes para que haya variedad.")`));
  return b.root('sheet', kids, `, ${q('Elige ' + SLN[k].toLowerCase())}, ${close}`);
}

/* ---------- presentación al abrir la app por primera vez ---------- */
export const INTRO = [
  { t: 'Bienvenido a Nevú', x: 'Tu menú de la semana y tu lista de la compra, a tu medida. Cada plato se hace en menos de 10 minutos.', i: ['pan', 'tomrall', 'aguac'], n: 'Tostada con tomate y aguacate', s: 0, d: 'dishes' },
  { t: 'Hecho a tu medida', x: 'Opcional: con tu edad, altura y peso calculo tus calorías, proteína y fibra. Puedes cambiarlo cuando quieras en «Tú».', i: ['pollo', 'arroz', 'ensal'], n: 'Bowl de pollo y arroz', s: 1, d: 'perfil' },
  { t: 'Avisos a su hora', x: 'Te aviso de cada comida, de la compra y de lo que caduca. Activa los permisos para que lleguen a tiempo.', i: ['yogur', 'fruta', 'fsecos'], n: 'Yogur con fruta y nueces', s: 3, k: 'perm', d: 'notif' },
  { t: 'Nevú es gratis. Plus, si quieres más', x: 'Con Google guardas gratis una copia de tus menús en tu Drive. Con Nevú Plus (3,99 €, pago único): sincronización automática entre dispositivos, calendario, PDF y temas propios.', i: ['huevo', 'espin', 'pan'], n: 'Tostada con huevo y espinacas', s: 2, k: 'google', d: 'sync' },
];
/** Datos de un paso para pintarlo: [paso, título, texto, demo, pantalla, barra, desde, hasta, dedo, botones, después, consejo]. */
function introPage(st: State, ui: UI, i: number) {
  const it = INTRO[i] as (typeof INTRO)[number] & { d: string; tip?: string; k?: string };
  // Tus datos: aquí no hay demostración, sino el formulario de verdad (con tus datos, también los que llegan de tu cuenta).
  if (it.d === 'perfil') {
    const fb = new B(), c = calc(st.perfil);
    const kids = [...perfilForm(fb, st), fb.add(`Note(${q(c ? `Tu objetivo: ${st.set.k} kcal, ${st.set.p} g de proteína y ${st.set.f} g de fibra al día.` : 'Si lo dejas para luego, uso un objetivo general.')})`)];
    const scr = fb.root('plain', [fb.add(`Card(${fb.list(kids)})`)]);
    return { it, scr, bar: '', pan: 0, from: 0, extras: '[]', row: `[${i}, ${q(it.t)}, ${q(it.x)}, "perfil", ${q(scr)}, "", 0, 0, [], [], [], ""]` };
  }
  // Botones extra de algunas páginas: [texto, acción, hecho]
  const ex = it.k === 'perm' ? [['Activar avisos', '@Export("perm-notif-on")', ui.perm?.notif === true && st.set.meals, 'bell'], ['A la hora exacta', '@Export("perm-alarm")', false, 'clock'], ['Sin ahorro de batería', '@Export("perm-battery")', false, 'bolt']]
    : it.k === 'google' ? [[st.sync ? `Conectado: ${st.sync.email}` : 'Iniciar sesión con Google', st.sync ? 'null' : '@Export("signin")', !!st.sync, 'cloud']] : [];
  const extras = '[' + ex.map(([l, a, dn, ic]) => `[${q(l)}, ${a}, ${!!dn}, ${q(ic)}]`).join(', ') + ']';
  // Sin pantallas «en vivo»: cada paso es una ilustración ligera (la presentación va fluida en cualquier móvil).
  return { it, scr: '', bar: '', pan: 0, from: 0, extras, row: `[${i}, ${q(it.t)}, ${q(it.x)}, ${q(it.d || 'dishes')}, "", "", 0, 0, [], ${extras}, [], ""]` };
}
export function intro(st: State, ui: UI) {
  const b = new B(), i = Math.min(ui.intro, INTRO.length - 1), last = i === INTRO.length - 1;
  const { it, scr, bar, pan, from, extras } = introPage(st, ui, i);
  // El paso de antes y el de después se preparan ya (invisibles) para que el cambio sea fluido.
  const pv = '[' + [i - 1, i, i + 1].filter((j) => j >= 0 && j < INTRO.length).map((j) => introPage(st, ui, j).row).join(', ') + ']';
  return b.root('intro', [b.add(`Intro(${i}, ${INTRO.length}, ${q(it.t)}, ${q(it.x)}, ${q(it.i)}, ${last ? '@Intro(-1)' : `@Intro(${i + 1})`}, @Intro(-1), ${q(last ? 'Empezar' : 'Siguiente')}, ${q(it.n)}, ${it.s}, ${extras}, ${i > 0 ? `@Intro(${i - 1})` : 'null'}, ${q((it as any).d || 'dishes')}, ${q(scr)}, ${q(bar)}, ${pan}, ${from}, ${pv})`)]);
}

/** Consejos de primer uso: uno por pestaña, la primera vez que la abres (después de la presentación). */
const GUIDE: Record<string, [string, string]> = {
  plan: ['Tu menú del día', 'Toca una comida para ver su receta y su temporizador. Desliza a los lados para cambiar de día.'],
  mes: ['El mes entero', 'Toca un día para ir a su menú. Los puntos de color son las comidas de ese día.'],
  compra: ['Tu lista de la compra', 'Marca lo que vas comprando: pasa solo a tu despensa. Con «Comprado todo» marcas la lista entera.'],
  desp: ['Lo que tienes en casa', 'El menú intenta gastar antes lo que caduca antes. Toca + o − para cambiar las cantidades.'],
  tu: ['Tus datos', 'Con tu edad, altura y peso calculo tus calorías, proteína y fibra. Es opcional y puedes cambiarlo cuando quieras.'],
};
const screens: Record<string, (st: State, ui: UI) => string> = { plan, mes, compra, desp: despensa, tu, aj: ajustes, adv: ajustes };
export function body(st: State, ui: UI) {
  const s = screens[ui.tab](st, ui), g = GUIDE[ui.tab];
  if (!g || !st.intro || (st.dev?.tips || '').split(',').includes(ui.tab)) return s;
  return s.replace(/^root = Screen\(\[([^,\]]+)/, (_, first) => `root = Screen([${first}, tipG`) + `\ntipG = Guide(${q(g[0])}, ${q(g[1])}, @Tips(${q(ui.tab)}))`;
}

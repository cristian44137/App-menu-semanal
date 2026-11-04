// PDF de la app (Nevú Plus): el menú para la nevera y la lista de la compra.
// Se escriben en HTML con el estilo y las letras de la app, y el móvil los convierte en PDF (expo-print, ver
// platform.ts → htmlPdf). Así el texto largo se reparte en líneas solo y nunca se sale de su casilla.
//  · Menú (A4 apaisado): 1) la semana en una tabla, 2) tu semana en números, 3…) el libro de recetas.
//  · Compra (A4 vertical): por secciones del súper, con casillas para tachar, precios y total.
import { ACCENTS, SLOT } from './theme';
import { MN } from './nutri';
import { ING } from './data';
import { doneOf } from './cook';
import { antes, detalle } from './cocina';
import {
  DAYS, ORDER, SLN, STORES, State, active, add, caduca, calc, ctxOf, dayMeals, dishName, fmt, fmtTime, mask, mealCost, mins, nut, parse, prod, shop, slotTime,
  storeOf, subText, subbed, weekStats,
} from './logic';

/** Lo que el PDF necesita del móvil: las letras de la app (base64) y la ilustración de cada plato (data: URI). */
export type PdfAssets = { fonts: Partial<Record<FontKey, string>>; img: (dish: string) => string };
export type FontKey = 'n4' | 'n6' | 'n7' | 'n8' | 'm7' | 'm8';

const h = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const r = Math.round;
const eur = (n: number) => n.toFixed(2).replace('.', ',') + ' €';
const num = (n: number) => String(r(n * 10) / 10).replace('.', ',');
const unit = (id: string, x: number) => { const u = ING[id].u; return u === 'g' || u === 'ml' ? `${r(x)} ${u}` : `${num(x)} ${u}`; };
const pct = (x: number) => Math.max(0, Math.min(100, r(x * 100)));

/** Logotipo de Nevú (las mismas letras que play-store/logotipo.svg), del color del texto. */
const LOGO = (hgt: number) => `<svg class="logo" style="height:${hgt}px" viewBox="-10 74 352 128"><g fill="none" stroke="currentColor" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"><path d="M0 128 V192 M0 158 A30 30 0 0 1 60 158 V192"/><path d="M92 160 H156 A32 32 0 1 0 147 183"/><path d="M184 128 C192 158 200 192 214 192 C228 192 236 158 244 128"/><path d="M272 128 V162 A30 30 0 0 0 332 162 M332 128 V192"/></g><path d="M296 118 C296 100 306 86 324 80 C326 98 316 112 296 118 Z" fill="#8BF0CF"/></svg>`;

/** Estilos comunes: letras de la app (Nunito para el texto, Manrope para los títulos) y colores de tu acento. */
function css(a: PdfAssets, accent: string, accent2: string, page: string) {
  const ff = (fam: string, w: number, k: FontKey) => (a.fonts[k] ? `@font-face{font-family:${fam};font-weight:${w};src:url(data:font/ttf;base64,${a.fonts[k]}) format('truetype')}` : '');
  return `${ff('Nunito', 400, 'n4')}${ff('Nunito', 600, 'n6')}${ff('Nunito', 700, 'n7')}${ff('Nunito', 800, 'n8')}${ff('Manrope', 700, 'm7')}${ff('Manrope', 800, 'm8')}
@page{size:${page};margin:0}
*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
html,body{margin:0;padding:0}
body{font-family:Nunito,system-ui,sans-serif;color:#13263B;font-size:9.5pt;line-height:1.3;background:#fff}
.pg{position:relative;overflow:hidden;page-break-after:always;break-after:page;background:#F5F8FC}
.pg:last-child{page-break-after:auto;break-after:auto}
h1,h2,h3{font-family:Manrope,Nunito,sans-serif;font-weight:800;margin:0;letter-spacing:-.2px}
.band{color:#fff;background:linear-gradient(120deg,${accent},${accent2});display:flex;align-items:center;gap:14px}
.band .logo{color:#fff;flex:none}
.band .t{flex:1;min-width:0}.band h1{font-size:19pt;line-height:1.1}.band .s{font-size:9.5pt;opacity:.92;font-weight:700}
.chip{display:inline-block;padding:3px 9px;border-radius:99px;background:rgba(255,255,255,.2);font-weight:800;font-size:8.5pt;margin-left:6px;white-space:nowrap}
.card{background:#fff;border-radius:14px;border:1px solid #E3EAF2}
.mu{color:#5A6B7E}.b{font-weight:800}
.foot{position:absolute;left:0;right:0;bottom:0;padding:0 14mm 5mm;font-size:7.5pt;color:#7A8899;display:flex;justify-content:space-between}
.clamp2{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.clamp3{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.bar{height:6px;border-radius:6px;background:#E8EEF5;overflow:hidden}.bar i{display:block;height:100%;border-radius:6px}`;
}
const doc = (style: string, body: string) => `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>${style}</style></head><body>${body}</body></html>`;
const accentOf = (st: State) => { const A = ACCENTS[st.set.accent] || ACCENTS[0]; return [A.l, A.g] as const; };
const foot = (left: string, page: number, pages: number) => `<div class="foot"><span>${h(left)}</span><span>Nevú · ${page} / ${pages}</span></div>`;

/** Platos de la semana (para cargar solo sus ilustraciones). */
export const dishesOf = (st: State, w: string) => { const p = st.plans[w]; return p ? [...new Set(p.sel.flatMap((d, i) => dayMeals(mask(st.set, d), p.q[i]).filter(Boolean).map((m) => m![0])))] : []; };

/* ---------- menú para la nevera ---------- */
export function fridgeHtml(st: State, w: string, a: PdfAssets): string {
  const p = st.plans[w], s = st.set, W = parse(w), [ac, ac2] = accentOf(st);
  const slots = ORDER.filter((k) => active(s)[k]);
  const range = `${fmt(W)} – ${fmt(add(W, 6))}`;
  const days = p.sel.map((d, i) => { const m = mask(s, d); return { i, m, meals: dayMeals(m, p.q[i]), n: nut(m, p.q[i]) }; });

  // 1) La semana: una fila por comida, una columna por día. Cada casilla: ilustración, nombre (hasta 3 líneas) y datos.
  const cell = (k: number, i: number) => {
    const m = days[i].meals[k]; if (!m || days[i].m[k] < 0) return `<td class="empty">—</td>`;
    const name = dishName(m[0], p, m[3]), img = a.img(m[0]);
    return `<td><div class="cell">${img ? `<img src="${img}">` : `<span class="dot" style="background:${SLOT[k]}"></span>`}<div class="nm clamp3">${h(name)}</div><div class="mt">${mins(m)} min · ${r(m[4][0])} kcal</div></div></td>`;
  };
  const rowH = (142 / slots.length).toFixed(1), many = slots.length >= 6;
  const grid = `<table class="wk${many ? ' many' : ''}"><thead><tr><th></th>${DAYS.map((d, i) => `<th><b>${d}</b> ${add(W, i).getDate()}</th>`).join('')}</tr></thead><tbody>
    ${slots.map((k) => `<tr style="height:${rowH}mm"><th class="sl"><span class="pill" style="background:${SLOT[k]}22;color:${SLOT[k]}">${h(SLN[k])}</span><span class="tm">${fmtTime(slotTime(s, k))}</span></th>${DAYS.map((_, i) => cell(k, i)).join('')}</tr>`).join('')}
    </tbody></table>`;

  // 2) Tu semana en números (exclusivo de Plus): medias frente a tu objetivo, día a día y vitaminas y minerales.
  const avg = [0, 1, 4].map((j) => days.reduce((t, d) => t + d.n[j], 0) / 7), minsDay = days.map((d) => d.meals.reduce((t, m) => t + (m ? mins(m) : 0), 0));
  const ws = weekStats(p, s, ctxOf(st, w)), sh = shop(p, s, st.conf, st.pantry, w), c = calc(st.perfil);
  const uniq = new Set(days.flatMap((d) => d.meals.filter(Boolean).map((m) => m![0]))).size;
  const stat = (big: string, small: string, sub: string, f?: number, col = ac) => `<div class="card st"><div class="big">${big}<small>${small}</small></div><div class="mu">${sub}</div>${f != null ? `<div class="bar"><i style="width:${pct(f)}%;background:${col}"></i></div>` : ''}</div>`;
  const stats = [
    stat(String(r(avg[0])), ' kcal', `media al día · objetivo ${s.k}`, avg[0] / s.k, '#EF6A4C'),
    stat(String(r(avg[1])), ' g', `proteína al día · mínimo ${s.p}`, avg[1] / s.p, '#F2774B'),
    stat(String(r(avg[2])), ' g', `fibra al día · mínimo ${s.f}`, avg[2] / s.f, '#2FBF84'),
    stat(String(r(minsDay.reduce((x, y) => x + y, 0) / 7)), ' min', 'en la cocina al día'),
    stat(eur(sh.sum), '', `compra de la semana · ${STORES[s.store]}`),
    stat(String(uniq), '', 'recetas distintas esta semana'),
  ].join('');
  const dayRows = days.map((d, i) => `<tr><td class="b">${DAYS[i]} ${add(W, i).getDate()}</td>
    <td><div class="kc"><div class="bar"><i style="width:${pct(d.n[0] / (s.k * 1.25))}%;background:${d.n[0] >= s.k * 0.9 && d.n[0] <= s.k * 1.1 ? '#2FBF84' : '#F4B23E'}"></i></div><span>${r(d.n[0])}</span></div></td>
    <td>${r(d.n[1])} g</td><td>${r(d.n[4])} g</td><td>${minsDay[i]} min</td></tr>`).join('');
  const micro = MN.map((x, i) => [x.n, ws.cov[i]] as [string, number]).filter((_, i) => i > 0)
    .map(([n, v]) => `<div class="mi"><span>${h(n)}</span><div class="bar"><i style="width:${pct(v)}%;background:${v >= 0.8 ? '#2FBF84' : '#F4B23E'}"></i></div><b>${pct(v)} %</b></div>`).join('');
  const exp = caduca(p, s, W).slice(0, 5).map((x) => `<li><b>${h(x.name)}</b>: ${h(x.text)}</li>`).join('');
  const who = c ? `Calculado para ti: ${st.perfil.age} años, ${st.perfil.h} cm y ${st.perfil.w} kg.` : 'Objetivo general: rellena tu edad, altura y peso en «Tú» para afinarlo.';

  // 3…) Libro de recetas: cada plato de la semana una vez, con ingredientes, pasos y cómo debe quedar.
  const seen = new Set<string>(), recipes: { k: number; m: any }[] = [];
  // Desayuno, comida y cena (las meriendas y bebidas son de un paso o dos: están en la app).
  slots.filter((k) => k <= 2).forEach((k) => days.forEach((d) => { const m = d.meals[k]; if (m && d.m[k] >= 0 && !seen.has(m[0])) { seen.add(m[0]); recipes.push({ k, m }); } }));
  const recipe = ({ k, m }: { k: number; m: any }) => {
    const img = a.img(m[0]), [punto] = doneOf(m);
    const ings = m[3].map(([g0, q0]: [string, number]) => { const [g, q] = subbed(p, g0, q0), P = prod(s.store, g, st.conf); return `<li><b>${unit(g, q)}</b> ${h(ING[g].n)}${P?.b ? ` <span class="mu">· ${h(P.b)}</span>` : ''}</li>`; }).join('');
    const steps = subText(m[5], p, m[3]).split('|').map((t: string) => `<li>${h(detalle(t))}</li>`).join('');
    const prev = antes(m[3].map(([g0, q0]: [string, number]) => subbed(p, g0, q0)), (g) => ING[g].n).map(([n, x]) => `<b>${h(n)}:</b> ${h(x)}`).join(' ');
    return `<div class="card rc"><div class="rh">${img ? `<img src="${img}">` : `<span class="dot" style="background:${SLOT[k]}"></span>`}<div><div class="pill" style="background:${SLOT[k]}22;color:${SLOT[k]}">${h(SLN[k])}</div><h3>${h(dishName(m[0], p, m[3]))}</h3><div class="mu">${mins(m)} min · ${r(m[4][0])} kcal · ${r(m[4][1])} g prot. · ${eur(mealCost(m, s.store, st.conf))}</div></div></div>
      <ul class="ing">${ings}</ul>${prev ? `<div class="pv">${prev}</div>` : ''}<ol class="steps">${steps}</ol>${punto ? `<div class="ok"><b>Cómo debe quedar:</b> ${h(subText(punto, p, m[3]))}</div>` : ''}</div>`;
  };
  // Alto aproximado de cada receta (mm) para llenar 3 columnas por página sin que ninguna se corte.
  const tall = ({ m }: { m: any }) => 26 + m[3].length * 4.3 + subText(m[5], p, m[3]).split('|').reduce((t: number, x: string) => t + Math.ceil(detalle(x).length / 52) * 4.1, 0) + (doneOf(m)[0] ? 10 : 0)
    + antes(m[3], (g) => ING[g].n).reduce((t, [n, x]) => t + (n.length + x.length) * 0.08, 0);
  const books: string[] = []; let cols: string[][] = [[]], used = [0];
  const flush = () => { if (cols.some((c) => c.length)) books.push(cols.map((c) => `<div class="col">${c.join('')}</div>`).join('')); cols = [[]]; used = [0]; };
  for (const x of recipes) {
    const hh = tall(x);
    if (used[used.length - 1] + hh > 158) { if (cols.length === 3) flush(); else { cols.push([]); used.push(0); } }
    cols[cols.length - 1].push(recipe(x)); used[used.length - 1] += hh + 3.5;
  }
  flush();
  const pages = 2 + books.length, note = 'Orientación nutricional general, no consejo médico. Revisa los alérgenos en la etiqueta.';

  const style = css(a, ac, ac2, 'A4 landscape') + `
.pg{width:297mm;height:210mm}
.band{padding:7mm 14mm 6mm}
.wrap{padding:4mm 10mm 12mm}
table.wk{width:100%;border-collapse:separate;border-spacing:2mm;table-layout:fixed}
.wk.many td{padding:1.6mm 2mm}.wk.many .cell img,.wk.many .cell .dot{width:6.5mm;height:6.5mm;margin-bottom:.6mm}.wk.many .cell .mt{margin-top:.6mm}.wk.many .cell .nm{font-size:7.8pt;line-height:1.18}
.wk thead th{height:8mm;background:#13263B;color:#fff;border-radius:8px;font-weight:700;font-size:9.5pt}
.wk th.sl{width:25mm;text-align:left;vertical-align:middle}
.wk .pill,.rc .pill{display:inline-block;padding:2px 7px;border-radius:99px;font-weight:800;font-size:7.5pt;line-height:1.25}
.wk .tm{display:block;margin:3px 0 0 3px;font-size:8pt;color:#5A6B7E;font-weight:700}
.wk td{background:#fff;border-radius:10px;border:1px solid #E3EAF2;vertical-align:top;padding:2mm 2.2mm;overflow:hidden}
.wk td.empty{text-align:center;vertical-align:middle;color:#B5C0CC}
.cell img,.cell .dot{width:9.5mm;height:9.5mm;border-radius:50%;object-fit:cover;display:block;margin-bottom:1.3mm;background:#EEF3F8}
.cell .nm{font-weight:800;font-size:8.3pt;line-height:1.22}
.cell .mt{font-size:7pt;color:#5A6B7E;margin-top:1mm;font-weight:700}
.sts{display:grid;grid-template-columns:repeat(6,1fr);gap:3mm;margin-bottom:4mm}
.st{padding:3.5mm}.st .big{font-family:Manrope,Nunito;font-weight:800;font-size:17pt}.st .big small{font-size:9pt;font-weight:700;color:#5A6B7E}.st .bar{margin-top:2mm}
.two{display:grid;grid-template-columns:1.15fr 1fr;gap:4mm}
.two .card{padding:4mm 5mm}.two h2{font-size:12pt;margin-bottom:2.5mm}
table.dy{width:100%;border-collapse:collapse}.dy td,.dy th{padding:1.6mm 1mm;border-bottom:1px solid #EEF2F7;text-align:left;font-size:9pt}.dy th{color:#5A6B7E;font-size:8pt}
.kc{display:flex;align-items:center;gap:2mm}.kc .bar{flex:1}.kc span{width:10mm;text-align:right;font-weight:800}
.mis{display:grid;grid-template-columns:1fr 1fr;gap:1.8mm 5mm}.mi{display:grid;grid-template-columns:24mm 1fr 10mm;align-items:center;gap:2mm;font-size:8.3pt}.mi b{text-align:right}
ul.ex{margin:2mm 0 0;padding-left:4mm}ul.ex li{margin:.8mm 0}
.books{display:grid;grid-template-columns:repeat(3,1fr);gap:3.5mm;align-items:start}.books .col{display:flex;flex-direction:column;gap:3.5mm}
.rc{padding:3.5mm 4mm;break-inside:avoid}
.rh{display:flex;gap:3mm;align-items:center;margin-bottom:2mm}.rh img,.rh .dot{width:15mm;height:15mm;border-radius:50%;object-fit:cover;flex:none}.rh h3{font-size:10.5pt;line-height:1.2;margin:1mm 0 .6mm}.rh .mu{font-size:7.8pt}
ul.ing{margin:0 0 2mm;padding-left:4mm;font-size:8.2pt}ol.steps{margin:0;padding-left:4.5mm;font-size:8.2pt}ol.steps li{margin:.6mm 0}
.pv{margin:0 0 2mm;padding:1.6mm 2.5mm;border-radius:8px;background:#EEF4FF;color:#28456E;font-size:7.6pt}
.ok{margin-top:2mm;padding:2mm 2.5mm;border-radius:8px;background:#EAF7F1;color:#1F6E50;font-size:7.8pt}`;

  const head = (title: string, sub: string, chips = '') => `<div class="band">${LOGO(34)}<div class="t"><h1>${h(title)}</h1><div class="s">${h(sub)}</div></div><div>${chips}</div></div>`;
  const p1 = `<section class="pg">${head('Menú de la semana', range, `<span class="chip">${s.k} kcal al día</span><span class="chip">Platos de ${s.maxMin} min o menos</span>`)}<div class="wrap">${grid}</div>${foot(note, 1, pages)}</section>`;
  const p2 = `<section class="pg">${head('Tu semana en números', range)}<div class="wrap"><div class="sts">${stats}</div>
    <div class="two"><div class="card"><h2>Día a día</h2><table class="dy"><tr><th></th><th>Calorías</th><th>Proteína</th><th>Fibra</th><th>Cocina</th></tr>${dayRows}</table><div class="mu" style="margin-top:2.5mm">${h(who)}</div></div>
    <div class="card"><h2>Vitaminas y minerales</h2><div class="mis">${micro}</div>${ws.low.length ? `<div class="mu" style="margin-top:2.5mm">A reforzar: ${h(ws.low.join(', '))}.</div>` : ''}
    ${exp ? `<h2 style="margin-top:4mm">Aprovecha antes de que caduque</h2><ul class="ex">${exp}</ul>` : ''}</div></div></div>${foot(note, 2, pages)}</section>`;
  const pb = books.map((x, i) => `<section class="pg">${head('Recetas de la semana', `${range} · desayunos, comidas y cenas`)}<div class="wrap"><div class="books">${x}</div></div>${foot(note, 3 + i, pages)}</section>`).join('');
  return doc(style, p1 + p2 + pb);
}

/* ---------- lista de la compra ---------- */
export function shopHtml(st: State, w: string, a: PdfAssets): string {
  const p = st.plans[w], s = st.set, W = parse(w), [ac, ac2] = accentOf(st), sh = shop(p, s, st.conf, st.pantry, w);
  const bud = s.budget > 0 ? Math.round((s.budget * sh.days) / 7 * 100) / 100 : 0;
  const both = s.store === 2;
  const sec = sh.sec.map((x) => `<div class="card sec"><h2>${h(x.n)}<span class="mu"> · ${x.lines.length}</span></h2>${x.lines.map((l) => {
    const P = prod(s.store, l.id, st.conf)!, tag = both ? ['Mercadona', 'Día'][storeOf(2, l.id, st.conf)] || '' : '';
    return `<div class="ln${l.done ? ' done' : ''}"><span class="bx">${l.done ? '✓' : ''}</span><div class="tx"><div class="b">${l.n} × ${h(P.n)}</div><div class="mu">${h([P.pk, P.b, tag].filter(Boolean).join(' · '))}${l.from ? ` · en lugar de ${h(ING[l.from].n)}` : ''}</div></div><div class="pr">${eur(l.n * l.price)}</div></div>`;
  }).join('')}</div>`).join('');
  const style = css(a, ac, ac2, 'A4 portrait') + `
.pg{width:210mm;min-height:297mm;padding-bottom:16mm;page-break-after:auto}
.band{padding:8mm 14mm 7mm}
.wrap{padding:6mm 14mm 0}
.sts{display:grid;grid-template-columns:repeat(3,1fr);gap:3mm;margin-bottom:5mm}
.st{padding:3.5mm 4mm}.st .big{font-family:Manrope,Nunito;font-weight:800;font-size:16pt}
.cols{column-count:2;column-gap:5mm}
.sec{break-inside:avoid;padding:3.5mm 4.5mm 2mm;margin-bottom:5mm}.sec h2{font-size:11.5pt;color:${ac};margin-bottom:1.5mm}
.ln{display:flex;align-items:flex-start;gap:2.5mm;padding:2mm 0;border-top:1px solid #EEF2F7}.ln:first-of-type{border-top:0}
.bx{flex:none;width:4.2mm;height:4.2mm;border:1.6px solid #9AA8B8;border-radius:4px;margin-top:.6mm;font-size:8pt;line-height:3.6mm;text-align:center;color:#1F7A55;font-weight:800}
.done .bx{border-color:#1F7A55}.done .tx .b{text-decoration:line-through;color:#7A8899}
.tx{flex:1;min-width:0}.tx .b{font-size:9.5pt;line-height:1.25}.tx .mu{font-size:7.8pt}
.pr{flex:none;font-weight:800;font-size:9.5pt}
.tot{display:flex;justify-content:space-between;align-items:center;padding:4mm 5mm;margin-top:1mm;break-inside:avoid}.tot b{font-family:Manrope,Nunito;font-size:15pt}
.foot{position:static;padding:4mm 14mm 0}`;
  const st3 = [
    `<div class="card st"><div class="big">${sh.all}</div><div class="mu">productos</div></div>`,
    `<div class="card st"><div class="big">${eur(sh.sum)}</div><div class="mu">${both ? `${eur(sh.byStore[0])} Mercadona · ${eur(sh.byStore[1])} Día` : 'total estimado'}</div></div>`,
    `<div class="card st"><div class="big">${bud ? eur(bud) : '—'}</div><div class="mu">${bud ? (sh.sum <= bud ? 'presupuesto: dentro' : 'presupuesto: un poco por encima') : 'sin límite de presupuesto'}</div></div>`,
  ].join('');
  const sub = `Semana del ${fmt(W)} – ${fmt(add(W, 6))} · ${STORES[s.store]}${sh.days < 7 ? ` · para lo que queda de semana (${sh.days} días)` : ''}`;
  const body = `<section class="pg"><div class="band">${LOGO(34)}<div class="t"><h1>Lista de la compra</h1><div class="s">${h(sub)}</div></div></div>
    <div class="wrap"><div class="sts">${st3}</div><div class="cols">${sec || '<div class="card sec">No hace falta comprar nada: con tu despensa te llega.</div>'}</div>
    <div class="card tot"><span class="b">Total estimado</span><b>${eur(sh.sum)}</b></div></div>
    <div class="foot"><span>Precios orientativos: pueden variar según la tienda y el día. Revisa los alérgenos en la etiqueta.</span><span>Nevú</span></div></section>`;
  return doc(style, body);
}

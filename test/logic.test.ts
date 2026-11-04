import { makeTheme } from '../src/theme';
import { writeFileSync, readFileSync } from 'fs';
import {
  dishName, subText,
  DEFAULT, ORDER, SLN, scale, prod, avail, newPlan, nut, shop, calc, generate, tune, advice, caduca, mask, monday, allowed, lst, minutes, mins, prep,
  storeOf, ctxOf, openSlots, autoTune, vetoed, weekStats, weekScore, ymd, parse, add, expiry, pantrySoon, micro, nextSlot, isNow, easiest, changed, pastDays, budgetFlex, slotTime,
} from '../src/logic';
import { ING, M } from '../src/data';
import { MICRO } from '../src/nutri';
import { SECTIONS, subQty } from '../src/subs';
import { DONE } from '../src/cook';
import { VERSION, NEWS } from '../src/news';
import { handle, firstUI, reminders, mergeState, calendarEvents, cloudCopy, mergeStates, hasPlus, PLUS_EXPORTS } from '../src/controller';
import { fridgeHtml, shopHtml, dishesOf, PdfAssets } from '../src/pdf';
import { antes, detalle, PELAR } from '../src/cocina';
import { body, nav, sheet, intro, greet, ajustes, INTRO } from '../src/screens';
import { push, pull, decide } from '../src/cloud';

const ok = (c: boolean, m: string) => { if (!c) { console.error('FALLO:', m); process.exit(1); } console.log('ok  ', m); };
const rnd = (seed: number) => { let x = seed; return () => (x = (x * 16807) % 2147483647) / 2147483647; };
const W = ymd(monday(new Date())), base = { conf: {}, pantry: {}, w: W, today: W, sex: 'm' as const };
const s = { ...DEFAULT.set }; const p = newPlan();

/* ---------- catálogo ---------- */
const total = Object.values(M).reduce((a, l) => a + l.length, 0);
ok(total >= 88, `catálogo de platos: ${total} (con bebidas)`);
ok(M.B.length >= 8, 'hay una lista de bebidas');
ok(Object.keys(ING).length >= 75, `ingredientes: ${Object.keys(ING).length}`);
ok(Object.keys(ING).every((id) => MICRO[id]), 'todos los ingredientes tienen micronutrientes');
ok(Object.values(M).flat().every((m) => m[3].every(([g]) => ING[g])), 'todos los ingredientes de las recetas existen');
ok(Object.values(M).flat().every((m) => m[4][0] > 0), 'todas las recetas tienen nutrición calculada');
ok(!JSON.stringify(M).match(/\p{Extended_Pictographic}/u), 'sin emojis en los datos');
ok(ORDER.indexOf(3) === 1 && ORDER.indexOf(1) === 2, 'la merienda va entre el desayuno y la comida');

/* ---------- tiempo de preparación ---------- */
const avena = M.D[0];
ok(mins(avena) === avena[2] + prep(avena) && prep(avena) >= 2, `el tiempo incluye sacar y pesar (${avena[2]} + ${prep(avena)} min)`);

/* ---------- supermercados ---------- */
ok(prod(0, 'pollo')!.n !== prod(1, 'pollo')!.n, 'el producto cambia con el supermercado');
const cheap = Object.keys(ING).filter((id) => ING[id].M && ING[id].D).every((id) => { const st2 = storeOf(2, id); const P = ING[id][st2 ? 'D' : 'M']!, O = ING[id][st2 ? 'M' : 'D']!; return P.p / P.q <= O.p / O.q + 1e-9; });
ok(cheap, '«Más barato» elige para cada producto la tienda con menor precio por unidad');
ok(storeOf(2, 'tofu') === 0, 'si solo una tienda lo tiene, se compra ahí');
const sC = { ...s, store: 2 }, shC = shop(p, sC);
ok(shC.byStore[0] > 0 && shC.byStore[1] > 0 && Math.abs(shC.byStore[0] + shC.byStore[1] - shC.sum) < 1e-6, `con «Más barato» la compra se reparte: ${shC.byStore.map((x) => x.toFixed(2)).join(' € + ')} €`);
ok(shC.sum <= Math.min(shop(p, { ...s, store: 0 }).sum, shop(p, { ...s, store: 1 }).sum) + 2, 'la compra con «Más barato» no sale más cara que en una sola tienda (± envases)');

/* ---------- dietas ---------- */
const fishy = M.C.findIndex((m) => m[3].some(([g]) => g === 'salmahu'));
ok(allowed(s, 1, fishy) && !allowed({ ...s, ex: { ...s.ex, fish: true } }, 1, fishy), 'pescado y marisco: permitidos por defecto, se pueden excluir');
const pavoD = M.D.findIndex((m) => m[3].some(([g]) => g === 'pavo'));
ok(!allowed({ ...s, ex: { ...s.ex, cured: true } }, 0, pavoD) && allowed({ ...s, ex: { ...s.ex, meat: true } }, 0, pavoD), 'sin embutidos y sin carne son opciones separadas');
const pastaC = M.C.findIndex((m) => m[3].some(([g]) => g === 'pasta'));
ok(!allowed({ ...s, ex: { ...s.ex, flour: true } }, 1, pastaC), 'sin harinas quita la pasta');

/* ---------- generador ---------- */
const ex = { ...s, ex: { ...s.ex, meat: true, gluten: true }, maxMin: 12, k: 2340 };
let t0 = Date.now(); const g = generate(ex, rnd(7), base); const ms = Date.now() - t0;
ok(g.sel.every((d) => d.every((v, k) => v < 0 || allowed(ex, k, v))), 'el generador respeta sin carne, sin gluten y ≤ 12 min');
ok(g.sel.every((d) => d.length === 6 && d[5] >= 0), 'cada día lleva bebida');
const avg = g.sel.reduce((a, d, i) => a + nut(mask(ex, d), g.q[i])[0], 0) / 7;
ok(avg > 2000, 'el generador se acerca a las calorías pese a las restricciones: ' + Math.round(avg));
ok(ms < 4000, `generar la semana tarda ${ms} ms`);
ok(g.sel.every((d, i) => advice(g, i, ex, base) === null), 'cada día generado ya está optimizado (sin consejos pendientes)');

/* ---------- presupuesto y micronutrientes ---------- */
const free = generate(s, rnd(3), base), costFree = weekStats(free, s, base).cost;
const reps = Math.max(...Object.values(free.sel.flat().reduce((a: any, v, i) => { const k = `${lst(i % 6) === lst(4) ? 'M' : i % 6}-${v}`; if (v >= 0) a[k] = (a[k] || 0) + 1; return a; }, {})) as number[]);
ok(reps <= 3, `variedad con los ajustes por defecto: ningún plato se repite más de ${reps} veces`);
const tight = { ...s, budget: Math.round(costFree * 0.75) };
t0 = Date.now(); const tuned = tune(free, tight, base); const msT = Date.now() - t0;
const st1 = weekStats(tuned, tight, base);
ok(st1.cost < costFree, `bajar el presupuesto abarata el menú: ${costFree.toFixed(2)} → ${st1.cost.toFixed(2)} € (${msT} ms)`);
const avgT = tuned.sel.reduce((a, d, i) => a + nut(mask(tight, d), tuned.q[i])[0], 0) / 7;
ok(Math.abs(avgT - s.k) / s.k < 0.1, `y sigue cerca de las calorías: ${Math.round(avgT)} kcal de media`);
const lowFree = weekStats(free, s, base).low.length, lowTight = st1.low.length;
ok(lowTight <= lowFree + 2, `y de los micronutrientes: ${lowTight} por debajo del 80 % (antes ${lowFree})`);
const moodS = { ...s, mood: true, ex: { ...s.ex, fish: false } }, moodP = generate(moodS, rnd(5), base);
ok(weekStats(moodP, moodS, base).cov[9] > weekStats(free, s, base).cov[9], 'con «Ánimo y estrés» y pescado sube el omega-3');
const coldS = { ...s, cold: true }, coldP = generate(coldS, rnd(9), base);
ok(coldP.sel.every((d, i) => mask(coldS, d).some((v, k) => v >= 0 && lst(k)[v][1].includes('R'))), 'con «Estoy resfriado» cada día hay algo para el resfriado');
const longS = { ...s, maxMin: 45 }, longP = generate(longS, rnd(11), base);
ok(longP.sel.some((d) => [1, 2].some((k) => d[k] >= 0 && mins(lst(k)[d[k]]) > 20)), 'con más tiempo máximo entran recetas más elaboradas');

/* ---------- despensa ---------- */
const today = W, pan: any = { leche: { q: 800, at: today, open: today }, espin: { q: 400, at: today } };
ok(expiry('leche', pan.leche) === ymd(add(parse(today), ING.leche.life)) && expiry('espin', pan.espin) === null, 'caducidad desde la apertura; los congelados son de larga duración');
ok(pantrySoon(pan, today, 7).length === 1, 'lo que caduca pronto se detecta');
const shopNo = shop(p, s, {}, {}, W).r, shopYes = shop(p, s, {}, pan, W).r;
const lecheN = (r: any) => Object.values(r).flat().find((l: any) => l.id === 'leche') as any;
ok(!lecheN(shopNo) || !lecheN(shopYes) || lecheN(shopYes).n <= lecheN(shopNo).n, 'lo que hay en la despensa no se vuelve a comprar');
const ctxP = { ...base, pantry: { garb: { q: 400, at: today, open: today } } }, sP = { ...s, pantryFirst: true };
const withP = generate(sP, rnd(13), ctxP), usesGarb = withP.sel.slice(0, 3).some((d) => mask(sP, d).some((v, k) => v >= 0 && lst(k)[v][3].some(([g2]) => g2 === 'garb')));
ok(usesGarb, 'con prioridad a la despensa, los garbanzos abiertos se usan en los primeros días');

/* ---------- perfil ---------- */
const c = calc({ sex: 'm', age: 19, h: 175, w: 70, act: 1.375, goal: 0 })!;
ok(c.kc === 2340 && c.p === 84 && c.f === 33, `perfil 19a/175/70 → ${c.kc} kcal, ${c.p} g prot, ${c.f} g fibra`);
ok(calc({ sex: 'f', age: 17, h: 160, w: 40, act: 1.2, goal: -0.15 })!.low, 'IMC bajo no permite bajar de peso');
ok(caduca(p, s, monday(new Date())).length >= 0, 'caducidades del menú');
ok(micro(M.C[0]).length === 10, 'micronutrientes por plato');
/* ---------- uso real: días pasados, algo más fácil, qué toca ahora ---------- */
const wed = ymd(add(parse(W), 3)), before = generate(s, rnd(21), base);
const later = tune(before, { ...s, budget: 25 }, { ...base, today: wed });
ok(later.sel.slice(0, 3).every((d, i) => d.every((v, k) => v === before.sel[i][k])), 'al reajustar no cambian los días que ya han pasado');
ok(changed(before, later) >= 0 && pastDays(W, wed) === 3, 'se cuentan los platos cambiados');
const d0 = mask(s, before.sel[0]), slow = d0[1], fast = easiest(s, 1, slow, {});
ok(fast === slow || mins(lst(1)[fast]) < mins(lst(1)[slow]), '«Algo más fácil» elige un plato más rápido');
ok(nextSlot(s, d0, () => false, 7 * 60) === 0 && nextSlot(s, d0, () => false, 10 * 60 + 30) === 3 && nextSlot(s, d0, () => false, 23 * 60 + 50) === -1, '«Ahora toca» sigue el horario (desayuno, merienda, nada al final del día)');
ok(nextSlot(s, d0, (k) => k === 0, 7 * 60) === 3, 'lo ya cocinado no vuelve a salir en «Ahora toca»');
const vegan = { ...s, ex: { ...s.ex, dairy: true, egg: true, meat: true, cured: true } };
ok(lst(0).filter((_, j) => allowed(vegan, 0, j)).length >= 4, `sin lácteos, huevo ni carne quedan ${lst(0).filter((_, j) => allowed(vegan, 0, j)).length} desayunos`);
console.log('todo correcto 1');

/* ---------- controlador e interfaz ---------- */
let st = mergeState({}), ui = firstUI();
const go = (type: string, params?: any) => { const r = handle(st, ui, { type, params }); st = r.st; ui = r.ui; return r; };
ok(!st.intro, 'la presentación se muestra la primera vez');
go('Intro', { page: 1 }); ok(ui.intro === 1, 'la presentación avanza'); go('Intro', { page: -1 }); ok(st.intro, 'y se cierra');
go('Gen'); ok(!!st.plans[ui.w], 'Gen crea el plan de la semana');
go('Open', { kind: 'recipe', k: 1 }); go('Open', { kind: 'pick', k: 1, from: 'recipe' });
const alt = st.plans[ui.w].sel[ui.day][1] === 0 ? 1 : 0; go('Choose', { k: 1, j: alt });
ok(st.plans[ui.w].sel[ui.day][1] === alt && ui.sheet?.kind === 'recipe', 'desde la receta se cambia el plato al momento y vuelve a la receta');
ok(st.plans[ui.w].l![`${ui.day}-1`], 'el plato elegido a mano queda fijado');
go('Cfg', { key: 'budget', value: 30 }); ok(st.plans[ui.w].sel[ui.day][1] === alt, 'al reajustar por presupuesto se respeta lo elegido a mano');
const sh0 = shop(st.plans[ui.w], st.set, st.conf, st.pantry, ui.w), first = sh0.r.E[0] || sh0.r.F[0];
go('Check', { id: first.id }); ok(!!st.pantry[first.id], 'lo marcado en el carrito entra en la despensa');
const sh1 = shop(st.plans[ui.w], st.set, st.conf, st.pantry, ui.w);
ok(Object.values(sh1.r).flat().some((l) => l.id === first.id && l.done), 'y sigue en la lista, marcado');
go('Check', { id: first.id }); ok(!st.pantry[first.id], 'desmarcarlo lo saca de la despensa');
go('Price', { id: 'avena', value: 0.75 }); ok(st.conf[`${storeOf(st.set.store, 'avena')}:avena`].p === 0.75, 'el precio confirmado se recuerda');
go('PanAdd', { id: 'leche' }); const q0 = st.pantry.leche.q; go('PanStep', { id: 'leche', d: -1 }); ok(st.pantry.leche.q < q0, 'la cantidad de la despensa se edita con − y +');
go('PanQ', { id: 'leche', value: 300 }); ok(st.pantry.leche.q === 300, 'y escribiendo la cantidad');
go('PanOpen', { id: 'leche' }); ok(!!st.pantry.leche.open, 'se puede marcar como abierto');
const dk = ORDER.find((k) => st.plans[ui.w].sel[ui.day][k] >= 0 && lst(k)[st.plans[ui.w].sel[ui.day][k]][3].some(([g2]) => g2 === 'leche'));
if (dk != null) { const before = st.pantry.leche.q; go('Cooked', { k: dk }); ok(!st.pantry.leche || st.pantry.leche.q < before, '«Lo he cocinado» descuenta de la despensa'); }
// Los días que ya han pasado no se tocan al reajustar (por eso se excluyen de la comprobación).
const pd = pastDays(ui.w, ymd(new Date()));
go('Cfg', { key: 'ex.meat', value: true }); ok(st.set.ex.meat && st.plans[ui.w].sel.every((d, i) => d.every((v, k) => i < pd || v < 0 || st.plans[ui.w].l?.[`${i}-${k}`] || allowed(st.set, k, v, false))), 'al cambiar la dieta se reajusta la semana');
go('Cfg', { key: 'store', value: 1 }); ok(st.plans[ui.w].sel.every((d, i) => d.every((v, k) => i < pd || v < 0 || avail(1, lst(k)[v]))), 'al cambiar de supermercado se sustituyen los platos no disponibles');
go('Prof', { key: 'age', value: 19 }); go('Prof', { key: 'h', value: 175 }); go('Prof', { key: 'w', value: 70 }); ok(st.set.k === 2340, 'perfil actualiza las calorías objetivo');
go('Cfg', { key: 'notif', value: true }); go('Cfg', { key: 'meals', value: true });
ok(reminders(st, new Date(parse(ui.w).getTime() - 5 * 864e5)).length > 10, 'avisos programados para la semana');
go('Cfg', { key: 't1', value: 13 * 60 + 30 }); ok(calendarEvents(st, ui).some((e) => e.start.getHours() === 13 && e.start.getMinutes() === 30), 'los eventos del calendario usan la hora elegida');
go('Cfg', { key: 'simple', value: true }); ui.tab = 'plan';
ok(body(st, ui).includes('SimpleRow(') && !body(st, ui).includes('Hero(') && !body(st, ui).includes('Micro('), 'modo sencillo: lista del día sin cifras');
go('Cfg', { key: 'simple', value: false });
go('Open', { kind: 'recipe', k: 1 }); go('TimerStart', { sec: 300, end: Date.now() + 300000 }); go('Close');
ok(!!ui.timer && ui.timer.k === 1, 'el temporizador sigue al cerrar la receta'); go('OpenTimer'); ok(ui.sheet?.kind === 'recipe' && ui.sheet.k === 1, 'y lleva de vuelta a su receta');
ok(sheet(st, ui)!.includes('Timer(') && !/Timer\(\d+, 0\)/.test(sheet(st, ui)!), 'la receta muestra la cuenta atrás en marcha'); go('TimerStop'); go('Close');
for (const tab of ['plan', 'mes', 'compra', 'desp', 'tu', 'aj', 'adv'] as const) { ui.tab = tab; ok(body(st, ui).startsWith('root = Screen('), 'pantalla ' + tab + ' generada'); }
ui.tab = 'plan'; ok(body(st, ui).indexOf('Meal(3,') < body(st, ui).indexOf('Meal(1,'), 'en el plan la merienda sale antes que la comida');
ui.tab = 'plan'; { const pl = body(st, ui); ok(!pl.includes('Meal(4,') || pl.indexOf('Meal(4,') < pl.indexOf('Meal(2,'), 'la merienda de tarde sale antes que la cena'); }
ui.tab = 'adv'; const aj = body(st, ui); ok(aj.indexOf('"Merienda de mañana"') < aj.indexOf('"Comida"') && aj.indexOf('"Merienda de tarde"') < aj.indexOf('"Cena"'), 'y también en el horario de Ajustes');
go('Open', { kind: 'recipe', k: 1 }); const rec = sheet(st, ui)!; ok(rec.includes('Cambiar plato') && rec.includes('IngRow('), 'la receta tiene «Cambiar plato» e ingredientes con foto');
go('Open', { kind: 'add', k: 0 }); ok(sheet(st, ui)!.includes('PanAdd('), 'hoja para añadir a la despensa');
ok(intro(st, { ...ui, intro: 0 }).includes('Intro('), 'presentación generada');
ok(nav(ui).split('NavItem(').length - 1 === 6, 'seis pestañas, con Despensa');
// PDF (HTML → PDF en el móvil): con las letras y las ilustraciones de la app, sin textos cortados.
const f64 = (n: string) => readFileSync(`assets/fonts/${n}.ttf`).toString('base64');
const platos = Object.fromEntries([...readFileSync('src/platos.ts', 'utf8').matchAll(/"([^"]+)": require\('\.\.\/assets\/platos\/([^']+)'\)/g)].map((x) => [x[1], x[2]]));
const pa: PdfAssets = { fonts: { n4: f64('Nunito-Regular'), n6: f64('Nunito-SemiBold'), n7: f64('Nunito-Bold'), n8: f64('Nunito-ExtraBold'), m7: f64('Manrope-Bold'), m8: f64('Manrope-ExtraBold') },
  img: (d) => (platos[d] ? 'data:image/webp;base64,' + readFileSync('assets/platos/' + platos[d]).toString('base64') : '') };
const fh = fridgeHtml(st, ui.w, pa); writeFileSync('/tmp/nevera.html', fh);
ok(fh.includes('Menú de la semana') && fh.includes('Tu semana en números') && fh.includes('Recetas de la semana') && fh.includes('@font-face{font-family:Nunito'), 'PDF del menú: semana, números, recetas y letras de la app');
ok(dishesOf(st, ui.w).length > 5 && (fh.match(/<img src="data:image\/webp/g) || []).length >= dishesOf(st, ui.w).length, 'el PDF lleva la ilustración de cada plato');
const lh = shopHtml(st, ui.w, pa); writeFileSync('/tmp/compra.html', lh);
const shp = shop(st.plans[ui.w], st.set, st.conf, st.pantry, ui.w);
ok(lh.includes('Lista de la compra') && shp.sec.every((x) => lh.includes(x.n)), 'PDF de la compra con todas sus secciones');
const old = mergeState({ ver: 1, set: { text: 2, ex: { meat: true }, maxMin: 10, times: [480, 840, 1260, 660, 1020] }, plans: { [W]: { sel: [[0, 0, 0, 0, -1]], q: [[1, 1, 1, 1, 1]], c: {}, p: {} } } });
ok(old.set.text === 3 && old.set.ex.cured && old.set.ex.fish && old.set.maxMin === 15 && old.set.times.length === 6 && old.plans[W].sel[0].length === 6, 'los datos guardados con la versión anterior se adaptan');
ok(Number.isFinite(weekScore(st.plans[ui.w], st.set, ctxOf(st, ui.w))), 'valoración semanal calculable');
{ // diseño «oasis»: respiración guiada, saludo y pantallas con poco texto
  const r1 = handle(st, ui, { type: 'Open', params: { kind: 'breathe', k: 0 } });
  ok((sheet(r1.st, r1.ui) || '').includes('Breathe(false)'), 'la hoja «Respira un minuto» se abre');
  ok(greet(8) === 'Buenos días' && greet(16) === 'Buenas tardes' && greet(23) === 'Buenas noches', 'saludo según la hora');
  const pl = body(st, { ...ui, tab: 'plan' });
  ok(pl.includes('Calm(') && !pl.includes('Micro(') && !pl.includes('Tile('), 'el plan muestra poco: sin cifras de más y con acceso a la calma');
}
{ // v3.2: reajuste visible, «Lo siguiente», datos del dispositivo y presentación con Google y avisos
  const s1 = mergeState({}), u1 = firstUI();
  let a = handle(s1, u1, { type: 'Gen' });
  a = handle(a.st, a.ui, { type: 'Cfg', params: { key: 'ex.flour', value: true } });
  const keys = a.ui.fresh?.[a.ui.w] || [];
  ok(a.fx?.kind === 'retuned' && keys.length > 0, 'al cambiar la dieta se marcan los platos nuevos');
  const b2 = handle(a.st, a.ui, { type: 'Cfg', params: { key: 'ex.flour', value: false } });
  ok(changed(a.st.plans[a.ui.w], b2.st.plans[b2.ui.w]) >= 5, 'al volver a permitir algo, el menú se rehace de verdad (no se queda igual)');
  const sv = { ...s1.set, times: [480, 840, 1260, 660, 1020, 1050], extra: false };
  const dd = [0, 0, 0, 0, -1, -1];
  ok(nextSlot(sv, dd, () => false, 16 * 60 + 53) === 2 && !isNow(sv, 2, 16 * 60 + 53) && isNow(sv, 2, 20 * 60 + 30), 'a las 16:53 la cena sale como «lo siguiente», no como «ahora toca»');
  ok(nextSlot(sv, dd, () => false, 15 * 60) === 1, 'hasta hora y media después de comer sigue tocando la comida');
  const c1 = handle(a.st, a.ui, { type: 'Dev', params: { calSync: true, syncErr: 'x' } });
  ok(!('dev' in cloudCopy(c1.st)), 'lo que es solo de este móvil no se sube a la nube');
  const c2 = handle(c1.st, c1.ui, { type: 'Replace', params: { state: { ...cloudCopy(c1.st), set: { ...c1.st.set, mode: 'dark', accent: 3 } } } });
  ok(c2.st.dev.calSync && c2.st.set.mode === 'dark' && c2.st.set.accent === 3, 'al sincronizar llega el tema y los ajustes, y se queda el calendario de este móvil');
  const old = mergeState({ cal: { '2026-10-26': ['1', '2'] } });
  ok(old.dev.cal['2026-10-26'].length === 2 && !('cal' in old), 'los eventos del calendario guardados antes se conservan');
  const it = intro(s1, { ...u1, intro: 3 });
  ok(it.includes('@Export("signin")') && intro(s1, { ...u1, intro: 2 }).includes('@Export("perm-notif-on")'), 'la presentación ofrece iniciar sesión con Google y activar los avisos');
  ok(body(a.st, { ...a.ui, tab: 'plan' }).includes('Fridge(') && body(a.st, { ...a.ui, tab: 'adv' }).includes('Perm('), 'imprimir para la nevera y permisos visibles');
}
{ // presupuesto con el precio real de la compra (envases enteros)
  const s2 = mergeState({}); s2.set.budget = 60; s2.set.store = 1; const u2 = firstUI();
  const g = handle(s2, u2, { type: 'Gen' }).st, sm = shop(g.plans[u2.w], g.set, g.conf, g.pantry, u2.w).sum;
  ok(sm <= 66, `con 60 € de presupuesto la compra real se queda en ${sm.toFixed(2)} €`);
}
{ // v3.3: sincronización por partes, sustitutos, días pasados, presupuesto flexible y bebida
  const u = firstUI(); let A = handle(mergeState({}), u, { type: 'Gen' }).st;
  // B es otro dispositivo con la misma copia; cada uno cambia cosas distintas
  let B = mergeState(JSON.parse(JSON.stringify(cloudCopy(A))));
  A = handle(A, u, { type: 'PanAdd', params: { id: 'huevo' } }).st;
  A = handle(A, u, { type: 'Cfg', params: { key: 'accent', value: 4 } }).st;
  B = handle(B, u, { type: 'Cfg', params: { key: 'budget', value: 70 } }).st;
  B = handle(B, u, { type: 'Cfg', params: { key: 'text', value: 5 } }).st;
  const AB = mergeStates(A, cloudCopy(B)), BA = mergeStates(B, cloudCopy(A));
  ok(AB.pantry.huevo && AB.set.budget === 70 && BA.pantry.huevo && BA.set.budget === 70, 'al sincronizar dos dispositivos se juntan los cambios de los dos');
  ok(AB.set.accent === 4 && AB.set.text === A.set.text && BA.set.text === 5 && BA.set.accent === B.set.accent, 'los colores y el tamaño de letra se quedan en cada dispositivo');
  const A2 = handle(AB, u, { type: 'PanDel', params: { id: 'huevo' } }).st;
  ok(!mergeStates(BA, cloudCopy(A2)).pantry.huevo, 'lo que borras en un dispositivo también se borra en el otro');
  // sustitutos
  const sk = handle(A, u, { type: 'Sub', params: { id: 'calab', to: 'beren' } }).st, pl = sk.plans[u.w];
  const hasCal = shop(A.plans[u.w], A.set, A.conf, {}, u.w).sec.flatMap((x) => x.lines).some((l) => l.id === 'calab');
  const ln = shop(pl, sk.set, sk.conf, {}, u.w).sec.flatMap((x) => x.lines);
  ok(!hasCal || (ln.some((l) => l.id === 'beren' && l.from === 'calab') && !ln.some((l) => l.id === 'calab')), 'si no hay calabacín, la lista pone berenjena en su lugar');
  ok(Math.abs(subQty('skyr', 'qbat', 1) - 110) < 1e-9, 'el sustituto ajusta la cantidad por peso (1 skyr = 110 g de queso batido)');
  // días pasados: un miércoles solo se compra de miércoles a domingo
  const wed = ymd(add(parse(u.w), 2)), all7 = shop(A.plans[u.w], A.set, A.conf, {}, u.w, u.w), rest = shop(A.plans[u.w], A.set, A.conf, {}, u.w, wed);
  ok(rest.days === 5 && rest.sum < all7.sum, `los días que ya han pasado no se compran (${all7.sum.toFixed(2)} → ${rest.sum.toFixed(2)} €)`);
  ok(budgetFlex(60) === 2.5 && 60.6 <= 60 + budgetFlex(60) && 63 > 60 + budgetFlex(60), 'con 60 € no avisa por 60,60 € y sí por 63 €');
  ok(slotTime({ ...A.set, drinkWith: 1 }, 5) === A.set.times[1], 'la bebida se toma a la hora de la comida que acompaña');
  ok(SLN[3] === 'Merienda de mañana' && SLN[4] === 'Merienda de tarde' && ORDER.indexOf(4) < ORDER.indexOf(2), 'merienda de mañana y de tarde, la de tarde antes de la cena');
  const sec = shop(A.plans[u.w], A.set, A.conf, {}, u.w, u.w).sec.map((x) => x.k);
  ok(sec.length > 2 && sec.every((k, i) => i === 0 || SECTIONS.findIndex((s) => s[0] === k) > SECTIONS.findIndex((s) => s[0] === sec[i - 1])), 'la lista va por secciones del súper: ' + sec.join(', '));
}
{ // v3.4: el doble de recetas, tiempos según la ración y cómo debe quedar cada plato
  const all = Object.values(M).flat();
  ok(all.length >= 180, `recetas: ${all.length}`);
  ok(new Set(all.map((m) => m[0])).size === all.length, 'no hay recetas con el mismo nombre');
  ok(all.every((m) => m[3].every(([g]) => ING[g])) && all.every((m) => m[4][0] > 0), 'todas las recetas tienen ingredientes del catálogo y nutrición calculada');
  ok(all.every((m) => DONE[m[0]]), 'todas las recetas dicen cómo debe quedar y cómo aliñarlas');
  ok(all.every((m) => !scale(m, 2)[5].includes('{')), 'los tiempos de los pasos se escriben bien en todas las raciones');
  const por = all.find((m) => m[0] === 'Porridge de cacao y plátano')!;
  ok(scale(por, 2)[5].includes('7 min') && mins(scale(por, 2)) > mins(scale(por, 1)) && scale(por, 2)[7] > scale(por, 1)[7], 'un porridge doble tarda más en espesar (4 → 7 min) y el temporizador también');
  const mac = all.find((m) => m[0] === 'Macarrones con tomate, jamón y queso')!;
  ok(scale(mac, 2)[5].includes('7-9 min'), 'la pasta tarda lo mismo aunque hagas más (cambia el agua, no la cocción)');
}
{ // v3.5: con la compra hecha, los cambios usan lo que hay en casa
  const u = firstUI(); const s0 = handle(mergeState({}), u, { type: 'Gen' }).st;
  const sb = handle(s0, u, { type: 'BuyAll' }).st;
  ok(sb.plans[u.w].bought && !Object.keys(sb.pantry).length, '«Ya he hecho la compra» da la compra por hecha sin marcar ni añadir a la despensa lo que no marcaste');
  // Marcar todo en el carrito, producto a producto: la compra queda hecha sola
  let s3 = s0;
  for (const l of shop(s0.plans[u.w], s0.set, s0.conf, s0.pantry, u.w).sec.flatMap((x) => x.lines)) s3 = handle(s3, u, { type: 'Check', params: { id: l.id } }).st;
  const pl = s3.plans[u.w];
  ok(pl.bought === true, 'al marcar todo el carrito, la compra queda hecha');
  const r = handle(s3, u, { type: 'Gen' });
  const extra = shop(r.st.plans[u.w], r.st.set, r.st.conf, r.st.pantry, u.w).sec.flatMap((x) => x.lines).filter((l) => !l.done);
  ok(r.st.plans[u.w].bought && extra.length <= 2, `rehacer con la compra hecha apenas pide comprar nada (${extra.length} productos nuevos)`);
  const pick = sheet(r.st, { ...r.ui, sheet: { kind: 'pick', k: 1 } }) || '';
  ok(pick.includes('"Con lo que tengo", true') && pick.includes('"Todos los platos", false'), 'al cambiar un plato se ofrecen primero los que puedes hacer con lo que tienes');
  const old = mergeState(JSON.parse(JSON.stringify({ ...cloudCopy(s3), plans: { [u.w]: { ...pl, bought: undefined } } })));
  ok(old.plans[u.w].bought === true, 'las semanas con todo en el carrito de antes de esta versión cuentan como compradas');
  ok(!handle(r.st, r.ui, { type: 'Rebuy' }).st.plans[u.w].bought, '«Volver a hacer la compra» desbloquea la lista');
}

{ // v3.6: elegir con variedad, candado solo del plato, consejos a tiempo, vetos y cambiar producto desde la receta
  const u = firstUI(); let st = handle(mergeState({}), u, { type: 'Gen' }).st;
  for (const l of shop(st.plans[u.w], st.set, st.conf, st.pantry, u.w).sec.flatMap((x) => x.lines)) st = handle(st, u, { type: 'Check', params: { id: l.id } }).st;
  const pickN = (s: typeof st, k: number) => ((sheet(s, { ...u, sheet: { kind: 'pick', k } }) || '').match(/@Choose\(\d+, \d+\)/g) || []).length;
  ok(st.plans[u.w].bought && pickN(st, 2) >= 3, `con la compra hecha, la cena de hoy ofrece varias opciones (${pickN(st, 2)})`);
  // Fijar la cena de mañana y cambiar la de hoy: mañana no se toca y el resto de la semana se reajusta.
  const nx = Math.min(6, u.day + 1), u2 = { ...u, day: nx };
  st = handle(st, u2, { type: 'Lock', params: { k: 2 } }).st;
  const keep = st.plans[u.w].sel[nx][2], cur = st.plans[u.w].sel[u.day][2];
  const j = lst(2).findIndex((m, jj) => jj !== cur && allowed(st.set, 2, jj));
  const rc = handle(st, u, { type: 'Choose', params: { k: 2, j } });
  ok(rc.st.plans[u.w].sel[u.day][2] === j && rc.st.plans[u.w].l?.[`${u.day}-2`] && rc.st.plans[u.w].sel[nx][2] === keep, 'al elegir un plato queda fijado y lo fijado de otros días se respeta');
  ok(!!handle(st, u2, { type: 'Lock', params: { k: 2 } }).st.plans[u.w].l?.[`${nx}-2`] === false, 'el candado se quita con el mismo botón');
  ok((body(rc.st, u) || '').includes('@Lock(2)'), 'cada plato del menú tiene su botón de candado');
  // Candado solo del plato: al reajustar se mantiene el plato (la ración puede cambiar).
  const pl0 = { ...rc.st.plans[u.w], l: { [`${nx}-1`]: true } }, t2 = tune(pl0, rc.st.set, ctxOf(rc.st, u.w), Math.random, true);
  ok(t2.sel[nx][1] === pl0.sel[nx][1], 'un plato fijado no cambia al rehacer la semana');
  // Consejos: a las 17:30 aún vale la comida; a las 20:30 solo merienda de tarde, bebida y cena. Nada cocinado ni pasado.
  const S = { ...DEFAULT.set, snack: true, extra: true, drink: true }, cx = { w: '2026-11-02', today: '2026-11-04' }, P = newPlan(Array.from({ length: 7 }, () => [0, 0, 0, 0, 0, 0]));
  const o1 = openSlots(P, 2, S, cx, 17 * 60 + 30), o2 = openSlots(P, 2, S, cx, 20 * 60 + 30);
  ok(!o1[0] && !o1[3] && o1[1] && o1[4] && o1[2] && o1[5], 'a la hora de la merienda aún se puede cambiar la comida');
  ok(!o2[1] && o2[4] && o2[2] && o2[5], 'casi a la hora de la cena solo se cambian merienda de tarde, bebida y cena');
  ok(!openSlots({ ...P, done: { '2-2': true } }, 2, S, cx, 1230)[2] && !openSlots(P, 1, S, cx, 600).some(Boolean) && openSlots(P, 3, S, cx, 1230).every(Boolean), 'ni platos cocinados ni días pasados; los días que vienen, todo');
  let adv = 0; for (let mm = 600; mm < 1400; mm += 45) { const a = advice(rc.st.plans[u.w], u.day, rc.st.set, ctxOf(rc.st, u.w), mm); if (a && !openSlots(rc.st.plans[u.w], u.day, rc.st.set, ctxOf(rc.st, u.w), mm)[a.k]) adv++; }
  ok(adv === 0, 'el botón «Aplicar» nunca propone una comida que ya no toca');
  // Vetos
  const sv = handle(rc.st, u, { type: 'Veto', params: { v: 'i:pollo' } }).st, pv = sv.plans[u.w], from = pastDays(u.w, ymd(new Date()));
  const leaks = pv.sel.flatMap((d, i) => (i < from ? [] : d.map((jj, k) => (jj >= 0 && lst(k)[jj][3].some(([g]) => g === 'pollo') ? 1 : 0)))).reduce((a, b) => a + b, 0);
  ok(leaks === 0 && !allowed(sv.set, 1, lst(1).findIndex((m) => m[3].some(([g]) => g === 'pollo'))), 'un ingrediente vetado no vuelve a salir en el menú');
  ok((ajustes(sv) || '').includes('Chip("Pechuga de pollo fileteada", @Veto("i:pollo"))'), 'lo vetado aparece en Ajustes para poder quitarlo');
  ok(!handle(sv, u, { type: 'Veto', params: { v: 'i:pollo' } }).st.set.veto.length, 'quitar el veto vuelve a permitirlo');
  const nm = lst(2)[0][0], sr = handle(rc.st, u, { type: 'Veto', params: { v: 'r:' + nm } }).st;
  ok(vetoed(sr.set, lst(2)[0]) && !sr.plans[u.w].sel.slice(from).some((d) => d[2] === 0), 'una receta vetada no vuelve a salir');
  // Cambiar producto desde la receta (soja por leche) y volver a la receta
  const kr = [0, 1, 2, 3, 4, 5].find((k) => { const jj = rc.st.plans[u.w].sel[u.day][k]; return jj >= 0 && lst(k)[jj][3].some(([g]) => g === 'leche' || g === 'soja'); });
  if (kr != null) ok((sheet(rc.st, { ...u, sheet: { kind: 'recipe', k: kr } }) || '').includes(`@Open("swap", ${kr},`), 'en la receta cada ingrediente con alternativas tiene «Cambiar»');
  const rs = handle(rc.st, { ...u, sheet: { kind: 'swap', k: 2, from: 'soja' } }, { type: 'Sub', params: { id: 'soja', to: 'leche' } });
  ok(rs.ui.sheet?.kind === 'recipe' && rs.ui.sheet.k === 2 && rs.st.plans[u.w].sub?.soja === 'leche', 'cambiar la soja por leche entera desde la receta vuelve a la receta');
  // Bebidas
  const B = lst(5), bat = B.filter((m) => /^Batido/.test(m[0]) && !m[3].some(([g]) => g === 'platano'));
  ok(bat.length >= 10 && B.filter((m) => m[3].some(([g]) => g === 'zmanz')).length >= 4 && !B.some((m) => m[0] === 'Agua con limón'), `batidos sin plátano: ${bat.length}; con zumo de manzana y sin «Agua con limón»`);
}

{ // v3.6: menú dinámico (se adapta solo) o fijo (Ajustes → Menú fijo)
  const S = { ...DEFAULT.set }, ctx = { conf: {}, pantry: {}, w: '2026-11-02', today: '2026-11-04', sex: 'm' as const };
  const base = generate(S, () => 0.5, ctx), bad = { ...base, sel: base.sel.map((d, i) => (i >= 3 ? d.map((j, k) => (k === 2 ? 0 : j)) : d)) };
  const a1 = autoTune(bad, S, ctx, 13 * 60);
  ok([0, 1].every((i) => a1.sel[i].join() === bad.sel[i].join()) && a1.sel[2][0] === bad.sel[2][0] && a1.sel[2][1] === bad.sel[2][1], 'el reajuste solo no toca días pasados ni las comidas de hoy que ya tocan');
  ok(changed(bad, a1) > 0, `el menú dinámico arregla los días siguientes (${changed(bad, a1)} platos)`);
  ok(changed(bad, autoTune(bad, { ...S, fixedMenu: true }, ctx, 13 * 60)) === 0, 'con «Menú fijo» no cambia nada por su cuenta');
  const u = firstUI(); let st = handle(mergeState({}), u, { type: 'Gen' }).st; st = handle(st, u, { type: 'Cfg', params: { key: 'fixedMenu', value: true } }).st;
  const before = st.plans[u.w], j = lst(2).findIndex((m, jj) => jj !== before.sel[u.day][2] && allowed(st.set, 2, jj));
  const after = handle(st, u, { type: 'Choose', params: { k: 2, j } }).st.plans[u.w];
  ok(changed(before, after) === 1, 'con «Menú fijo», elegir un plato solo cambia ese plato');
  // «Aplicar»: con menú dinámico no sale (se aplica solo); con «Menú fijo» sale y el cambio se queda.
  const dyn = handle(handle(st, u, { type: 'Cfg', params: { key: 'fixedMenu', value: false } }).st, u, { type: 'Auto' }).st;
  ok(!(body(dyn, u) || '').includes('Tip('), 'con el menú dinámico no hay botón «Aplicar»: los consejos ya están aplicados');
  ok(changed(dyn.plans[u.w], handle(dyn, u, { type: 'Auto' }).st.plans[u.w]) === 0, 'el reajuste solo es estable (abrir la app otra vez no cambia nada)');
  let ap = 0, fixedOk = 0;
  // Semana empeorada a propósito (la misma comida todos los días) para que haya consejos.
  const st2 = { ...st, plans: { ...st.plans, [u.w]: { ...st.plans[u.w], sel: st.plans[u.w].sel.map((d) => d.map((jj, k) => (k === 1 ? lst(1).findIndex((_, x) => allowed(st.set, 1, x)) : jj))) } } };
  for (let d = 0; d < 7; d++) { const ud = { ...u, day: d }, a = advice(st2.plans[u.w], d, st2.set, ctxOf(st2, u.w), 600); if (!a) continue; ap++;
    const r2 = handle(st2, ud, { type: 'Apply', params: { k: a.k, j: a.j, f: a.f, i: d } }).st.plans[u.w]; if (r2.sel[d][a.k] === a.j && r2.q[d][a.k] === a.f) fixedOk++; }
  ok(ap > 0 && ap === fixedOk, `con «Menú fijo», «Aplicar» cambia el plato y se queda (${fixedOk}/${ap})`);
}

{ // v3.6: versión y novedades
  const appV = JSON.parse(readFileSync(__dirname + '/../app.json', 'utf8')).expo.version, pkgV = JSON.parse(readFileSync(__dirname + '/../package.json', 'utf8')).version;
  ok(VERSION === appV && VERSION === pkgV && NEWS[0].v === VERSION, `la versión ${VERSION} coincide en app.json, package.json y las novedades`);
  const u = firstUI(), old = handle({ ...mergeState({}), intro: true }, u, { type: 'Gen' }).st;
  ok((body(old, u) || '').includes('News('), 'tras actualizar, el menú enseña un aviso de novedades');
  const r = handle(old, u, { type: 'News', params: { open: true } });
  ok(r.ui.sheet?.kind === 'news' && !(body(r.st, u) || '').includes('News(') && (sheet(r.st, r.ui) || '').includes('Novedades'), '«Ver novedades» abre la lista y el aviso ya no vuelve');
  const ns = sheet(r.st, r.ui) || '';
  ok(NEWS.every((n) => ns.includes(`Ver("${n.v}"`)) && ns.includes('Instalada · ') && ns.includes('Change("Nuevo"') && !ns.includes('spark') && NEWS.every((n, i) => i === 0 || n.v < NEWS[i - 1].v), `registro de cambios con etiquetas, la versión instalada primero (${NEWS.length})`);
  const fresh = handle(handle(mergeState({}), u, { type: 'Intro', params: { page: -1 } }).st, u, { type: 'Gen' }).st;
  ok(!(body(fresh, u) || '').includes('News('), 'en una instalación nueva no sale el aviso (ya está la presentación)');
  ok((ajustes(fresh) || '').includes(`versión ${VERSION}`) && (ajustes(fresh) || '').includes('@News(true)'), 'Ajustes enseña la versión y el botón de novedades al final');
}

{ // v3.6.2: la merienda de tarde activada siempre se pone; si la quitas tú, se queda quitada
  const u = firstUI(); let st = handle(mergeState({}), u, { type: 'Gen' }).st;
  const from = pastDays(u.w, ymd(new Date()));
  ok(st.set.extra && st.plans[u.w].sel.every((d) => d[4] >= 0), 'con la merienda de tarde activada, sale todos los días');
  const r = handle(st, u, { type: 'Choose', params: { k: 4, j: -1 } }).st, r2 = handle(r, u, { type: 'Auto' }).st;
  ok(r2.plans[u.w].sel[u.day][4] === -1 && r2.plans[u.w].sel.every((d, i) => i === u.day || i < from || d[4] >= 0), 'si la quitas a mano, solo ese día se queda sin ella');
  const old = { ...st.plans[u.w], sel: st.plans[u.w].sel.map((d) => { const x = d.slice(); x[4] = -1; return x; }) };
  const t3 = tune(old, st.set, { ...ctxOf(st, u.w), today: ymd(add(parse(u.w), 3)) });
  ok([0, 1, 2].every((i) => t3.sel[i][4] === -1) && t3.sel.slice(3).every((d) => d[4] >= 0), 'los días pasados sin merienda no se rellenan; los siguientes, sí');
}

{ // v3.6.3: quitar una merienda un día y volver a ponerla sin elegir (la app reorganiza el día)
  const u = firstUI(), d = Math.min(6, u.day + 1), ud = { ...u, day: d };
  for (const fixed of [false, true]) {
    let st = handle(mergeState({}), ud, { type: 'Gen' }).st; st = handle(st, ud, { type: 'Cfg', params: { key: 'fixedMenu', value: fixed } }).st;
    const kc = (pl: any) => nut(mask(st.set, pl.sel[d]), pl.q[d])[0];
    const off = handle(st, ud, { type: 'Choose', params: { k: 3, j: -1 } }).st;
    ok(off.plans[u.w].sel[d][3] === -1 && (body(off, ud) || '').includes('@Restore(3)') && Math.abs(kc(off.plans[u.w]) - st.set.k) < st.set.k * (fixed ? 0.22 : 0.15), `${fixed ? 'menú fijo' : 'dinámico'}: al quitar la merienda de mañana un día, el resto del día se reorganiza (${Math.round(kc(off.plans[u.w]))} kcal)`);
    const on = handle(off, ud, { type: 'Restore', params: { k: 3 } }).st, pl = on.plans[u.w];
    ok(pl.sel[d][3] >= 0 && !pl.l?.[`${d}-3`] && Math.abs(kc(pl) - st.set.k) < st.set.k * 0.15, `${fixed ? 'menú fijo' : 'dinámico'}: «Añadir» la vuelve a poner sola y el día sigue cuadrando (${Math.round(kc(pl))} kcal)`);
    if (fixed) ok(pl.sel.every((row, i) => row.every((j, k) => (i === d && k === 3) || j === off.plans[u.w].sel[i][k])), 'menú fijo: al volver a ponerla no cambia ningún otro plato (solo raciones de ese día)');
  }
}

{ // lo cocinado: no en días futuros, no lo cambia el reajuste y se puede deshacer
  const u = firstUI(); let st = handle(mergeState({}), u, { type: 'Gen' }).st;
  if (u.day < 6) { const uf = { ...u, day: u.day + 1 }, r = handle(st, uf, { type: 'Cooked', params: { k: 2 } });
    ok(!r.st.plans[u.w].done?.[`${u.day + 1}-2`] && !(sheet(st, { ...uf, sheet: { kind: 'recipe', k: 2 } }) || '').includes('Lo he cocinado'), 'un día que aún no ha llegado no se puede marcar como cocinado'); }
  const c = handle(st, u, { type: 'Cooked', params: { k: 0 } });
  ok(c.st.plans[u.w].done?.[`${u.day}-0`] && c.fx?.data?.day === u.day, 'hoy sí se marca, y el aviso trae lo necesario para deshacerlo');
  const back = handle(c.st, { ...u, day: (u.day + 3) % 7 }, { type: 'Cooked', params: c.fx!.data });
  ok(!back.st.plans[u.w].done?.[`${u.day}-0`], '«Deshacer» lo desmarca aunque estés viendo otro día');
  const fut = { ...st.plans[u.w], done: { '6-1': true } }, ctx = { ...ctxOf(st, u.w), today: u.w };
  const bad = { ...fut, sel: fut.sel.map((d, i) => (i === 6 ? d.map((j, k) => (k === 1 ? lst(1).findIndex((_, x) => allowed(st.set, 1, x)) : j)) : d)) };
  ok(tune(bad, st.set, ctx, Math.random, true).sel[6][1] === bad.sel[6][1], 'el reajuste no cambia un plato ya cocinado');
  const ms = mergeState(JSON.parse(JSON.stringify({ ...st, plans: { [u.w]: { ...st.plans[u.w], done: { [`${u.day}-0`]: true, ...(u.day < 6 ? { [`${u.day + 1}-0`]: true } : {}) } } } })));
  ok(ms.plans[u.w].done?.[`${u.day}-0`] && !ms.plans[u.w].done?.[`${u.day + 1}-0`], 'al abrir la app se quitan las marcas de días que aún no han llegado');
  ok(mergeState({}).set.accent === 0 && mergeState({ ver: 3, set: { accent: 0 } }).set.accent === 0 && mergeState({ ver: 4, set: { accent: 0 } }).set.accent === 1 && mergeState({ ver: 4, set: { accent: 1 } }).set.accent === 0 && mergeState({ ver: 5, set: { accent: 1 } }).set.accent === 1, 'Océano es el primero y el de por defecto (y si eliges otro, se respeta)');
}

{ // 1.0.0: reajuste diferido, borrar datos y privacidad
  const u = firstUI(); let st = handle(mergeState({}), u, { type: 'Gen' }).st;
  const j = lst(2).findIndex((m, x) => x !== st.plans[u.w].sel[u.day][2] && allowed(st.set, 2, x));
  const d = handle(st, u, { type: 'Choose', params: { k: 2, j } }, true);
  ok(d.later === true && changed(st.plans[u.w], d.st.plans[u.w]) === 1, 'al tocar, el cambio se pinta al momento y el reajuste queda para justo después');
  const a = handle(d.st, d.ui, { type: 'Auto', params: { user: true } });
  ok(a.st.updated >= d.st.updated, 'el reajuste que sigue a un cambio tuyo se guarda y se sincroniza');
  const w = handle({ ...st, sync: { email: 'x@y.z', at: 1 } as any, dev: { ...st.dev, cal: { [u.w]: ['e1'] } } }, u, { type: 'Wipe', params: { cloud: true } });
  ok(!Object.keys(w.st.plans).length && !w.st.intro && w.st.sync === null && w.fx?.kind === 'wipe' && w.fx.data.cloud && w.fx.data.cal[u.w][0] === 'e1', '«Borrar todos mis datos» lo deja como recién instalada y quita calendario y nube');
  ok((ajustes(st, { ...u, tab: 'adv' }) || '').includes('@Open("wipe", 0)') && (ajustes(st) || '').includes('@Open("privacy", 0)') && (sheet(st, { ...u, sheet: { kind: 'privacy', k: 0 } }) || '').includes('no está relacionada'), 'Ajustes tiene Privacidad y Borrar datos');
}

{ // presentación: se puede volver un paso atrás
  const st0 = mergeState({}), u = firstUI();
  ok(!(intro(st0, { ...u, intro: 0 }) || '').includes('@Intro(-1))') && (intro(st0, { ...u, intro: 2 }) || '').includes(', @Intro(1), "notif", '), 'en la presentación hay «Atrás» desde el segundo paso');
  ok(handle(st0, { ...u, intro: 2 }, { type: 'Intro', params: { page: 1 } }).ui.intro === 1, '«Atrás» vuelve al paso anterior');
  const ip = intro(st0, { ...u, intro: 3 }) || '';
  ok(ip.includes('Intro(3, 4,') && !ip.includes('Screen(\"') && INTRO.length === 4, 'la presentación tiene 4 pasos ligeros (sin pantallas en vivo)');
}

{ // calendario: solo con sesión iniciada y con botón para borrar los eventos
  const st0 = handle(mergeState({}), firstUI(), { type: 'Gen' }).st, a0 = ajustes(st0, { ...firstUI(), tab: 'adv' }) || '', a1 = ajustes({ ...st0, sync: { email: 'cristian44137@gmail.com', at: 1 } as any }, { ...firstUI(), tab: 'adv' }) || '';
  ok(a0.includes('@Export("calpurge")') && a0.includes('Inicia sesión con Google') && a1.includes('calendario de cristian44137@gmail.com'), 'el calendario es el de la cuenta con la que inicias sesión, y hay botón para borrar sus eventos');
  const t = handle({ ...st0, set: { ...st0.set, calSync: true } }, firstUI(), { type: 'Cfg', params: { key: 't2', value: 1200 } }).st;
  ok(!!t.dev.calDirty, 'al cambiar la hora de una comida, el calendario se vuelve a escribir');
}

{ // ilustraciones pintadas: una por plato y por cada plato de la presentación
  const idx = readFileSync(__dirname + '/../src/platos.ts', 'utf8'), all = [...lst(0), ...lst(1), ...lst(2), ...lst(3), ...lst(5)];
  const miss = all.filter((m) => !idx.includes(JSON.stringify(m[0]) + ':'));
  ok(!miss.length, `todos los platos tienen su ilustración pintada (${all.length - miss.length}/${all.length})${miss.length ? ': faltan ' + miss.slice(0, 3).map((m) => m[0]).join(', ') : ''}`);
}

{ // «Nuevo»: se quita al abrir el plato o al salir de ese día
  const u = { ...firstUI(), fresh: { [firstUI().w]: ['2-1', '2-2', '4-0'] } }, d2 = { ...u, day: 2 };
  const o = handle(mergeState({}), d2, { type: 'Open', params: { kind: 'recipe', k: 1 } }).ui;
  ok(!o.fresh![u.w].includes('2-1') && o.fresh![u.w].includes('2-2'), 'al abrir un plato «Nuevo», la etiqueta se quita');
  const dd = handle(mergeState({}), d2, { type: 'Day', params: { i: 4 } }).ui;
  ok(dd.fresh![u.w].join() === '4-0', 'al pasar a otro día, se quitan las de ese día (ya las has visto)');
}
{ // Pantalla encendida: opción en Ajustes, guardada solo en este móvil
  const s0 = mergeState({}); ok(s0.set.keepAwake === 'receta', 'pantalla encendida: por defecto «Al cocinar»');
  const s1 = handle(s0, { ...firstUI(), tab: 'aj' }, { type: 'Cfg', params: { key: 'keepAwake', value: 'siempre' } }).st;
  ok(s1.set.keepAwake === 'siempre' && ajustes(s1, { ...firstUI(), tab: 'adv' }).includes('Pantalla encendida'), 'pantalla encendida: se puede cambiar en Ajustes');
  const remote = { ...s0, set: { ...s0.set, keepAwake: 'no' as const }, stamp: { ...s0.stamp, set: Date.now() + 9e5 } };
  ok(mergeStates(s1, remote).set.keepAwake === 'siempre', 'pantalla encendida: la copia de la nube no la cambia (es de cada móvil)');
}
{ // presentación: igual para todos y sin pantallas en vivo
  const u = { ...firstUI(), intro: 3 }, mine = handle(mergeState({}), u, { type: 'Gen' }).st;
  ok(intro(mergeState({}), u) === intro(mine, u), 'la presentación es igual tengas o no tu semana');
  ok((intro(mergeState({}), u).match(/root = Screen\(/g) || []).length === 1, 'solo una pantalla (la de la presentación), no una app entera por paso');
}
{ // sustitutos: el nombre del plato y la preparación cambian con el ingrediente
  const pl: any = { sub: { soja: 'leche' } };
  ok(dishName('Bebida de soja al cacao', pl) === 'Leche entera al cacao' && dishName('Porridge de soja con kiwi', pl) === 'Porridge de leche con kiwi', 'el nombre del plato cambia con el sustituto');
  ok(subText('Calienta la bebida de soja|Sirve la bebida de soja fría', pl) === 'Calienta la leche entera|Sirve la leche entera fría', 'los pasos de la preparación también');
  ok(dishName('Tostada con tomate', pl, [['pan', 2]]) === 'Tostada con tomate', 'si el plato no lleva ese ingrediente, no cambia');
}
console.log('todo correcto 2');

/* ---------- nube ---------- */
const drive: Record<string, string> = {};
const mock: any = async (url: string, init: any = {}) => {
  const u = new URL(url), json = (o: any) => ({ ok: true, json: async () => o, text: async () => JSON.stringify(o) });
  if (u.pathname.endsWith('/files') && !init.method) { const nm = /name='(.+)'/.exec(u.searchParams.get('q')!)![1]; return json({ files: drive[nm] ? [{ id: nm, modifiedTime: 'x' }] : [] }); }
  if (u.pathname.includes('/upload/') && init.method === 'POST') { const nm = /"name":"([^"]+)"/.exec(init.body)![1]; drive[nm] = init.body.split('\r\n\r\n').pop().split('\r\n--nevera--')[0]; if (!init.headers.Authorization.startsWith('Bearer ')) throw 0; return json({ id: nm }); }
  if (init.method === 'PATCH') { drive[u.pathname.split('/').pop()!] = init.body; return json({}); }
  return { ok: true, text: async () => drive[u.pathname.split('/').pop()!] };
};
(async () => {
  await push('tok', 'a.json', JSON.stringify({ updated: 5, x: 1 }), mock); await push('tok', 'a.json', JSON.stringify({ updated: 9, x: 2 }), mock);
  const back = await pull('tok', 'a.json', mock); ok(back.updated === 9 && back.x === 2, 'Drive: crear, actualizar y descargar (simulado)');
  ok(decide(1, 5) === 'pull' && decide(5, 1) === 'push' && decide(0, undefined) === 'push', 'gana el cambio más reciente');
  console.log('todo correcto 3');
})();
void SLN;
{
  // Nevú Plus: sin comprar se ofrece; comprado o con la cuenta de revisión, desbloqueado; borrar datos no lo quita.
  const free = mergeState({});
  ok(!hasPlus(free) && ajustes(free).includes('PlusCard(false, "3,99 €", @Export("buy"), @Export("restorebuy"))'), 'Plus: sin comprar se ofrece por 3,99 €');
  ok(hasPlus({ ...free, sync: { email: 'Nevu.Revision@gmail.com' } } as any), 'Plus: la cuenta de revisión lo tiene');
  const paid = { ...free, dev: { ...free.dev, plus: true, plusPrice: '3,99 €' } };
  ok(hasPlus(paid) && ajustes(paid).includes('PlusCard(true'), 'Plus: comprado, desbloqueado');
  ok(hasPlus(handle(paid, firstUI(), { type: 'Wipe', params: { cloud: false } }).st), 'Plus: «Borrar todos mis datos» no quita la compra');
  const sh = sheet(free, { ...firstUI(), sheet: { kind: 'plus', k: 0 } });
  ok(!!sh && sh.includes('PlusCard(false') && sh.includes('@Export("restorebuy")'), 'Plus: hoja con compra y restaurar');
  console.log('todo correcto Plus');
}
{
  // 1.0.1: objetivos en «Tú», modo sencillo solo en Ajustes, aviso si falta el perfil y paso del perfil en la presentación.
  const st0 = mergeState({}), ui0 = firstUI(), g = handle(st0, ui0, { type: 'Gen' }), tuS = body(g.st, { ...g.ui, tab: 'tu' }), ajS = body(g.st, { ...g.ui, tab: 'adv' });
  ok(tuS.includes('"Calorías objetivo"') && !ajS.includes('"Calorías objetivo"'), 'calorías, proteína y fibra en «Tú» (no en Ajustes)');
  ok(!tuS.includes('Modo sencillo') && ajS.includes('Modo sencillo'), 'modo sencillo solo en Ajustes');
  ok(body(g.st, { ...g.ui, tab: 'plan' }).includes('Nudge('), 'aviso discreto si faltan tus datos');
  const full = handle(handle(handle(g.st, g.ui, { type: 'Prof', params: { key: 'age', value: 30 } }).st, g.ui, { type: 'Prof', params: { key: 'h', value: 175 } }).st, g.ui, { type: 'Prof', params: { key: 'w', value: 70 } }).st;
  ok(!body(full, { ...g.ui, tab: 'plan' }).includes('Nudge(') && full.set.k !== st0.set.k, 'con tus datos, el objetivo cambia y el aviso se va');
  ok(body(full, { ...g.ui, tab: 'tu' }).includes('Haces ejercicio') || body(full, { ...g.ui, tab: 'tu' }).includes('Caminas'), 'cada actividad física con su explicación');
  ok(intro(st0, { ...ui0, intro: INTRO.findIndex((x: any) => x.d === 'perfil') }).includes('Field(\\"Edad\\"') || intro(st0, { ...ui0, intro: INTRO.findIndex((x: any) => x.d === 'perfil') }).includes('Edad'), 'paso de tus datos en la presentación');
  console.log('todo correcto 1.0.1');
}
{
  // 1.0.2: detalles de cocina en los pasos.
  ok(detalle('Calienta la sartén a fuego medio con aceite') === 'Calienta la sartén a fuego medio (4 de 6) con aceite', 'nivel de fuego del 1 al 6');
  ok(detalle('Haz el huevo a la plancha').endsWith('Fuego: 5 de 6.') && !detalle('Calienta en el microondas 1 min').includes('Fuego'), 'fuego solo en la placa');
  ok(detalle('Corta el calabacín en rodajas').includes('en rodajas (de unos 5 mm)') && detalle('Corta en rodajas de 1 cm') === 'Corta en rodajas de 1 cm', 'tamaño de los cortes (sin repetir si ya lo dice)');
  ok(antes([['zan', 1], ['avena', 40], ['zan', 2]], (g) => g).length === 1 && PELAR.calab.startsWith('No hace falta'), 'si hay que pelar la verdura');
  console.log('todo correcto 1.0.2');
}

// 1.0.3: Ajustes corto + «más avanzados»
{
  const u = { ...ui, tab: 'aj' as const }, main = body(st, u), adv = body(st, { ...u, tab: 'adv' as const });
  ok(main.split('\n').length < adv.split('\n').length, 'Ajustes principal es más corto que el avanzado');
  ok(main.includes('@Go("adv")'), 'Ajustes principal enlaza a «Ajustes más avanzados»');
  ok(!main.includes('Presupuesto semanal') && adv.includes('Presupuesto semanal'), 'el presupuesto está en avanzados');
  ok(adv.includes('@Go("aj")'), 'avanzados tiene botón de volver');
  ok(main.includes('PlusCard('), 'la versión Plus está presente en Ajustes');
  ok(/No saldrá en tu menú|Puede salir en tu menú/.test(main), 'la dieta dice con palabras si está activada');
  ok(nav({ ...u, tab: 'adv' as const }).includes('"Ajustes", true'), 'en avanzados la pestaña Ajustes sigue marcada');
}
console.log('todo correcto 1.0.3');
// 1.0.3: macros según edad, peso, altura y actividad
{
  const base = { sex: 'm' as const, age: 30, h: 175, w: 70, act: 1.375, goal: 0 }, c0 = calc(base)!;
  ok(calc({ ...base, age: 50 })!.kc < c0.kc, 'la edad cambia las calorías');
  ok(calc({ ...base, age: 70 })!.p > c0.p - 1 && calc({ ...base, age: 70 })!.gkg === 1.2, 'desde 65 años, 1,2 g/kg de proteína');
  ok(calc({ ...base, h: 190 })!.kc > c0.kc && calc({ ...base, w: 85 })!.p > c0.p, 'la altura cambia las calorías y el peso, la proteína');
  ok(calc({ ...base, act: 1.725 })!.gkg > calc({ ...base, act: 1.2 })!.gkg, 'más actividad, más proteína');
  ok(calc({ ...base, goal: -0.15 })!.gkg === c0.gkg + 0.2 && calc({ ...base, goal: -0.15 })!.kc < c0.kc, 'al bajar: déficit y más proteína');
  ok(calc({ ...base, age: 70, goal: -0.15 })!.kc > calc({ ...base, goal: -0.15, age: 70 })!.bmr - 1, 'a partir de 65 el déficit no baja del metabolismo basal');
  ok(calc({ ...base, age: 16, goal: -0.15 })!.kc === calc({ ...base, age: 16 })!.kc, 'sin déficit en menores');
  ok(calc({ ...base, h: 160, w: 120 })!.p < Math.round(1.2 * 120), 'con obesidad la proteína usa el peso ajustado');
  ok(Math.abs(c0.fat * 9 / c0.kc - 0.3) < 0.02 && c0.carb * 4 + c0.p * 4 + c0.fat * 9 > c0.kc - 10 && c0.f >= 25, 'reparto: 30 % de grasa, hidratos el resto, fibra ≥ 25 g');
}
console.log('todo correcto macros');
// 1.0.3: consejos de primer uso y degradados Plus
{
  const g0 = mergeState({}), u0 = { ...firstUI(), tab: 'compra' as const }, g = handle(g0, u0, { type: 'Gen' }).st;
  const st1 = { ...g, intro: true };
  ok(body(st1, u0).includes('tipG = Guide(') && body(st1, u0).includes('@Tips("compra")'), 'consejo de primer uso al abrir la pestaña');
  const done = handle(st1, u0, { type: 'Tips', params: { tab: 'compra' } }).st;
  ok(!body(done, u0).includes('Guide(') && body(done, { ...u0, tab: 'desp' }).includes('Guide('), 'el consejo se va con «Entendido» y solo en esa pestaña');
  ok(!body({ ...st1, intro: false }, u0).includes('Guide('), 'sin consejos durante la presentación');
  const adv = body(st1, { ...u0, tab: 'adv' });
  ok(adv.includes('@Open("plus", 0)') && !/@Cfg\("grad"/.test(adv), 'sin Plus, el degradado abre la oferta de Plus');
  ok(makeTheme('light', null, 0, 2, 1, 1, 400, { n: 'x', l: '#C2255C', g: '#862E9C' }).ac !== makeTheme('light', null, 0, 2).ac, 'el degradado cambia los colores del tema');
}
console.log('todo correcto 1.0.3 b');

// Temas: 6 de serie y los demás, creados con Nevú Plus
{
  const g = handle(mergeState({}), firstUI(), { type: 'Gen' }), u = { ...g.ui, tab: 'adv' as const };
  const free = body(g.st, u), swatches = (free.match(/Swatch\("#/g) || []).length;
  ok(swatches === 6 && free.includes('"Nuevo tema"') && free.includes('@Open("plus", 0)'), 'sin Plus: 6 temas de serie y el «+» lleva a la oferta de Plus');
  const paid = { ...g.st, dev: { ...g.st.dev, plus: true } };
  ok(body(paid, u).includes('@Open("theme", 0)'), 'con Plus el «+» abre el creador');
  let r = handle(paid, { ...u, sheet: { kind: 'theme', k: 0 } }, { type: 'Draft', params: { k: 0, c: '#0CA678' } });
  r = handle(r.st, r.ui, { type: 'Draft', params: { k: 1, c: '#364FC7' } });
  ok(sheet(r.st, r.ui)!.includes('Guardar tema') && sheet(r.st, r.ui)!.includes('"#364FC7"'), 'el creador enseña la vista previa y la paleta');
  r = handle(r.st, r.ui, { type: 'ThemeAdd' });
  ok(r.st.set.themes!.length === 1 && r.st.set.themes![0].l === '#0CA678' && r.st.set.grad === 0 && !r.ui.sheet, 'guardar crea el tema y lo elige');
  ok(body(r.st, { ...u }).includes('Eliminar el tema «Tema 1»'), 'se puede eliminar el tema elegido desde Ajustes');
  const free2 = handle(g.st, { ...u, sheet: { kind: 'theme', k: 0 } }, { type: 'ThemeAdd' });
  ok(!free2.st.set.themes?.length && free2.ui.sheet?.kind === 'plus', 'sin Plus no se puede crear un tema');
  r = handle(r.st, u, { type: 'ThemeDel', params: { i: 0 } });
  ok(!r.st.set.themes!.length && r.st.set.grad === -1, 'eliminar quita el tema y vuelve al de serie');
  r = handle(handle(paid, u, { type: 'ThemeAdd' }).st, u, { type: 'Cfg', params: { key: 'accent', value: 1 } });
  ok(r.st.set.grad === -1, 'elegir un tema de serie quita el propio');
}
console.log('todo correcto temas');
// Login: la copia manual en Drive es gratis; la sincronización automática, de Plus
ok(!PLUS_EXPORTS.includes('cloudsave') && !PLUS_EXPORTS.includes('cloudrestore') && PLUS_EXPORTS.includes('sync'), 'copia manual en Drive gratis; sincronización automática de Plus');
console.log('todo correcto login');

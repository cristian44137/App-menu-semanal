// Calcula la nutrición de cada plato a partir de los productos de src/data.ts.
//   npx tsx tools/nutricion.ts            -> solo muestra el informe
//   npx tsx tools/nutricion.ts --aplicar  -> reescribe [kcal, prot, hidratos, grasa, fibra] de cada plato en src/data.ts
// Macros: de la ficha del producto (k). Fibra: de la tabla MICRO de src/nutri.ts. Para frescos sin ficha usa GEN.
import { readFileSync, writeFileSync } from 'fs';
import { ING, M } from '../src/data';
import { GEN, MICRO } from '../src/nutri';

// Aceite de cocinar (no está en el catálogo): 8 g si los pasos lo citan, 5 g si se usa sartén o se dora. Estimación.
const ACEITE = [884, 0, 0, 100];
const aceite = (pasos: string, uten: string) => (pasos.toLowerCase().includes('aceite') ? 8 : uten.toLowerCase().includes('sartén') || /(^|[\s|])(dora|dóra|sofr|saltea)/i.test(pasos) ? 5 : 0);
// Si la kcal de la ficha no cuadra con los macros (más de un 25 %), se usa la calculada.
const fix = (k: number[]) => { const a = 4 * k[1] + 4 * k[2] + 9 * k[3]; return k[0] > 0 && Math.abs(a - k[0]) / k[0] <= 0.25 ? k : [Math.round(a), k[1], k[2], k[3]]; };
const gramos = (id: string, q: number) => (ING[id].u === 'g' || ING[id].u === 'ml' ? q : q * (ING[id].gu ?? NaN));

function plato(ings: [string, number][], st: 'M' | 'D', oil: number) {
  const t = [(884 * oil) / 100, 0, 0, oil, 0];
  for (const [id, q] of ings) {
    const G = ING[id], p = G[st]; if (!p) return null;
    const k = p.k ?? G[st === 'M' ? 'D' : 'M']?.k ?? GEN[id];
    const g = gramos(id, q);
    if (!k || !(g >= 0)) return null;
    const f = fix(k);
    for (let i = 0; i < 4; i++) t[i] += (f[i] * g) / 100;
    t[4] += ((MICRO[id]?.[0] ?? 0) * g) / 100;
  }
  return t;
}

let src = readFileSync('src/data.ts', 'utf8');
const aplicar = process.argv.includes('--aplicar');
let n = 0;
for (const grupo of Object.keys(M) as (keyof typeof M)[]) {
  for (const m of M[grupo]) {
    const oil = aceite(m[5], m[6]);
    const rs = [plato(m[3], 'M', oil), plato(m[3], 'D', oil)].filter(Boolean) as number[][];
    if (!rs.length) { console.log(`= ${m[0]}: falta algún dato, se queda como estaba`); continue; }
    const nv = [0, 1, 2, 3, 4].map((i) => Math.round(rs.reduce((a, r) => a + r[i], 0) / rs.length));
    const old = m[4], dif = old[0] ? Math.round((100 * (nv[0] - old[0])) / old[0]) : 100;
    console.log(`${Math.abs(dif) > 20 ? '!' : ' '} ${m[0]}: ${old.join('/')} -> ${nv.join('/')}${oil ? ` (aceite ${oil} g estimado)` : ''}`);
    if (!aplicar) continue;
    const name = JSON.stringify(m[0]), alt = `'${m[0].replace(/'/g, "\\'")}'`;
    let i = src.indexOf('[' + name); if (i < 0) i = src.indexOf('[' + alt);
    if (i < 0) { console.log('  no encuentro el plato en data.ts'); continue; }
    const re = /\]\],\s*\[[\d.,\s]+\],/g; re.lastIndex = i;
    const mm = re.exec(src); if (!mm) continue;
    src = src.slice(0, mm.index) + `]], [${nv.join(', ')}],` + src.slice(mm.index + mm[0].length);
    n++;
  }
}
if (aplicar) { writeFileSync('src/data.ts', src); console.log(`\nactualizados ${n} platos`); }

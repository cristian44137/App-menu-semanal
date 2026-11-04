// Ilustraciones vectoriales nativas (react-native-svg): cada plato se dibuja en su recipiente (vaso, taza, cuenco,
// tabla, sartén, tarro, wrap o plato) con sus ingredientes reconocibles, degradados suaves y vapor si va caliente.
// También los iconos de la app.
import React, { useRef } from 'react';
import { Image } from 'react-native';
import { PLATOS } from './platos';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

/* ---------- colores de cada ingrediente ---------- */
export const COL: Record<string, string> = {
  avena: '#E3C98F', leche: '#F4F1EA', platano: '#F6D35B', pan: '#D9A15B', tomrall: '#D9533D', pavo: '#F0B4A8', cacah: '#B8793E', yogur: '#F6F3EC',
  huevo: '#FFC933', fsecos: '#A9773F', fruta: '#E25A52', pasta: '#F1CF79', tfrito: '#C9402C', queso: '#F6C64B', cuscus: '#E9CC86', garb: '#D9B26A',
  espin: '#2F8F55', pollo: '#E9B582', arroz: '#F6F0DC', lent: '#8E6340', zan: '#F3862F', tort: '#EBD4A0', ensal: '#5DB46B', pcoc: '#EBC56B',
  jamon: '#F2A0A0', caldo: '#E7B451', pita: '#E3C089', brocoli: '#2F8F4E', mene: '#6BB65A', salmo: '#E9785A', humus: '#E4CB9B', hamb: '#A9643A',
  qcrema: '#FBF4E4', champ: '#D9C6AC', tpat: '#E7C46A', base: '#E6CE98', guis: '#7DBF5A', maiz: '#F2CF45', aguac: '#9BC45A', tomf: '#E04B3A', gri: '#F7F4EE', miel: '#E0A12F',
  cott: '#F5F0E2', pcent: '#9F7347', hpro: '#B98F5E', claras: '#F7F4EA', noq: '#EBD7A0', gyoz: '#EFD6A6', kebab: '#C3824F', brocht: '#C27B4B', ptira: '#E8C298',
  atun: '#C99A86', salmahu: '#F2876A', gambas: '#F49A72', merluza: '#F2ECE0', tofu: '#F4ECD6', quinoa: '#E3CFA3', skyr: '#F8F6F0', boniato: '#E8803A',
  zumo: '#FFAA2B', limon: '#F6DC4A', jengi: '#D9B36A', kefir: '#F5F2EA', manza: '#E9CF6E', cacao: '#6B4226', sardi: '#A3AFBC', frojos: '#B23A5A',
  chia: '#5C5A55', choco: '#4A2C1D', ceb: '#EDDCC5', pimi: '#E2432F', calab: '#5E9E45', patata: '#E3C27A', coco: '#F7F3EA', edama: '#7CB342', soja: '#F1E8D2', kiwi: '#8DBA3F',
};
const hash = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
const shade = (hex: string, f: number) => '#' + [1, 3, 5].map((i) => Math.max(0, Math.min(255, Math.round(parseInt(hex.substr(i, 2), 16) * f))).toString(16).padStart(2, '0')).join('');
const lighten = (hex: string, t: number) => '#' + [1, 3, 5].map((i) => { const v = parseInt(hex.substr(i, 2), 16); return Math.round(v + (255 - v) * t).toString(16).padStart(2, '0'); }).join('');

/* ---------- qué recipiente lleva cada plato ---------- */
export type Kind = 'glass' | 'mug' | 'soup' | 'jar' | 'board' | 'wrap' | 'pan' | 'bowl' | 'plate';
export function dishKind(name = '', ids: string[] = [], slot = -1): Kind {
  const n = name.toLowerCase();
  if (/infusión|manzanilla|leche con cacao|leche caliente|bebida de soja con cacao/.test(n)) return 'mug';
  if (slot === 5 || /^zumo|^batido|^vaso de|^agua con/.test(n)) return 'glass';
  if (/^wrap|^mini wrap|quesadilla|^tacos|^pita de|^pan de pita/.test(n)) return 'wrap';
  if (/^tostada|^pan de|sándwich|sandwich|bocadillo|pita|pizza/.test(n)) return 'board';
  if (/^sopa|^crema de|caldo|salmorejo|curry|estofad|porridge|^lentejas/.test(n)) return 'soup';
  if (/overnight|^yogur|skyr|^kéfir con|^kefir con|pudin|^queso batido/.test(n)) return 'jar';
  if (/tortilla|revuelto|shakshuka|huevos revueltos/.test(n)) return 'pan';
  if (/bowl|poke|^ensalada|^bol /.test(n)) return 'bowl';
  if (!name && ids.length === 1 && ['zumo', 'kefir', 'leche', 'soja'].includes(ids[0])) return 'glass';
  return 'plate';
}

/* ---------- ingredientes dibujados ---------- */
// Cada función dibuja un ingrediente centrado en (x, y) con tamaño s (radio aproximado).
type Draw = (x: number, y: number, s: number, c: string, k: number) => JSX.Element;
const egg: Draw = (x, y, s, _c, k) => <G key={k}><Path d={`M${x - s} ${y} C${x - s} ${y - s * 0.9} ${x - s * 0.1} ${y - s * 1.05} ${x + s * 0.5} ${y - s * 0.8} C${x + s * 1.1} ${y - s * 0.55} ${x + s * 1.05} ${y + s * 0.7} ${x + s * 0.3} ${y + s * 0.85} C${x - s * 0.5} ${y + s} ${x - s} ${y + s * 0.6} ${x - s} ${y}Z`} fill="#FFFDF7" /><Circle cx={x + s * 0.05} cy={y} r={s * 0.42} fill="url(#yolk)" /><Circle cx={x - s * 0.08} cy={y - s * 0.13} r={s * 0.12} fill="#FFFFFF" opacity={0.7} /></G>;
const leaf: Draw = (x, y, s, c, k) => <G key={k}>{[0, 1, 2].map((i) => { const a = (i - 1) * 0.9 + (k % 3) * 0.3, dx = Math.cos(a) * s * 0.45, dy = Math.sin(a) * s * 0.45; return <G key={i} transform={`rotate(${(a * 180) / Math.PI} ${x + dx} ${y + dy})`}><Path d={`M${x + dx - s * 0.6} ${y + dy} Q${x + dx} ${y + dy - s * 0.55} ${x + dx + s * 0.6} ${y + dy} Q${x + dx} ${y + dy + s * 0.55} ${x + dx - s * 0.6} ${y + dy}Z`} fill={i === 1 ? c : shade(c, 0.85)} /><Path d={`M${x + dx - s * 0.5} ${y + dy} L${x + dx + s * 0.5} ${y + dy}`} stroke={lighten(c, 0.35)} strokeWidth={0.8} /></G>; })}</G>;
const broc: Draw = (x, y, s, c, k) => <G key={k}><Rect x={x - s * 0.18} y={y} width={s * 0.36} height={s * 0.7} rx={s * 0.15} fill="#9BC77A" />{[[-0.4, -0.1], [0.4, -0.1], [0, -0.45], [-0.15, 0.1], [0.2, 0.12]].map(([a, b], i) => <Circle key={i} cx={x + a * s} cy={y + b * s} r={s * 0.38} fill={i % 2 ? c : shade(c, 0.88)} />)}</G>;
const slice: Draw = (x, y, s, c, k) => <G key={k}><Circle cx={x} cy={y} r={s * 0.75} fill={shade(c, 0.9)} /><Circle cx={x} cy={y} r={s * 0.6} fill={lighten(c, 0.15)} />{[0, 1, 2, 3, 4, 5].map((i) => <Ellipse key={i} cx={x + Math.cos(i) * s * 0.32} cy={y + Math.sin(i) * s * 0.32} rx={s * 0.08} ry={s * 0.13} fill={lighten(c, 0.55)} transform={`rotate(${i * 60} ${x + Math.cos(i) * s * 0.32} ${y + Math.sin(i) * s * 0.32})`} />)}</G>;
const kiwiS: Draw = (x, y, s, _c, k) => <G key={k}><Circle cx={x} cy={y} r={s * 0.72} fill="#7A5A3A" /><Circle cx={x} cy={y} r={s * 0.64} fill="#8DBA3F" /><Circle cx={x} cy={y} r={s * 0.22} fill="#F3F0D2" />{Array.from({ length: 10 }, (_, i) => <Circle key={i} cx={x + Math.cos((i / 10) * 6.28) * s * 0.36} cy={y + Math.sin((i / 10) * 6.28) * s * 0.36} r={s * 0.04} fill="#2B2B1F" />)}</G>;
const citrus: Draw = (x, y, s, c, k) => <G key={k}><Circle cx={x} cy={y} r={s * 0.7} fill={shade(c, 0.92)} /><Circle cx={x} cy={y} r={s * 0.6} fill={lighten(c, 0.45)} />{Array.from({ length: 8 }, (_, i) => <Path key={i} d={`M${x} ${y} L${x + Math.cos((i / 8) * 6.28) * s * 0.55} ${y + Math.sin((i / 8) * 6.28) * s * 0.55}`} stroke={c} strokeWidth={s * 0.1} />)}</G>;
const sauce: Draw = (x, y, s, c, k) => <Path key={k} d={`M${x - s} ${y} C${x - s} ${y - s * 0.8} ${x - s * 0.2} ${y - s * 0.9} ${x + s * 0.4} ${y - s * 0.75} C${x + s * 1.1} ${y - s * 0.6} ${x + s * 0.95} ${y + s * 0.4} ${x + s * 0.4} ${y + s * 0.7} C${x - s * 0.2} ${y + s * 0.95} ${x - s} ${y + s * 0.6} ${x - s} ${y}Z`} fill={c} />;
const grains: Draw = (x, y, s, c, k) => <G key={k}><Ellipse cx={x} cy={y} rx={s * 0.95} ry={s * 0.7} fill={shade(c, 0.95)} />{Array.from({ length: 14 }, (_, i) => { const h = hash(String(k * 31 + i)); return <Ellipse key={i} cx={x + ((h % 15) / 15 - 0.5) * s * 1.5} cy={y + (((h >> 4) % 11) / 11 - 0.5) * s} rx={s * 0.13} ry={s * 0.07} fill={lighten(c, 0.4)} transform={`rotate(${h % 180} ${x} ${y})`} />; })}</G>;
const pastaD: Draw = (x, y, s, c, k) => <G key={k}>{Array.from({ length: 7 }, (_, i) => { const h = hash(String(i + k)); const px = x + ((h % 9) / 9 - 0.5) * s * 1.4, py = y + (((h >> 3) % 7) / 7 - 0.5) * s; return <G key={i} transform={`rotate(${h % 160} ${px} ${py})`}><Rect x={px - s * 0.3} y={py - s * 0.12} width={s * 0.6} height={s * 0.24} rx={s * 0.12} fill={i % 2 ? c : shade(c, 0.9)} /><Ellipse cx={px + s * 0.27} cy={py} rx={s * 0.05} ry={s * 0.09} fill={shade(c, 0.7)} /></G>; })}</G>;
const beans: Draw = (x, y, s, c, k) => <G key={k}>{Array.from({ length: 9 }, (_, i) => { const h = hash(String(i * 7 + k)); return <Circle key={i} cx={x + ((h % 11) / 11 - 0.5) * s * 1.5} cy={y + (((h >> 4) % 9) / 9 - 0.5) * s * 1.1} r={s * 0.2} fill={i % 3 ? c : shade(c, 0.85)} />; })}</G>;
const meat: Draw = (x, y, s, c, k) => <G key={k}>{[-0.45, 0, 0.45].map((o, i) => <G key={i} transform={`rotate(${-18 + i * 8} ${x} ${y + o * s})`}><Rect x={x - s * 0.85} y={y + o * s - s * 0.2} width={s * 1.7} height={s * 0.4} rx={s * 0.2} fill={i === 1 ? c : shade(c, 0.92)} /><Path d={`M${x - s * 0.4} ${y + o * s - s * 0.15} l${s * 0.2} ${s * 0.3} M${x + s * 0.1} ${y + o * s - s * 0.15} l${s * 0.2} ${s * 0.3}`} stroke={shade(c, 0.6)} strokeWidth={s * 0.07} strokeLinecap="round" /></G>)}</G>;
const patty: Draw = (x, y, s, c, k) => <G key={k}><Ellipse cx={x} cy={y} rx={s * 0.85} ry={s * 0.6} fill={shade(c, 0.85)} /><Ellipse cx={x} cy={y - s * 0.06} rx={s * 0.8} ry={s * 0.52} fill={c} /><Path d={`M${x - s * 0.5} ${y - s * 0.2} l${s * 0.3} ${s * 0.3} M${x} ${y - s * 0.3} l${s * 0.3} ${s * 0.3}`} stroke={shade(c, 0.6)} strokeWidth={s * 0.08} strokeLinecap="round" /></G>;
const fish: Draw = (x, y, s, c, k) => <G key={k}><Path d={`M${x - s} ${y + s * 0.3} Q${x - s * 0.6} ${y - s * 0.7} ${x + s * 0.2} ${y - s * 0.6} Q${x + s} ${y - s * 0.5} ${x + s * 0.9} ${y + s * 0.2} Q${x} ${y + s * 0.8} ${x - s} ${y + s * 0.3}Z`} fill={c} />{[-0.4, 0, 0.4].map((o, i) => <Path key={i} d={`M${x + o * s - s * 0.15} ${y - s * 0.45} Q${x + o * s + s * 0.1} ${y} ${x + o * s - s * 0.05} ${y + s * 0.45}`} stroke={lighten(c, 0.6)} strokeWidth={s * 0.08} fill="none" />)}</G>;
const shrimp: Draw = (x, y, s, c, k) => <G key={k}><Path d={`M${x + s * 0.6} ${y - s * 0.3} A${s * 0.65} ${s * 0.65} 0 1 0 ${x + s * 0.5} ${y + s * 0.5}`} stroke={c} strokeWidth={s * 0.42} fill="none" strokeLinecap="round" /><Path d={`M${x + s * 0.6} ${y - s * 0.3} A${s * 0.65} ${s * 0.65} 0 1 0 ${x + s * 0.5} ${y + s * 0.5}`} stroke={lighten(c, 0.35)} strokeWidth={s * 0.12} strokeDasharray={`${s * 0.15} ${s * 0.2}`} fill="none" /></G>;
const cubes: Draw = (x, y, s, c, k) => <G key={k}>{[[-0.45, -0.25], [0.3, -0.35], [0, 0.3], [0.55, 0.25], [-0.5, 0.4]].map(([a, b], i) => <G key={i}><Rect x={x + a * s - s * 0.22} y={y + b * s - s * 0.22} width={s * 0.44} height={s * 0.44} rx={s * 0.08} fill={shade(c, 0.88)} /><Rect x={x + a * s - s * 0.22} y={y + b * s - s * 0.26} width={s * 0.44} height={s * 0.38} rx={s * 0.08} fill={c} /></G>)}</G>;
const shreds: Draw = (x, y, s, c, k) => <G key={k}>{Array.from({ length: 10 }, (_, i) => { const h = hash(String(i * 13 + k)); const px = x + ((h % 11) / 11 - 0.5) * s * 1.5, py = y + (((h >> 4) % 9) / 9 - 0.5) * s; return <Rect key={i} x={px - s * 0.3} y={py - s * 0.05} width={s * 0.6} height={s * 0.1} rx={s * 0.05} fill={i % 2 ? c : lighten(c, 0.3)} transform={`rotate(${h % 180} ${px} ${py})`} />; })}</G>;
const dollop: Draw = (x, y, s, c, k) => <G key={k}><Path d={`M${x - s * 0.9} ${y + s * 0.3} Q${x - s * 0.8} ${y - s * 0.5} ${x - s * 0.1} ${y - s * 0.55} Q${x + s * 0.2} ${y - s * 0.95} ${x + s * 0.45} ${y - s * 0.45} Q${x + s * 0.95} ${y - s * 0.3} ${x + s * 0.85} ${y + s * 0.3} Q${x} ${y + s * 0.7} ${x - s * 0.9} ${y + s * 0.3}Z`} fill={c} /><Path d={`M${x - s * 0.45} ${y - s * 0.05} Q${x} ${y - s * 0.3} ${x + s * 0.4} ${y - s * 0.05}`} stroke="#FFFFFF" strokeWidth={s * 0.1} opacity={0.6} fill="none" /></G>;
const toast: Draw = (x, y, s, c, k) => <G key={k}><Path d={`M${x - s * 0.8} ${y + s * 0.8} L${x - s * 0.8} ${y - s * 0.2} Q${x - s * 0.95} ${y - s * 0.85} ${x} ${y - s * 0.85} Q${x + s * 0.95} ${y - s * 0.85} ${x + s * 0.8} ${y - s * 0.2} L${x + s * 0.8} ${y + s * 0.8}Z`} fill={shade(c, 0.8)} /><Path d={`M${x - s * 0.66} ${y + s * 0.68} L${x - s * 0.66} ${y - s * 0.15} Q${x - s * 0.78} ${y - s * 0.7} ${x} ${y - s * 0.7} Q${x + s * 0.78} ${y - s * 0.7} ${x + s * 0.66} ${y - s * 0.15} L${x + s * 0.66} ${y + s * 0.68}Z`} fill={lighten(c, 0.35)} /></G>;
const hamS: Draw = (x, y, s, c, k) => <G key={k}><Path d={`M${x - s * 0.8} ${y} Q${x - s * 0.4} ${y - s * 0.7} ${x + s * 0.3} ${y - s * 0.5} Q${x + s * 0.9} ${y - s * 0.2} ${x + s * 0.6} ${y + s * 0.4} Q${x} ${y + s * 0.8} ${x - s * 0.8} ${y}Z`} fill={c} /><Path d={`M${x - s * 0.5} ${y} Q${x} ${y - s * 0.35} ${x + s * 0.5} ${y - s * 0.1}`} stroke={lighten(c, 0.4)} strokeWidth={s * 0.08} fill="none" /></G>;
const avo: Draw = (x, y, s, _c, k) => <G key={k}><Path d={`M${x} ${y - s * 0.95} C${x + s * 0.55} ${y - s * 0.95} ${x + s * 0.75} ${y + s * 0.2} ${x + s * 0.65} ${y + s * 0.5} C${x + s * 0.5} ${y + s * 1.0} ${x - s * 0.5} ${y + s * 1.0} ${x - s * 0.65} ${y + s * 0.5} C${x - s * 0.75} ${y + s * 0.2} ${x - s * 0.55} ${y - s * 0.95} ${x} ${y - s * 0.95}Z`} fill="#3E6B2A" /><Path d={`M${x} ${y - s * 0.8} C${x + s * 0.45} ${y - s * 0.8} ${x + s * 0.6} ${y + s * 0.2} ${x + s * 0.52} ${y + s * 0.45} C${x + s * 0.4} ${y + s * 0.85} ${x - s * 0.4} ${y + s * 0.85} ${x - s * 0.52} ${y + s * 0.45} C${x - s * 0.6} ${y + s * 0.2} ${x - s * 0.45} ${y - s * 0.8} ${x} ${y - s * 0.8}Z`} fill="#CFE38E" /><Circle cx={x} cy={y + s * 0.3} r={s * 0.3} fill="#8A5A32" /></G>;
const banana: Draw = (x, y, s, _c, k) => <G key={k}>{[[-0.4, -0.2], [0.35, -0.3], [0, 0.35]].map(([a, b], i) => <G key={i}><Circle cx={x + a * s} cy={y + b * s} r={s * 0.36} fill="#EFD58A" /><Circle cx={x + a * s} cy={y + b * s} r={s * 0.3} fill="#FBEFC2" /><Circle cx={x + a * s} cy={y + b * s} r={s * 0.06} fill="#C9A85A" /></G>)}</G>;
const berries: Draw = (x, y, s, c, k) => <G key={k}>{[[-0.4, -0.2, '#6B3FA0'], [0.3, -0.35, c], [0, 0.3, '#D3394F'], [0.5, 0.25, '#4A3A8C'], [-0.45, 0.4, c]].map(([a, b, cc]: any, i) => <G key={i}><Circle cx={x + a * s} cy={y + b * s} r={s * 0.24} fill={cc} /><Circle cx={x + a * s - s * 0.07} cy={y + b * s - s * 0.08} r={s * 0.07} fill="#FFFFFF" opacity={0.45} /></G>)}</G>;
const nuts: Draw = (x, y, s, c, k) => <G key={k}>{[[-0.4, -0.15], [0.3, -0.3], [0, 0.3], [0.5, 0.25]].map(([a, b], i) => <G key={i} transform={`rotate(${i * 40} ${x + a * s} ${y + b * s})`}><Ellipse cx={x + a * s} cy={y + b * s} rx={s * 0.3} ry={s * 0.2} fill={i % 2 ? c : shade(c, 0.85)} /><Path d={`M${x + a * s - s * 0.2} ${y + b * s} Q${x + a * s} ${y + b * s - s * 0.1} ${x + a * s + s * 0.2} ${y + b * s}`} stroke={shade(c, 0.6)} strokeWidth={s * 0.05} fill="none" /></G>)}</G>;
const choco: Draw = (x, y, s, c, k) => <G key={k}><Rect x={x - s * 0.8} y={y - s * 0.55} width={s * 1.6} height={s * 1.1} rx={s * 0.1} fill={shade(c, 0.8)} />{[0, 1, 2].map((i) => [0, 1].map((j) => <Rect key={`${i}${j}`} x={x - s * 0.72 + i * s * 0.5} y={y - s * 0.47 + j * s * 0.5} width={s * 0.44} height={s * 0.44} rx={s * 0.06} fill={c} />))}</G>;
const coins: Draw = (x, y, s, c, k) => <G key={k}>{[[-0.45, -0.2], [0.3, -0.35], [0.05, 0.3], [0.55, 0.3], [-0.4, 0.45]].map(([a, b], i) => <G key={i}><Circle cx={x + a * s} cy={y + b * s} r={s * 0.25} fill={shade(c, 0.88)} /><Circle cx={x + a * s} cy={y + b * s} r={s * 0.18} fill={lighten(c, 0.2)} /></G>)}</G>;
const strips: Draw = (x, y, s, c, k) => <G key={k}>{[-0.4, 0, 0.4].map((o, i) => <Path key={i} d={`M${x - s * 0.7} ${y + o * s} Q${x} ${y + o * s - s * 0.25} ${x + s * 0.7} ${y + o * s}`} stroke={i === 1 ? c : shade(c, 0.85)} strokeWidth={s * 0.24} strokeLinecap="round" fill="none" />)}</G>;
const wedges: Draw = (x, y, s, c, k) => <G key={k}>{[[-0.4, -0.15, -20], [0.3, -0.3, 30], [0.05, 0.35, 80]].map(([a, b, r], i) => <G key={i} transform={`rotate(${r} ${x + a * s} ${y + b * s})`}><Path d={`M${x + a * s - s * 0.45} ${y + b * s + s * 0.15} Q${x + a * s} ${y + b * s - s * 0.45} ${x + a * s + s * 0.45} ${y + b * s + s * 0.15}Z`} fill={c} /><Path d={`M${x + a * s - s * 0.45} ${y + b * s + s * 0.15} L${x + a * s + s * 0.45} ${y + b * s + s * 0.15}`} stroke={shade(c, 0.7)} strokeWidth={s * 0.08} /></G>)}</G>;
const shroom: Draw = (x, y, s, c, k) => <G key={k}>{[[-0.4, -0.1], [0.35, -0.2], [0, 0.35]].map(([a, b], i) => <G key={i}><Path d={`M${x + a * s - s * 0.35} ${y + b * s} Q${x + a * s} ${y + b * s - s * 0.5} ${x + a * s + s * 0.35} ${y + b * s}Z`} fill={shade(c, 0.85)} /><Rect x={x + a * s - s * 0.1} y={y + b * s - s * 0.02} width={s * 0.2} height={s * 0.3} rx={s * 0.08} fill={lighten(c, 0.4)} /></G>)}</G>;
const dumpling: Draw = (x, y, s, c, k) => <G key={k}>{[[-0.4, -0.1], [0.4, -0.15], [0, 0.4]].map(([a, b], i) => <G key={i}><Path d={`M${x + a * s - s * 0.45} ${y + b * s + s * 0.15} Q${x + a * s} ${y + b * s - s * 0.55} ${x + a * s + s * 0.45} ${y + b * s + s * 0.15}Z`} fill={c} /><Path d={`M${x + a * s - s * 0.3} ${y + b * s - s * 0.05} l${s * 0.1} ${-s * 0.1} M${x + a * s} ${y + b * s - s * 0.15} l${s * 0.1} ${-s * 0.1} M${x + a * s + s * 0.25} ${y + b * s - s * 0.05} l${s * 0.1} ${-s * 0.1}`} stroke={shade(c, 0.7)} strokeWidth={s * 0.06} strokeLinecap="round" /><Path d={`M${x + a * s - s * 0.45} ${y + b * s + s * 0.15} L${x + a * s + s * 0.45} ${y + b * s + s * 0.15}`} stroke={shade(c, 0.6)} strokeWidth={s * 0.06} /></G>)}</G>;
const drizzle: Draw = (x, y, s, c, k) => <Path key={k} d={`M${x - s} ${y} Q${x - s * 0.5} ${y - s * 0.6} ${x} ${y} T${x + s} ${y}`} stroke={c} strokeWidth={s * 0.16} strokeLinecap="round" fill="none" opacity={0.9} />;
const seeds: Draw = (x, y, s, c, k) => <G key={k}>{Array.from({ length: 12 }, (_, i) => { const h = hash(String(i * 5 + k)); return <Circle key={i} cx={x + ((h % 13) / 13 - 0.5) * s * 1.4} cy={y + (((h >> 4) % 9) / 9 - 0.5) * s} r={s * 0.06} fill={c} />; })}</G>;
const DRAW: Record<string, Draw> = {
  huevo: egg, tpat: wedges, claras: dollop, espin: leaf, ensal: leaf, brocoli: broc, mene: beans, tomf: slice, tomrall: sauce, tfrito: sauce, salmo: sauce,
  arroz: grains, quinoa: grains, cuscus: grains, avena: grains, pasta: pastaD, noq: pastaD, garb: beans, lent: beans, guis: beans, edama: beans, maiz: beans,
  pollo: meat, ptira: meat, kebab: meat, brocht: meat, hamb: patty, salmahu: fish, merluza: fish, atun: fish, sardi: fish, gambas: shrimp,
  queso: shreds, cott: dollop, qcrema: dollop, yogur: dollop, gri: dollop, skyr: dollop, kefir: dollop, humus: dollop, cacah: dollop, tofu: cubes,
  pan: toast, pcent: toast, hpro: toast, pita: toast, tort: toast, base: toast, pavo: hamS, jamon: hamS, aguac: avo, platano: banana, frojos: berries,
  kiwi: kiwiS, limon: citrus, zumo: citrus, fruta: wedges, fsecos: nuts, choco: choco, cacao: seeds, chia: seeds, zan: coins, calab: coins, pimi: strips, ceb: strips,
  champ: shroom, boniato: cubes, patata: wedges, pcoc: wedges, gyoz: dumpling, miel: drizzle, jengi: coins, coco: dollop, caldo: sauce, leche: dollop, soja: dollop,
};
const drawIng = (id: string, x: number, y: number, s: number, k: number) => (DRAW[id] || dollop)(x, y, s, COL[id] || '#D9B26F', k);
/** Posiciones de 1 a 5 ingredientes dentro de un círculo de radio R centrado en (cx, cy). */
const spots = (n: number, cx: number, cy: number, R: number, flat = 0.62): [number, number][] =>
  n === 0 ? [] : n === 1 ? [[cx, cy]] : Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2 - Math.PI / 2 + 0.4; return [cx + Math.cos(a) * R * 0.44, cy + Math.sin(a) * R * 0.44 * flat]; });
const main = (ids: string[]) => [...new Set(ids)].filter((i) => COL[i]).slice(0, 4);
const liquid = (ids: string[]) => { const order = ['cacao', 'frojos', 'zumo', 'platano', 'kiwi', 'salmo', 'tfrito', 'lent', 'garb', 'calab', 'caldo', 'leche', 'soja', 'kefir', 'skyr', 'avena', 'limon', 'manza', 'miel']; const id = order.find((x) => ids.includes(x)) || ids[0]; return id === 'cacao' ? '#7A4B2E' : id === 'manza' || id === 'miel' ? '#E9C46A' : id === 'limon' ? '#F4E9A8' : id === 'calab' ? '#9CC46A' : id === 'garb' ? '#E6A94E' : COL[id] || '#E9C46A'; };
const Steam = ({ x, y }: { x: number; y: number }) => <G opacity={0.55}>{[-10, 0, 10].map((d, i) => <Path key={i} d={`M${x + d} ${y} q-5 -7 0 -14 q5 -7 0 -14`} stroke="#FFFFFF" strokeWidth={2.6} strokeLinecap="round" fill="none" />)}</G>;

/** Ilustración de un plato. name y slot ayudan a elegir el recipiente; sin ellos se dibuja un plato con los ingredientes. */
export function MealArt({ ids, size = 84, name = '', slot = -1, tint }: { ids: string[]; size?: number; name?: string; slot?: number; tint?: string }) {
  const uid = useRef('a' + Math.random().toString(36).slice(2, 8)).current;
  // Si el plato tiene ilustración pintada (tools/platos.py), se usa esa; si no, el dibujo vectorial de abajo.
  const pic = name ? PLATOS[name] : null;
  if (pic) return <Image source={pic} style={{ width: size, height: size }} resizeMode="contain" accessibilityIgnoresInvertColors />;
  const kind = dishKind(name, ids, slot), items = main(ids), hot = /sopa|crema|caldo|infusión|manzanilla|leche con cacao|porridge|curry|estofad|lentejas/i.test(name);
  const T = tint || '#8FAED0', u = (s: string) => `url(#${uid}${s})`;
  const defs = (
    <Defs>
      <RadialGradient id={uid + 'sh'} cx="50%" cy="50%" r="50%"><Stop offset="0" stopColor="#0B1B2B" stopOpacity={0.28} /><Stop offset="1" stopColor="#0B1B2B" stopOpacity={0} /></RadialGradient>
      <LinearGradient id={uid + 'pl'} x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#FFFFFF" /><Stop offset="1" stopColor="#E3E9F0" /></LinearGradient>
      <LinearGradient id={uid + 'cer'} x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor={lighten(T, 0.35)} /><Stop offset="1" stopColor={shade(T, 0.82)} /></LinearGradient>
      <LinearGradient id={uid + 'wood'} x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#E2AE76" /><Stop offset="1" stopColor="#B07440" /></LinearGradient>
      <LinearGradient id={uid + 'gl'} x1="0" y1="0" x2="1" y2="0"><Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.55} /><Stop offset="0.5" stopColor="#FFFFFF" stopOpacity={0.15} /><Stop offset="1" stopColor="#FFFFFF" stopOpacity={0.45} /></LinearGradient>
      <LinearGradient id={uid + 'liq'} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={lighten(liquid(ids), 0.25)} /><Stop offset="1" stopColor={shade(liquid(ids), 0.85)} /></LinearGradient>
      <RadialGradient id="yolk" cx="40%" cy="35%" r="65%"><Stop offset="0" stopColor="#FFE07A" /><Stop offset="1" stopColor="#F2A81D" /></RadialGradient>
    </Defs>
  );
  const shadow = (cx: number, cy: number, rx: number, ry: number) => <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={u('sh')} />;
  let body: JSX.Element;
  if (kind === 'glass') {
    const c = liquid(ids), fruit = ids.find((i) => ['limon', 'kiwi', 'zumo', 'frojos', 'platano'].includes(i));
    body = <G>{shadow(60, 106, 30, 6)}<Path d="M36 22 L84 22 L78 102 Q77 106 73 106 L47 106 Q43 106 42 102Z" fill="#EAF4FB" opacity={0.55} /><Path d="M38.5 44 L81.5 44 L77.6 101 Q77 104 73.5 104 L46.5 104 Q43 104 42.4 101Z" fill={u('liq')} /><Ellipse cx={60} cy={44} rx={21.5} ry={3.5} fill={lighten(c, 0.35)} /><Path d="M36 22 L84 22 L78 102 Q77 106 73 106 L47 106 Q43 106 42 102Z" fill={u('gl')} /><Rect x={64} y={6} width={5} height={50} rx={2.5} fill="#F28FB0" transform="rotate(14 66 30)" />{fruit ? drawIng(fruit === 'zumo' ? 'limon' : fruit, 82, 26, 12, 9) : null}<Path d="M44 30 L46 92" stroke="#FFFFFF" strokeWidth={3} opacity={0.6} strokeLinecap="round" /></G>;
  } else if (kind === 'mug') {
    body = <G>{shadow(56, 104, 34, 6)}<Path d="M86 48 q18 2 16 20 q-2 16 -18 16" stroke={u('cer')} strokeWidth={8} fill="none" /><Path d="M24 40 L88 40 L84 96 Q83 104 74 104 L38 104 Q29 104 28 96Z" fill={u('cer')} /><Ellipse cx={56} cy={40} rx={32} ry={7} fill={shade(T, 0.75)} /><Ellipse cx={56} cy={41} rx={28} ry={5} fill={u('liq')} /><Path d="M32 50 L34 92" stroke="#FFFFFF" strokeWidth={3} opacity={0.4} strokeLinecap="round" />{ids.includes('limon') ? drawIng('limon', 70, 40, 7, 1) : null}<Steam x={56} y={30} /></G>;
  } else if (kind === 'soup') {
    const top = items.filter((i) => !['caldo', 'salmo', 'leche', 'soja'].includes(i)).slice(0, 3);
    body = <G>{shadow(60, 104, 46, 8)}<Path d="M12 56 Q14 100 60 100 Q106 100 108 56Z" fill={u('cer')} /><Ellipse cx={60} cy={56} rx={48} ry={14} fill={shade(T, 0.78)} /><Ellipse cx={60} cy={57} rx={43} ry={11} fill={u('liq')} />{spots(top.length, 60, 56, 44, 0.32).map(([x, y], i) => drawIng(top[i], x, y, 8.5, i))}<Path d="M22 66 Q30 90 52 95" stroke="#FFFFFF" strokeWidth={3} opacity={0.35} fill="none" strokeLinecap="round" />{hot ? <Steam x={60} y={40} /> : null}</G>;
  } else if (kind === 'jar') {
    const top = items.filter((i) => !['yogur', 'gri', 'skyr', 'kefir', 'leche'].includes(i)).slice(0, 3);
    body = <G>{shadow(60, 106, 30, 6)}<Rect x={32} y={30} width={56} height={74} rx={14} fill="#EEF5FA" opacity={0.7} /><Rect x={35} y={58} width={50} height={43} rx={11} fill="#F8F5EE" /><Rect x={35} y={78} width={50} height={23} rx={11} fill={ids.includes('avena') ? '#E3C98F' : lighten(COL[top[0]] || '#E3C98F', 0.2)} /><Rect x={32} y={30} width={56} height={74} rx={14} fill={u('gl')} /><Rect x={30} y={22} width={60} height={12} rx={6} fill={u('cer')} />{spots(top.length, 60, 54, 34, 0.35).map(([x, y], i) => drawIng(top[i], x, y, 8, i))}</G>;
  } else if (kind === 'board') {
    const bread = ids.find((i) => ['pan', 'pcent', 'hpro', 'pita', 'base'].includes(i)) || 'pan', top = items.filter((i) => i !== bread).slice(0, 3);
    body = <G>{shadow(60, 104, 50, 7)}<Rect x={8} y={52} width={104} height={50} rx={16} fill={u('wood')} /><Path d="M20 64 Q60 60 100 66 M18 80 Q62 76 102 82 M22 94 Q60 90 98 95" stroke="#A86B38" strokeWidth={1.2} opacity={0.5} fill="none" /><Circle cx={104} cy={77} r={4} fill="#9A6234" />{bread === 'base' ? <G><Circle cx={60} cy={70} r={34} fill="#E6B873" /><Circle cx={60} cy={70} r={29} fill="#D9533D" />{spots(top.length, 60, 70, 46, 0.8).map(([x, y], i) => drawIng(top[i], x, y, 7.5, i))}</G> : <G>{toast(42, 66, 24, COL[bread], 1)}{toast(78, 70, 24, COL[bread], 2)}{top.map((id, i) => drawIng(id, i % 2 ? 78 : 42, (i % 2 ? 66 : 62) + Math.floor(i / 2) * 8, 11, i + 5))}</G>}</G>;
  } else if (kind === 'wrap') {
    const fill = items.filter((i) => i !== 'tort').slice(0, 3);
    body = <G>{shadow(60, 104, 46, 7)}<Ellipse cx={60} cy={78} rx={50} ry={22} fill={u('pl')} /><G transform="rotate(-18 60 70)"><Rect x={20} y={56} width={70} height={30} rx={15} fill="#EBD4A0" /><Ellipse cx={90} cy={71} rx={11} ry={15} fill="#F3E2B8" />{fill.map((id, i) => <Circle key={i} cx={88 + (i - 1) * 4} cy={66 + i * 5} r={5} fill={COL[id]} />)}<Path d="M30 62 Q55 58 80 62" stroke="#D3B57A" strokeWidth={1.5} fill="none" /><Path d="M34 76 L40 70 M50 78 L56 72 M66 78 L72 72" stroke="#C99A55" strokeWidth={2} strokeLinecap="round" opacity={0.6} /></G>{drawIng(fill[0] || 'ensal', 34, 90, 8, 7)}</G>;
  } else if (kind === 'pan') {
    const n = name.toLowerCase(), top = items.filter((i) => !['huevo', 'pan', 'claras', 'patata', 'pcoc', 'tpat'].includes(i)).slice(0, 3);
    const eggs = /shakshuka|patatas doradas/.test(n) ? 2 : 0;
    body = <G>{shadow(56, 106, 44, 7)}<Rect x={88} y={64} width={30} height={9} rx={4.5} fill="#3A2E28" transform="rotate(-12 88 68)" /><Ellipse cx={54} cy={74} rx={46} ry={28} fill="#2F3A44" /><Ellipse cx={54} cy={72} rx={40} ry={23} fill="#3C4955" /><Ellipse cx={54} cy={72} rx={36} ry={20} fill={/shakshuka/.test(n) ? '#C9402C' : /patatas doradas/.test(n) ? '#4A5866' : /claras/.test(n) ? '#F3EEDC' : /patata/.test(n) ? '#E2B85C' : '#F4D36B'} />{eggs ? [0, 1].map((i) => egg(40 + i * 28, 70 + (i ? 3 : -2), 11, '', i + 20)) : /revuelto/.test(n) ? <G>{[[38, 66], [56, 74], [70, 64], [46, 80], [64, 82]].map(([x, y], i) => <Ellipse key={i} cx={x} cy={y} rx={8} ry={5.5} fill={i % 2 ? '#FBE38A' : '#F6D35B'} />)}</G> : <Path d="M30 72 Q42 64 54 72 Q66 80 78 70" stroke="#FFF1B8" strokeWidth={3} fill="none" strokeLinecap="round" opacity={0.75} />}
      {/patatas doradas/.test(n) ? drawIng('pcoc', 54, 84, 9, 40) : null}{spots(top.length, 54, 72, 50, 0.4).map(([x, y], i) => drawIng(top[i], x, y, 6.5, i))}</G>;
  } else if (kind === 'bowl') {
    const top = items.slice(0, 4);
    body = <G>{shadow(60, 104, 46, 8)}<Path d="M10 54 Q12 102 60 102 Q108 102 110 54Z" fill={u('cer')} /><Ellipse cx={60} cy={54} rx={50} ry={16} fill={shade(T, 0.78)} /><Ellipse cx={60} cy={55} rx={45} ry={13} fill="#FBF8F1" />{top.map((id, i) => { const ang = (i / Math.max(1, top.length)) * Math.PI * 2 - 2.2; return drawIng(id, 60 + Math.cos(ang) * 22, 55 + Math.sin(ang) * 6.5, 10.5, i); })}<Path d="M20 66 Q28 92 50 97" stroke="#FFFFFF" strokeWidth={3} opacity={0.35} fill="none" strokeLinecap="round" /></G>;
  } else {
    const top = items.length ? items : ['fruta'];
    body = <G>{shadow(60, 66, 50, 46)}<Circle cx={60} cy={60} r={50} fill={u('pl')} /><Circle cx={60} cy={60} r={38} fill="none" stroke="#D2DCE7" strokeWidth={1.4} /><Circle cx={60} cy={60} r={50} fill="none" stroke="#FFFFFF" strokeWidth={2} opacity={0.8} />{spots(top.length, 60, 60, 60, 1).map(([x, y], i) => drawIng(top[i], x, y, top.length === 1 ? 26 : top.length < 4 ? 19 : 15, i))}</G>;
  }
  return <Svg width={size} height={size} viewBox="0 0 120 120">{defs}{body}</Svg>;
}

/* ---------- iconos ---------- */
const P: Record<string, string> = {
  plan: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
  mes: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
  compra: 'M3 3h2l2.4 12.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6M9 20.5a.5.5 0 1 0 0 .01M18 20.5a.5.5 0 1 0 0 .01',
  tu: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  aj: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6',
  clock: 'M12 7v5l3 2M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z',
  flame: 'M12 22c4 0 7-3 7-7 0-3-2-5-3-7-1 2-2 3-3 3 0-3-1-6-4-8 0 4-4 6-4 11 0 4 3 8 7 8z',
  bolt: 'M13 2 4 14h7l-1 8 9-12h-7z',
  leaf: 'M5 21c0-9 5-15 15-16 0 10-6 15-14 15M5 21c2-5 5-8 9-10',
  coin: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM9 9.5C9 8 10.3 7 12 7s3 1 3 2.5S13.5 12 12 12s-3 1-3 2.5S10.3 17 12 17s3-1 3-2.5',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  plus: 'M12 5v14M5 12h14',
  // «spark» y «wand» se dibujan como información y como «rehacer» (sin estrellas ni varitas: no son funciones de IA).
  spark: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18zM12 11v5.5M12 7.6v.2',
  info: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18zM12 11v5.5M12 7.6v.2',
  bulb: 'M9.5 18h5M10.5 21h3M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.3 1.1 2.2h5c0-.9.4-1.6 1.1-2.2A6 6 0 0 0 12 3z',
  left: 'M15 5l-7 7 7 7', right: 'M9 5l7 7-7 7', x: 'M6 6l12 12M18 6L6 18',
  share: 'M12 3v12M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5',
  wand: 'M20 11a8 8 0 0 0-14.6-4.5M4 3.5v4h4M4 13a8 8 0 0 0 14.6 4.5M20 20.5v-4h-4',
  desp: 'M5 8h14v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2zM4 4h16v4H4zM10 12h4',
  minus: 'M5 12h14',
  trash: 'M4 7h16M10 11v6M14 11v6M9 7V4h6v3M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13',
  wind: 'M3 8h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h8',
  sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
  moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z',
  swap: 'M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7',
  lock: 'M6 11h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1zM8 11V7a4 4 0 0 1 8 0v4M12 15v2',
  unlock: 'M6 11h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1zM8 11V7a4 4 0 0 1 7.6-1.8M12 15v2',
  ban: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18zM5.6 5.6l12.8 12.8',
  print: 'M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v7H6z',
  bell: 'M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0',
  cloud: 'M17.5 19a4.5 4.5 0 1 0-1.4-8.8A6 6 0 1 0 6 16.9M6 19h11.5',
  // Nevú Plus: la «n» del logotipo con su hoja y un «+» (en pequeño, para botones y etiquetas)
  nplus: 'M4 20v-7M4 15.5a4.5 4.5 0 0 1 9 0V20M12 9c0-2.8 1.7-4.7 4.4-5.5.3 2.8-1.4 4.8-4.4 5.5zM19 14v6M16 17h6',
};
export function Icon({ n, size = 22, color = '#000', w = 2 }: { n: string; size?: number; color?: string; w?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none"><Path d={P[n] || P.plus} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}

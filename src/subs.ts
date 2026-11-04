// Sustitutos y secciones de la lista de la compra.
//
// SUBS: si en la tienda no encuentras un producto, estas son alternativas parecidas que sirven para la misma
// receta (textura, uso y nutrición parecidos). La cantidad se ajusta sola por peso (ver subQty) y el precio y el
// envase salen del producto alternativo de tu supermercado. Puedes añadir más: clave = ingrediente que falta,
// valor = alternativas por orden de preferencia (ids de ING en data.ts).
import { ING } from './data';

export const SUBS: Record<string, string[]> = {
  skyr: ['qbat', 'gri', 'yogur'], qbat: ['skyr', 'gri', 'cott'], gri: ['skyr', 'qbat', 'yogur'], yogur: ['gri', 'kefir', 'skyr'], kefir: ['yogur', 'gri'],
  cott: ['qbat', 'qcrema'], qcrema: ['cott', 'qbat'], queso: ['cott'], leche: ['soja'], soja: ['leche'],
  calab: ['beren', 'pimi'], beren: ['calab', 'pimi'], pimi: ['calab', 'zan'], zan: ['calab', 'pimi'], ceb: ['pimi'], tomf: ['tomrall'], tomrall: ['tomf', 'tfrito'],
  espin: ['brocoli', 'mene'], brocoli: ['judv', 'mene', 'espin'], mene: ['brocoli', 'guis'], guis: ['edama', 'mene'], edama: ['guis'], champ: ['calab', 'beren'],
  ensal: ['tomf', 'espin'], boniato: ['patata'], patata: ['boniato', 'pcoc'], pcoc: ['patata'], aguac: ['humus'], humus: ['aguac'],
  fruta: ['platano', 'kiwi'], platano: ['fruta', 'kiwi'], kiwi: ['fruta', 'platano'], frojos: ['fruta', 'kiwi'], limon: ['zumo'],
  pollo: ['ptira', 'pavo'], ptira: ['pollo'], kebab: ['ptira', 'pollo'], brocht: ['pollo'], hamb: ['pollo'], pavo: ['jamon'], jamon: ['pavo'],
  atun: ['sardi'], sardi: ['atun'], merluza: ['salmon', 'salmahu', 'atun'], salmahu: ['atun', 'merluza'], gambas: ['merluza'], tofu: ['edama'],
  garb: ['alub', 'lent'], lent: ['alub', 'garb'], alub: ['garb', 'lent'], judv: ['brocoli', 'mene'], salmon: ['merluza', 'salmahu'], mozz: ['queso', 'qbat'], pasta: ['cuscus', 'arroz'], cuscus: ['quinoa', 'arroz'], quinoa: ['cuscus', 'arroz'], arroz: ['quinoa', 'cuscus'], noq: ['pasta'],
  pan: ['pcent', 'hpro'], pcent: ['pan', 'hpro'], hpro: ['pan', 'pcent'], tort: ['pita'], pita: ['tort'], base: ['pita'],
  fsecos: ['cacah'], cacah: ['fsecos'], avena: ['quinoa'], miel: [], choco: ['cacao'], cacao: ['choco'], chia: ['fsecos'], zumo: ['zmanz', 'fruta'], zmanz: ['zumo'], mango: ['frojos', 'kiwi'], coco: ['leche'],
};

/** Gramos (o ml) que pesa una unidad de un ingrediente. */
const per = (id: string) => (ING[id].u === 'g' || ING[id].u === 'ml' ? 1 : ING[id].gu || 1);
/** Cantidad del sustituto equivalente a q del original (por peso). */
export const subQty = (from: string, to: string, q: number) => (q * per(from)) / per(to);

/* ---------- secciones de la lista de la compra (como en el súper) ---------- */
export const SECTIONS: [string, string, string[]][] = [
  ['fruver', 'Fruta y verdura', ['platano', 'fruta', 'kiwi', 'limon', 'aguac', 'tomf', 'ensal', 'zan', 'ceb', 'pimi', 'calab', 'beren', 'patata', 'boniato', 'jengi', 'champ', 'mango']],
  ['lact', 'Lácteos y huevos', ['leche', 'soja', 'yogur', 'gri', 'skyr', 'qbat', 'kefir', 'cott', 'qcrema', 'queso', 'mozz', 'huevo', 'claras']],
  ['prot', 'Carne, pescado y tofu', ['pollo', 'ptira', 'kebab', 'brocht', 'hamb', 'pavo', 'jamon', 'salmahu', 'tofu']],
  ['cereal', 'Pan, pasta y cereales', ['pan', 'pcent', 'hpro', 'tort', 'pita', 'base', 'pasta', 'noq', 'arroz', 'quinoa', 'cuscus', 'avena']],
  ['cons', 'Legumbres, conservas y salsas', ['garb', 'lent', 'alub', 'maiz', 'atun', 'sardi', 'tomrall', 'tfrito', 'caldo', 'coco']],
  ['prep', 'Preparados y frescos', ['humus', 'salmo', 'tpat', 'pcoc', 'gyoz']],
  ['desay', 'Desayuno, dulce y frutos secos', ['cacah', 'fsecos', 'chia', 'miel', 'cacao', 'choco']],
  ['beb', 'Bebidas e infusiones', ['zumo', 'zmanz', 'manza']],
  ['cong', 'Congelados', ['espin', 'brocoli', 'judv', 'mene', 'guis', 'edama', 'frojos', 'gambas', 'merluza', 'salmon']],
];
/** Sección de un ingrediente (si no está en la lista, por su zona: congelado o «otros»). */
export const sectionOf = (id: string) => SECTIONS.find(([, , ids]) => ids.includes(id))?.[0] ?? (ING[id]?.s === 'C' ? 'cong' : 'cons');

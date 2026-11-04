// Detalles de cocina que no siempre vienen en los pasos: el nivel de fuego (del 1 al 6), el tamaño aproximado de los
// cortes y si hay que pelar la fruta o la verdura. Se añaden solos a cada receta (en la app y en el PDF).
// Para cambiar un tamaño o un consejo, edita las tablas de abajo.

/** Nivel de fuego de la placa, del 1 (mínimo) al 6 (máximo). */
const FUEGO: [RegExp, number][] = [
  [/fuego (?:muy )?suave|fuego lento|fuego bajo/i, 2],
  [/fuego medio-bajo/i, 3],
  [/fuego medio-alto/i, 5],
  [/fuego medio/i, 4],
  [/fuego (?:fuerte|alto|vivo)/i, 6],
];
/** Tamaño aproximado de cada tipo de corte. */
const CORTES: [RegExp, string][] = [
  [/\ben rodajas\b/i, 'de unos 5 mm'],
  [/\ben daditos\b/i, 'de unos 5 mm'],
  [/\ben dados (?:pequeños|finos)\b/i, 'de 0,5 a 1 cm'],
  [/\ben dados\b(?! (?:pequeños|finos))/i, 'de 1 a 1,5 cm'],
  [/\ben tiras\b/i, 'de 1 cm de ancho'],
  [/\ben trozos\b/i, 'de 2 a 3 cm'],
  [/\ben láminas\b/i, 'finas, de 2 a 3 mm'],
  [/\ben juliana\b/i, 'tiras muy finas, de 2 a 3 mm'],
];
/** Si se pela o no cada fruta o verdura fresca (por su id en data.ts). */
export const PELAR: Record<string, string> = {
  platano: 'Pélalo.',
  fruta: 'La manzana no hace falta pelarla, solo lavarla; la mandarina, pélala.',
  kiwi: 'Pélalo, o pártelo por la mitad y sácalo con una cuchara.',
  limon: 'No se pela: lávalo bien si usas la ralladura.',
  aguac: 'Pártelo por la mitad, quita el hueso y saca la pulpa con una cuchara.',
  tomf: 'No hace falta pelarlo: lávalo y quita la parte del tallo.',
  ensal: 'Ya viene lavada y lista para usar.',
  zan: 'Pélala o ráspala con el pelador y quita las puntas.',
  ceb: 'Quita las puntas y la piel seca de fuera.',
  pimi: 'No se pela: lávalo y quita el tallo, las semillas y las partes blancas.',
  calab: 'No hace falta pelarlo: lávalo y quita las puntas.',
  beren: 'No hace falta pelarla: lávala y quita el tallo.',
  patata: 'Pélala (si es nueva, basta con lavarla bien).',
  boniato: 'Pélalo, o lávalo bien si lo haces con piel.',
  jengi: 'Pélalo raspando la piel con una cucharilla.',
  champ: 'No se pelan: límpialos con papel de cocina húmedo y corta el final del tallo.',
  mango: 'Pélalo y corta la pulpa alrededor del hueso.',
};

/**
 * Un paso con sus detalles: el nivel de fuego después de «a fuego medio» (o al final, si usa sartén, plancha o
 * agua hirviendo y no lo dice) y el tamaño después de «en rodajas», «en dados»…
 */
export function detalle(paso: string): string {
  let out = paso, fuego = false;
  for (const [re, n] of FUEGO) {
    const m = re.exec(out);
    if (m) { out = out.slice(0, m.index + m[0].length) + ` (${n} de 6)` + out.slice(m.index + m[0].length); fuego = true; break; }
  }
  const otroAparato = /microondas|freidora|horno|airfryer/i.test(out);
  if (!fuego && !otroAparato) {
    if (/\bplancha\b/i.test(out) || /\b(dora|dóra\w*|saltea|saltéa\w*|fríe|fríe\w*)\b/i.test(out)) out = punto(out) + ' Fuego: 5 de 6.';
    else if (/\b(sofríe|sofríe\w*|pocha|póchal\w*)\b/i.test(out)) out = punto(out) + ' Fuego: 4 de 6.';
    else if (/\b(hierv\w*|cuece|cuéce\w*|cocer)\b/i.test(out)) out = punto(out) + ' Fuego: 6 de 6 hasta que hierva; luego, 4 de 6.';
    else if (/\bsartén\b/i.test(out)) out = punto(out) + ' Fuego: 4 de 6.';
  }
  // Tamaño del corte (si el paso no lo dice ya en cm o mm).
  if (!/\d\s?(cm|mm)\b/i.test(out)) for (const [re, t] of CORTES) { const m = re.exec(out); if (m) out = out.slice(0, m.index + m[0].length) + ` (${t})` + out.slice(m.index + m[0].length); }
  return out;
}
const punto = (s: string) => (/[.!?]$/.test(s.trim()) ? s.trim() : s.trim() + '.');

/** Antes de empezar: qué hacer con cada fruta o verdura de la receta (pelar o no). [nombre, consejo] */
export function antes(items: [string, number][], nombre: (id: string) => string): [string, string][] {
  return [...new Set(items.map(([id]) => id))].filter((id) => PELAR[id]).map((id) => [nombre(id), PELAR[id]]);
}

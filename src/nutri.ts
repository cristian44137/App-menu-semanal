// Micronutrientes y valores de referencia.
//
// MICRO: valores típicos por 100 g (o 100 ml) de cada ingrediente, tomados de tablas de composición de alimentos
// (USDA FoodData Central y BEDCA). Son aproximados: las fichas de los supermercados casi nunca dan vitaminas y
// minerales, así que estos números NO salen del MCP. Si tienes un dato mejor, cámbialo aquí.
// Orden de cada fila: ver MN más abajo.
export const MN = [
  { k: 'fib', n: 'Fibra', u: 'g' },
  { k: 'mg', n: 'Magnesio', u: 'mg' },
  { k: 'fe', n: 'Hierro', u: 'mg' },
  { k: 'zn', n: 'Zinc', u: 'mg' },
  { k: 'ca', n: 'Calcio', u: 'mg' },
  { k: 'fol', n: 'Folato', u: 'µg' },
  { k: 'b12', n: 'Vitamina B12', u: 'µg' },
  { k: 'vd', n: 'Vitamina D', u: 'µg' },
  { k: 'vc', n: 'Vitamina C', u: 'mg' },
  { k: 'o3', n: 'Omega-3 (EPA+DHA)', u: 'mg' },
] as const;

//                fib    mg     fe    zn    ca    fol   b12   vd    vc    o3
export const MICRO: Record<string, number[]> = {
  avena:   [10,   138,   4.3,  3.6,   54,   32,   0,    0,    0,    0],
  leche:   [0,     10,   0.03, 0.4,  113,    5,   0.45, 0.1,  0,    0],
  platano: [2.6,   27,   0.3,  0.15,   5,   20,   0,    0,    8.7,  0],
  pan:     [6.5,   75,   2.5,  1.8,  100,   40,   0,    0,    0,    0],
  tomrall: [1.2,   11,   0.3,  0.17,  10,   15,   0,    0,   14,    0],
  pavo:    [0,     22,   0.6,  1.0,   10,    5,   0.4,  0.1,  0,   10],
  cacah:   [6,    170,   1.9,  2.9,   45,   90,   0,    0,    0,    0],
  yogur:   [0,     12,   0.05, 0.6,  121,    7,   0.37, 0.05, 0.5,  0],
  huevo:   [0,     12,   1.8,  1.3,   56,   47,   0.9,  2.0,  0,   60],
  fsecos:  [6.7,  158,   2.9,  3.1,   98,   98,   0,    0,    1.3,  0],
  fruta:   [2.4,    5,   0.1,  0.04,   6,    3,   0,    0,    4.6,  0],
  pasta:   [3.2,   53,   1.3,  1.4,   21,   18,   0,    0,    0,    0],
  tfrito:  [1.5,   15,   0.6,  0.2,   15,   10,   0,    0,    8,    0],
  queso:   [0,     20,   0.4,  2.9,  505,    7,   2.3,  0.4,  0,    0],
  cuscus:  [5,     44,   1.1,  0.8,   24,   20,   0,    0,    0,    0],
  garb:    [7.6,   48,   2.9,  1.5,   49,  172,   0,    0,    1.3,  0],
  espin:   [2.2,   79,   2.7,  0.5,  136,  140,   0,    0,   10,    0],
  pollo:   [0,     28,   0.4,  0.8,    5,    4,   0.3,  0.1,  0,   20],
  arroz:   [0.4,   12,   0.2,  0.5,    3,    3,   0,    0,    0,    0],
  lent:    [7.9,   36,   3.3,  1.3,   19,  181,   0,    0,    1.5,  0],
  zan:     [2.8,   12,   0.3,  0.24,  33,   19,   0,    0,    5.9,  0],
  tort:    [2.5,   20,   1.5,  0.6,  120,   20,   0,    0,    0,    0],
  ensal:   [2,     25,   1.2,  0.3,   60,  100,   0,    0,   15,    0],
  pcoc:    [1.8,   22,   0.3,  0.3,    5,   10,   0,    0,    7,    0],
  jamon:   [0,     22,   0.8,  2.0,    8,    2,   0.4,  0.5,  0,    0],
  caldo:   [0,      2,   0.1,  0.05,   2,    1,   0,    0,    0,    0],
  pita:    [2.2,   26,   1.6,  0.8,   86,   30,   0,    0,    0,    0],
  brocoli: [3.3,   21,   0.7,  0.4,   40,  108,   0,    0,   40,    0],
  mene:    [3.5,   20,   0.8,  0.4,   30,   40,   0,    0,   10,    0],
  salmo:   [1,     12,   0.5,  0.2,   12,   15,   0,    0,   10,    0],
  humus:   [6,     71,   2.4,  1.8,   38,   83,   0,    0,    0,    0],
  hamb:    [0.5,   22,   0.8,  1.0,   15,    5,   0.3,  0.1,  0,    0],
  qcrema:  [0,      9,   0.1,  0.5,   98,    9,   0.2,  0.2,  0,    0],
  champ:   [1,      9,   0.5,  0.5,    3,   17,   0.04, 0.2,  2,    0],
  tpat:    [1.2,   18,   0.9,  0.6,   25,   25,   0.3,  0.6,  0,    0],
  base:    [2.5,   20,   1.2,  0.6,   20,   25,   0,    0,    0,    0],
  guis:    [5.5,   22,   1.5,  0.7,   24,   59,   0,    0,   18,    0],
  maiz:    [2,     19,   0.4,  0.4,    4,   40,   0,    0,    3,    0],
  aguac:   [6.7,   29,   0.6,  0.6,   12,   81,   0,    0,   10,    0],
  tomf:    [1.2,   11,   0.3,  0.17,  10,   15,   0,    0,   14,    0],
  gri:     [0,     11,   0.1,  0.5,  100,    7,   0.5,  0.1,  0,    0],
  miel:    [0.2,    2,   0.4,  0.2,    6,    2,   0,    0,    0.5,  0],
  cott:    [0,      8,   0.1,  0.4,   83,   12,   0.4,  0.1,  0,    0],
  pcent:   [6.5,   50,   2.0,  1.2,   40,   35,   0,    0,    0,    0],
  hpro:    [9,    100,   3.0,  2.5,   80,   40,   0,    0,    0,    0],
  claras:  [0,     11,   0.1,  0.03,   7,    4,   0.1,  0,    0,    0],
  noq:     [1.5,   15,   0.5,  0.3,   15,   10,   0,    0,    2,    0],
  gyoz:    [1.5,   15,   0.8,  0.6,   20,   15,   0.1,  0,    0,    0],
  kebab:   [0,     22,   0.9,  1.2,   15,    5,   0.3,  0.1,  0,    0],
  brocht:  [0.5,   25,   0.6,  1.0,    8,    5,   0.3,  0,   20,    0],
  ptira:   [0,     28,   0.5,  0.8,    6,    4,   0.3,  0.1,  0,    0],
  atun:    [0,     27,   1.0,  0.5,   11,    2,   2.5,  1.7,  0,  270],
  salmahu: [0,     18,   0.85, 0.3,   11,    2,   3.3, 10,    0, 1200],
  gambas:  [0,     30,   0.5,  1.3,   60,   10,   1.1,  0,    0,  300],
  merluza: [0,     30,   0.3,  0.4,   30,   10,   1.0,  1.0,  0,  250],
  tofu:    [1,     60,   1.8,  1.0,  200,   19,   0,    0,    0,    0],
  quinoa:  [2.8,   64,   1.5,  1.1,   17,   42,   0,    0,    0,    0],
  skyr:    [0,     11,   0.1,  0.5,  110,   10,   0.5,  0,    0,    0],
  boniato: [3,     25,   0.6,  0.3,   30,   11,   0,    0,   12,    0],
  zumo:    [0.2,   11,   0.2,  0.05,  11,   30,   0,    0,   50,    0],
  limon:   [2.8,    8,   0.6,  0.06,  26,   11,   0,    0,   53,    0],
  jengi:   [2,     43,   0.6,  0.34,  16,   11,   0,    0,    5,    0],
  kefir:   [0,     12,   0.05, 0.4,  120,    5,   0.3,  0.05, 0,    0],
  manza:   [0,      0,   0,    0,      0,    0,   0,    0,    0,    0],
  cacao:   [33,   499,  13.9,  6.8,  128,   32,   0,    0,    0,    0],
  sardi:   [0,     39,   2.9,  1.3,  382,   10,   8.9,  4.8,  0, 1000],
  frojos:  [4,     15,   0.6,  0.2,   20,   20,   0,    0,   30,    0],
  chia:    [34,   335,   7.7,  4.6,  631,   49,   0,    0,    0,    0],
  choco:   [11,   228,  11.9,  3.3,   73,    0,   0,    0,    0,    0],
  ceb:     [1.7,   10,   0.2,  0.17,  23,   19,   0,    0,    7.4,  0],
  pimi:    [2.1,   12,   0.4,  0.25,   7,   46,   0,    0,  128,    0],
  calab:   [1,     18,   0.4,  0.3,   16,   24,   0,    0,   18,    0],
  patata:  [2.1,   23,   0.8,  0.3,   12,   15,   0,    0,   12,    0],
  coco:    [0,     37,   1.6,  0.6,   16,   16,   0,    0,    1,    0],
  edama:   [5,     64,   2.3,  1.4,   63,  311,   0,    0,    6,    0],
  soja:    [0.6,   15,   0.4,  0.3,  120,   10,   0.38, 0.75, 0,    0],
  kiwi:    [3,     17,   0.3,  0.14,  34,   25,   0,    0,   93,    0],
  judv:    [2.7,   25,   1.0,  0.24,  37,   33,   0,    0,   12,    0],
  salmon:  [0,     29,   0.3,  0.4,    9,   26,   3.2, 11,    0,  2000],
  mozz:    [0,     20,   0.4,  2.9,  505,    7,   2.3,  0.4,  0,    0],
  alub:    [6.3,   45,   2.1,  0.9,   60,   81,   0,    0,    0,    0],
  qbat:    [0,     10,   0.1,  0.5,  100,   12,   0.4,  0,    0,    0],
  beren:   [3,     14,   0.2,  0.2,    9,   22,   0,    0,    2.2,  0],
  zmanz:   [0.2,    5,   0.1,  0.02,   8,    0,   0,    0,    1,    0],
  mango:   [1.6,   10,   0.16, 0.09,  11,   43,   0,    0,   36,    0],
};

// Macros genéricos [kcal, proteína, hidratos, grasa] por 100 g para frescos cuya ficha no trae nutrición.
export const GEN: Record<string, number[]> = {
  platano: [89, 1.1, 22.8, 0.3], zan: [41, 0.9, 9.6, 0.2], tomf: [18, 0.9, 3.9, 0.2], fruta: [52, 0.3, 13.8, 0.2],
  aguac: [160, 2, 8.5, 14.7], champ: [22, 3.1, 3.3, 0.3], boniato: [86, 1.6, 20, 0.1], jengi: [80, 1.8, 18, 0.8],
  manza: [1, 0, 0.2, 0], ceb: [40, 1.1, 9.3, 0.1], pimi: [31, 1, 6, 0.3], calab: [17, 1.2, 3.1, 0.3], patata: [77, 2, 17, 0.1], kiwi: [61, 1.1, 14.7, 0.5], beren: [25, 1, 5.9, 0.2], mango: [60, 0.8, 15, 0.4],
};

/**
 * Objetivo diario de cada micronutriente para un adulto (valores de referencia de la EFSA, DRV Finder).
 * Algunos dependen del sexo. La fibra se toma de tus ajustes.
 */
export function refs(sex: 'm' | 'f', fibra: number): number[] {
  return [fibra, sex === 'f' ? 300 : 350, sex === 'f' ? 16 : 11, 10, 950, 330, 4, 15, sex === 'f' ? 95 : 110, 250];
}

/**
 * Peso de cada nutriente en el optimizador.
 * - normal: cubrir todo por igual (la vitamina D pesa menos: depende sobre todo del sol).
 * - ánimo: más peso a omega-3, folato, B12, vitamina D, magnesio, zinc, hierro y fibra. Base científica:
 *   dieta mediterránea en el ensayo SMILES (Jacka et al., BMC Medicine 2017), omega-3 con EPA en depresión
 *   (metaanálisis de Liao et al., Translational Psychiatry 2019) y la asociación de carencias de folato, B12,
 *   vitamina D, magnesio, zinc y hierro con peor estado de ánimo. Es un apoyo, no un tratamiento.
 * - resfriado: más peso a vitamina C y zinc (ayudan a acortar la duración en algunos estudios; no lo curan).
 */
export function weights(mood: boolean, cold: boolean): number[] {
  const w = [0.6, 0.5, 0.5, 0.5, 0.4, 0.5, 0.5, 0.25, 0.5, 0.3];
  if (mood) [[0, 1], [1, 1], [2, 0.9], [3, 1], [5, 1.2], [6, 1.2], [7, 0.6], [9, 1.4]].forEach(([i, v]) => (w[i] = v));
  if (cold) { w[8] = Math.max(w[8], 1.4); w[3] = Math.max(w[3], 1.1); }
  return w;
}

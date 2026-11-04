// Tokens de diseño (misma línea que el icono): fondo con degradado teñido del acento, superficies blancas «perla»
// (o azul noche en oscuro) con sombra suave para dar profundidad, esquinas sobrias, acento con degradado,
// modo claro/oscuro, acentos y tamaños elegibles. Los colores de texto cumplen contraste WCAG AA (4,5:1 o más).

/** Acentos: l = color en modo claro, d = en modo oscuro (más luminoso para que se lea sobre fondo oscuro), g = segundo color del degradado. */
// El orden importa: el ajuste guarda la posición (Océano, el de por defecto, va primero; ver mergeRaw en controller.ts).
export const ACCENTS = [
  { n: 'Océano', l: '#1565C0', d: '#6CB4FF', g: '#0E8AA8' },
  { n: 'Oasis', l: '#127A6E', d: '#5FE0CB', g: '#3E8E3A' },
  { n: 'Laguna', l: '#0E7480', d: '#4FD3DE', g: '#2D6FB8' },
  { n: 'Salvia', l: '#2E7D4F', d: '#6FDB9C', g: '#6E9A1E' },
  { n: 'Oliva', l: '#5E7A12', d: '#C2DC5E', g: '#9A7A0C' },
  { n: 'Mostaza', l: '#9A6200', d: '#FFC14D', g: '#B5481E' },
  { n: 'Arcilla', l: '#B94A22', d: '#FF9466', g: '#B3263F' },
  { n: 'Frambuesa', l: '#B3204F', d: '#FF7EAA', g: '#7A3BB0' },
  { n: 'Ciruela', l: '#6E3FB0', d: '#C59BFF', g: '#3550B8' },
  { n: 'Pizarra', l: '#3A5878', d: '#9DBDE0', g: '#4F3F8F' },
];
/** Los temas que se ven en Ajustes (posiciones de ACCENTS): variados y de buen contraste. Los demás siguen existiendo por si alguien ya los eligió. */
export const SHOWN = [0, 1, 5, 6, 7, 8];
/** Colores para crear un tema propio (Nevú Plus): [nombre, color]. Todos se leen bien con texto blanco encima. */
export const PALETA: [string, string][] = [
  ['Naranja', '#D9480F'], ['Rojo', '#C92A2A'], ['Rosa', '#C2255C'], ['Morado', '#7048E8'], ['Índigo', '#364FC7'], ['Azul', '#1C7ED6'],
  ['Turquesa', '#0B7285'], ['Verde mar', '#0CA678'], ['Verde', '#2B8A3E'], ['Lima', '#5C940D'], ['Ámbar', '#E67700'], ['Grafito', '#495057'],
];
export type Custom = { n: string; l: string; g: string };
/** Color de cada franja: desayuno, comida, cena, merienda de mañana, merienda de tarde, bebida (vivos, para que se distingan bien). */
export const SLOT = ['#F4B23E', '#F2774B', '#4F8DF0', '#2FBF84', '#9B6CF0', '#1FB5CC'];
/** Tamaños de texto: XS, S, M, L, XL, XXL. */
export const TEXT = [{ n: 'XS', f: 0.85 }, { n: 'S', f: 0.93 }, { n: 'M', f: 1 }, { n: 'L', f: 1.1 }, { n: 'XL', f: 1.22 }, { n: 'XXL', f: 1.36 }];
/** Espaciado de tarjetas y huecos: compacto, normal, amplio. */
export const DENS = [{ n: 'Compacto', f: 0.78 }, { n: 'Normal', f: 1 }, { n: 'Amplio', f: 1.22 }];

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const toHex = (c: number[]) => '#' + c.map((x) => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, '0')).join('');
/** Mezcla a con b en proporción t (0 = a, 1 = b). */
export const mix = (a: string, b: string, t: number) => { const x = hex(a), y = hex(b); return toHex(x.map((v, i) => v + (y[i] - v) * t)); };
const lum = (h: string): number => { const [r, g, b] = hex(h).map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };

/** Oscurece un color hasta que el texto blanco encima tenga contraste 4,5:1 (luminancia ≤ 0,183). */
const deep = (c: string) => { let x = c; for (let i = 0; i < 12 && lum(x) > 0.183; i++) x = mix(x, '#000000', 0.08); return x; };

/**
 * sys = tamaño de letra del sistema (Ajustes del móvil → Tamaño de fuente). La app lo aplica ella misma (con un tope)
 * en vez de dejar que Android agrande solo la letra: así altura de línea, cajas y filas crecen a la vez y no se corta nada.
 * width = ancho de pantalla en dp (con «Tamaño de pantalla» o zoom grande, es más estrecha).
 */
export const makeTheme = (mode: string, scheme: string | null | undefined, accent: number, text: number, dens = 1, sys = 1, width = 400, custom: Custom | null = null) => {
  const dark = mode === 'auto' ? scheme === 'dark' : mode === 'dark';
  // Con un tema propio de Plus, sus dos colores sustituyen al acento (el claro se oscurece lo justo para leerse sobre blanco).
  const G = custom, a = G ? { n: G.n, l: deep(G.l), d: mix(G.l, '#FFFFFF', 0.42), g: G.g } : ACCENTS[accent] || ACCENTS[0], ac = dark ? a.d : a.l;
  // Fondos y tarjetas teñidos del acento (con Océano: azul noche en oscuro y blanco azulado en claro, como el icono).
  const bg = dark ? mix('#070D16', a.l, 0.16) : mix('#FBF6F0', a.l, 0.03), card = dark ? mix('#101A27', a.l, 0.12) : '#FFFFFF';
  return {
    dark, ac, acText: lum(ac) > 0.4 ? '#0C1117' : '#FFFFFF',
    // Degradado principal (botones, pestaña activa, tarjeta «Ahora toca»): del acento a su compañero, siempre oscuro para texto blanco.
    g1: deep(dark ? mix(a.l, '#000000', 0.08) : a.l), g2: deep(dark ? mix(a.g, '#000000', 0.2) : a.g),
    // Fondo: dos tonos con manchas de color difuminadas (ver Backdrop en library.tsx).
    bgA: dark ? mix('#08111E', a.l, 0.24) : mix('#FFFFFF', a.l, 0.11), bgB: dark ? '#060A12' : '#FCEEDF', blob: dark ? 0.24 : 0.42,
    // Sombra de tarjetas y barras: dos capas (una amplia y suave, otra corta) para que «floten» sobre el fondo.
    shadow: dark ? '0px 10px 28px rgba(0, 0, 0, 0.45), 0px 1px 2px rgba(0, 0, 0, 0.35)' : `0px 10px 26px ${mix(a.l, '#0A1A33', 0.5)}1F, 0px 1px 3px ${mix(a.l, '#0A1A33', 0.6)}1A`,
    hero: dark ? mix(card, a.d, 0.22) : a.l, heroInk: '#FFFFFF', heroMu: '#E6F0EE',
    bg, card, soft: dark ? mix(card, '#FFFFFF', 0.08) : mix('#EEF1F5', a.l, 0.06), acSoft: mix(card, ac, dark ? 0.2 : 0.13),
    // Tarjetas casi opacas y con borde visible: más contraste y un aspecto más nítido.
    glass: dark ? card + 'F2' : '#FFFFFFF2', glassLn: dark ? '#FFFFFF1A' : mix('#DDE3EA', a.l, 0.08),
    ink: dark ? '#F3F6FA' : '#0B1524', mu: dark ? '#AFBBCB' : '#3E4A5C', ln: dark ? mix(card, '#FFFFFF', 0.16) : '#C8D0DA',
    nav: dark ? card + 'F2' : '#FFFFFFF5',
    ok: dark ? '#5CC39A' : '#1F7A55', warn: dark ? '#FF8A80' : '#B42318',
    warnBg: dark ? '#33281A' : '#FFF3E2', warnInk: dark ? '#F6D6A6' : '#7A4B0C',
    okBg: dark ? '#173328' : '#E3F4EC', amber: dark ? '#E3B04B' : '#9A5B0B', offer: dark ? '#4A3B17' : '#F5E7C4', offerInk: dark ? '#F3DDA2' : '#5A4A22',
    fs: Math.min(2, (TEXT[text]?.f ?? 1) * Math.max(1, Math.min(1.6, sys || 1))), sp: DENS[dens]?.f ?? 1,
    /** Letra grande o pantalla estrecha: las filas se colocan en dos líneas en vez de apretarse. */
    big: (TEXT[text]?.f ?? 1) * Math.max(1, Math.min(1.6, sys || 1)) >= 1.2 || width < 370,
  };
};
export type Theme = ReturnType<typeof makeTheme>;

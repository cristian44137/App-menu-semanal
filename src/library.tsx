// Librería de componentes en React Native puro: sin HTML, sin CSS y sin dependencias externas de Web/DOM.
// Cada componente se declara con D(nombre, descripción, props en orden, componente): las pantallas de screens.ts
// los llaman por posición, en ese mismo orden.
//
// Estilo «oasis»: fondo con degradado y manchas de color que se mueven muy despacio, tarjetas translúcidas
// tipo cristal, botones con degradado, tipografía Manrope (títulos y cifras) y Nunito (texto), poco texto por pantalla
// y una ilustración distinta para cada plato.
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, BackHandler, Easing, Image, PanResponder, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { Icon, MealArt } from './art';
import { SLOT, Theme } from './theme';

export type Ctx = { t: Theme; dispatch: (e: { type: string; params?: any }) => void; haptic: () => void; sound: (n: string) => void; insetTop: number; insetBottom: number; motion: boolean; fonts?: boolean; /** Alto de pantalla para las hojas (en la presentación, el del móvil en miniatura). */ winH?: number; /** Presentación: 0→1 desliza la hoja hasta abajo (pasos y temporizador). */ sheetShift?: any };
export const AppCtx = createContext<Ctx>(null as any);
const useC = () => useContext(AppCtx);

const ActionCtx = createContext<(a: any) => void>(() => {});
/**
 * Solo dentro de la presentación: qué botón va a tocar el dedo (su acción, como ["Easy", 2]) y cómo avisar de dónde
 * está. Así el dedo cae justo encima del botón en cualquier móvil, sin posiciones escritas a mano.
 */
type Demo = { key: string; found: (node: any) => void };
const DemoCtx = createContext<Demo | null>(null);
const actKey = (a: any) => { const v = [a?.type, ...Object.values(a?.params || {})]; while (v.length && v[v.length - 1] == null) v.pop(); return JSON.stringify(v); };
export const useTriggerAction = () => {
  const onAction = useContext(ActionCtx);
  return (_id: string, _ev: any, a: any) => { if (a) onAction(a); };
};

/* ---------- tipografía ---------- */
// Nunito para el texto y Manrope (geométrica, sobria) para títulos y cifras. Van en assets/fonts y se integran en
// el APK con el plugin de expo-font. Si no cargan, se usan las del sistema con su grosor.
// (En el código, «serif» = estilo de título; se llama así por la tipografía que se usaba antes).
const FAM: Record<string, string> = { '400': 'Nunito-Regular', '500': 'Nunito-Regular', '600': 'Nunito-SemiBold', '700': 'Nunito-Bold', '800': 'Nunito-ExtraBold' };
/** Estilo de fuente para un grosor (también lo usan los campos de texto y App.tsx). */
export const font = (fonts: boolean | undefined, w = '500', serif = false): any =>
  fonts ? { fontFamily: serif ? 'Manrope-ExtraBold' : FAM[w] || 'Nunito-SemiBold', fontWeight: 'normal' } : serif ? { fontWeight: '800' } : { fontWeight: w };

/* ---------- piezas base ---------- */
const Tx = ({ s = 15, w = '500', c, serif, style, children, ...p }: any) => {
  const { t, fonts } = useC();
  // allowFontScaling={false}: el tamaño del sistema ya va en t.fs (ver makeTheme), junto con la altura de línea.
  // Con letra grande se permite una línea más antes de cortar con «…».
  const nl = p.numberOfLines && t.big && !p.adjustsFontSizeToFit ? p.numberOfLines + 1 : p.numberOfLines;
  // textBreakStrategy «simple»: con la estrategia de Android por defecto, a veces mide corto un texto en negrita y corta la última palabra.
  return <Text textBreakStrategy="simple" {...p} numberOfLines={nl} allowFontScaling={false} style={[{ fontSize: s * t.fs, lineHeight: s * t.fs * (serif ? 1.2 : 1.36), letterSpacing: serif ? -0.3 : 0, color: c ?? t.ink }, font(fonts, w, serif), style]}>{children}</Text>;
};
const APress = Animated.createAnimatedComponent(Pressable);
/** Botón táctil: al pulsar se hunde un poco con un muelle suave y vuelve a su sitio. */
const Press = ({ a, onPress, style, children, label, role, state }: any) => {
  const c = useC(); const trig = useTriggerAction(); const s = useRef(new Animated.Value(1)).current;
  const demo = useContext(DemoCtx), me = useRef<any>(null), aim = !!demo && !!a && actKey(a) === demo.key;
  const to = (v: number) => { if (c.motion) Animated.spring(s, { toValue: v, damping: 14, stiffness: 380, mass: 0.5, useNativeDriver: true }).start(); };
  return (
    <APress ref={aim ? me : undefined} onLayout={aim ? () => requestAnimationFrame(() => demo!.found(me.current)) : undefined} accessibilityRole={role || 'button'} accessibilityState={state} accessibilityLabel={label} onPressIn={() => to(0.955)} onPressOut={() => to(1)} onPress={() => { c.haptic(); if (a) trig('', undefined, a); else onPress?.(); }}
      style={[style, { transform: [{ scale: s }] }]}>{children}</APress>
  );
};
let gid = 0;
/**
 * Degradado lineal que rellena a su contenedor (que debe tener overflow: 'hidden' y el borderRadius). dir: d diagonal, v vertical, h horizontal.
 * Se mide su tamaño real y se dibuja en píxeles: con tamaños en % y viewBox estirado, Android mostraba franjas de color sólido.
 */
export const Grad = ({ a, b, dir = 'd', o1 = 1, o2 = 1, r = -1 }: { a: string; b: string; dir?: 'd' | 'v' | 'h'; o1?: number; o2?: number; r?: number }) => {
  const id = useRef('lg' + gid++).current; const [s, setS] = useState({ w: 0, h: 0 });
  // r: radio de las esquinas (el mismo que el contenedor). Por defecto, forma de píldora o círculo. Se dibuja
  // redondeado en el propio SVG para no depender de que Android recorte bien el contenido (si no, asoman esquinas).
  const rr = Math.min(r < 0 ? 9999 : r, s.w / 2, s.h / 2);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} onLayout={(e) => { const { width: w, height: h } = e.nativeEvent.layout; if (Math.abs(w - s.w) > 0.5 || Math.abs(h - s.h) > 0.5) setS({ w, h }); }}>
      {s.w > 0 && s.h > 0 ? (
        <Svg width={s.w} height={s.h}>
          <Defs><LinearGradient id={id} gradientUnits="userSpaceOnUse" x1={0} y1={0} x2={dir === 'v' ? 0 : s.w} y2={dir === 'h' ? 0 : s.h}><Stop offset="0" stopColor={a} stopOpacity={o1} /><Stop offset="1" stopColor={b} stopOpacity={o2} /></LinearGradient></Defs>
          <Rect x={0} y={0} width={s.w} height={s.h} rx={rr} ry={rr} fill={`url(#${id})`} />
        </Svg>
      ) : null}
    </View>
  );
};
/** Mancha de luz difuminada (degradado radial), opcionalmente flotando muy despacio. */
const Glow = ({ c, size, x, y, o, drift = 0, dur = 16000 }: { c: string; size: number; x: number; y: number; o: number; drift?: number; dur?: number }) => {
  const { motion } = useC(); const id = useRef('rg' + gid++).current, a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!motion || !drift) return;
    const l = Animated.loop(Animated.sequence([Animated.timing(a, { toValue: 1, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }), Animated.timing(a, { toValue: 0, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true })]));
    l.start(); return () => l.stop();
  }, [motion, drift]);
  return (
    <Animated.View pointerEvents="none" style={{ position: 'absolute', left: x - size / 2, top: y - size / 2, width: size, height: size, transform: [{ translateX: a.interpolate({ inputRange: [0, 1], outputRange: [0, drift] }) }, { translateY: a.interpolate({ inputRange: [0, 1], outputRange: [0, drift * 0.6] }) }, { scale: a.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) }] }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs><RadialGradient id={id} cx="50" cy="50" r="50" gradientUnits="userSpaceOnUse"><Stop offset="0" stopColor={c} stopOpacity={o} /><Stop offset="0.55" stopColor={c} stopOpacity={o * 0.45} /><Stop offset="1" stopColor={c} stopOpacity={0} /></RadialGradient></Defs>
        <Circle cx="50" cy="50" r="50" fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
};
/** Fondo de toda la app: degradado de dos tonos y cuatro manchas de color que se mueven muy despacio. */
const WARM = '#FFB547', MINT = '#2FD3A0', CORAL = '#FF8A6B';
const TILE: Record<string, string> = { check: '#1FA67A', coin: '#E08A1E', flame: '#EF6A4C', clock: '#2E7CD6', leaf: '#3FA34D', spark: '#8A63D2', bolt: '#E0A21E' };
export function Backdrop() {
  const { t } = useC(); const { width: W, height: H } = useWindowDimensions(), M = Math.max(W, H);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Grad r={0} a={t.bgA} b={t.bgB} dir="v" />
      <Glow c={t.ac} size={M * 0.95} x={W * 0.05} y={H * 0.04} o={t.blob} drift={40} dur={17000} />
      {/* Luces del icono: el acento, un toque cálido (la nota de la nevera) y uno menta (el imán) */}
      <Glow c={WARM} size={M * 0.75} x={W * 0.98} y={H * 0.25} o={t.blob * (t.dark ? 0.6 : 0.85)} drift={-36} dur={21000} />
      <Glow c={CORAL} size={M * 0.5} x={W * 0.05} y={H * 0.55} o={t.blob * (t.dark ? 0.35 : 0.5)} drift={24} dur={25000} />
      <Glow c={t.g2} size={M * 0.85} x={W * 0.15} y={H * 0.8} o={t.blob * 0.8} drift={30} dur={19000} />
      <Glow c={MINT} size={M * 0.5} x={W * 0.95} y={H * 0.95} o={t.blob * 0.55} drift={-28} dur={23000} />
    </View>
  );
}
/** Flota muy despacio arriba y abajo (la ilustración de «Ahora toca»). */
const Float = ({ children }: any) => {
  const { motion } = useC(); const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!motion) return;
    const l = Animated.loop(Animated.sequence([Animated.timing(a, { toValue: 1, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }), Animated.timing(a, { toValue: 0, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true })]));
    l.start(); return () => l.stop();
  }, [motion]);
  return <Animated.View style={{ transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [3, -4] }) }, { rotate: a.interpolate({ inputRange: [0, 1], outputRange: ['-1.5deg', '1.5deg'] }) }] }}>{children}</Animated.View>;
};
/** Número que sube o baja contando hasta su valor nuevo. */
const Count = ({ v }: { v: number }) => {
  const { motion } = useC(); const [n, setN] = useState(v), from = useRef(v);
  useEffect(() => {
    if (!motion || from.current === v) { from.current = v; return setN(v); }
    const a = from.current, t0 = Date.now(), D = 520; let id: any;
    const step = () => { const k = Math.min(1, (Date.now() - t0) / D), e = 1 - (1 - k) ** 3; setN(Math.round(a + (v - a) * e)); if (k < 1) id = setTimeout(step, 16); else from.current = v; };
    step(); return () => clearTimeout(id);
  }, [v]);
  return <>{n}</>;
};
/** Barra de progreso animada. */
const Bar = ({ v, c, bg, h = 8 }: { v: number; c: string; bg: string; h?: number }) => {
  const { motion } = useC(); const to = Math.max(0, Math.min(1, v || 0)), a = useRef(new Animated.Value(motion ? 0 : to)).current;
  useEffect(() => { if (!motion) return a.setValue(to); Animated.timing(a, { toValue: to, duration: 620, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(); }, [to]);
  return <View style={{ height: h, borderRadius: h, backgroundColor: bg, overflow: 'hidden' }}><Animated.View style={{ width: a.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }), height: h, borderRadius: h, backgroundColor: c }} /></View>;
};
/** Aparece con un fundido y un pequeño desplazamiento (delay en ms). */
export const FadeIn = ({ delay = 0, children, style }: any) => {
  const { motion } = useC(); const a = useRef(new Animated.Value(motion ? 0 : 1)).current;
  useEffect(() => { if (motion) Animated.timing(a, { toValue: 1, duration: 420, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(); }, []);
  return <Animated.View style={[style, { opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }]}>{children}</Animated.View>;
};
/** Foto del producto; si no carga (sin conexión), dibuja el ingrediente. */
const Photo = ({ uri, ids, size }: { uri: string; ids: string[]; size: number }) => {
  const [bad, setBad] = useState(!uri);
  useEffect(() => setBad(!uri), [uri]);
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.3, backgroundColor: '#FFFFFF', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
      {bad ? <MealArt ids={ids} size={size * 0.92} /> : <Image source={{ uri }} onError={() => setBad(true)} resizeMode="contain" style={{ width: size - 6, height: size - 6 }} />}
    </View>
  );
};
/** Tarjeta de cristal: translúcida sobre el fondo, con un borde claro muy fino. */
const card = (t: Theme, extra: any = {}) => ({ backgroundColor: t.glass, borderRadius: 18, borderWidth: 1, borderColor: t.glassLn, boxShadow: t.shadow, padding: 16 * t.sp, ...extra });
/** Cuadro con degradado suave del color de la franja, para la ilustración de un plato. */
const ArtBox = ({ slot, size, r = 0.24, children }: any) => {
  const { t } = useC(); const c = slot >= 0 ? SLOT[slot] : t.ac;
  return <View style={{ width: size, height: size, borderRadius: size * r, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}><Grad r={size * r} a={c} b={c} o1={t.dark ? 0.42 : 0.5} o2={t.dark ? 0.12 : 0.16} />{children}</View>;
};
const A = () => 1;
const z = { any: () => 1, string: () => ({ optional: () => 1 }), number: () => ({ optional: () => 1 }), boolean: () => ({ optional: () => 1 }), array: (_x?: any) => 1, union: (_x?: any) => 1 };
const D = (name: string, _description: string, shape: any, component: (a: { props: any; renderNode: (n: any) => any }) => any) => ({ name, keys: Object.keys(shape), component });
const f1 = (n: number) => String(n).replace('.', ',');

/* ---------- hoja inferior arrastrable ---------- */
/** En la presentación, el contenido de la hoja «se desliza» solo hasta abajo (v: 0→1), sin poder tocarlo. */
function DemoScroll({ v, gap, children }: { v: any; gap: number; children: any }) {
  const [box, setBox] = useState(0), [inner, setInner] = useState(0), dist = Math.max(0, inner - box);
  return (
    <View style={{ flex: 1, overflow: 'hidden' }} onLayout={(e) => setBox(e.nativeEvent.layout.height)}>
      <Animated.View onLayout={(e) => setInner(e.nativeEvent.layout.height)} style={{ padding: 20, paddingTop: 8, gap, paddingBottom: 44, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -dist] }) }] }}>{children}</Animated.View>
    </View>
  );
}
function Sheet({ title, close, children }: any) {
  const { t, insetBottom, motion, winH, sheetShift } = useC(); const trig = useTriggerAction(); const win = useWindowDimensions().height;
  const H = winH ?? win, minH = Math.round(H * 0.66), maxH = Math.round(H * 0.94);
  // Se abre a pantalla completa; arrastrando el asa hacia abajo baja a media pantalla o se cierra.
  const h = useRef(new Animated.Value(maxH)).current, y = useRef(new Animated.Value(motion ? H : 0)).current, cur = useRef(maxH), fade = useRef(new Animated.Value(motion ? 0 : 1)).current;
  useEffect(() => {
    if (!motion) return;
    Animated.parallel([Animated.spring(y, { toValue: 0, damping: 24, stiffness: 170, mass: 0.95, useNativeDriver: true }), Animated.timing(fade, { toValue: 1, duration: 260, useNativeDriver: true })]).start();
  }, []);
  const shut = () => !motion ? trig('', undefined, close) : Animated.parallel([Animated.timing(y, { toValue: H, duration: 240, easing: Easing.in(Easing.cubic), useNativeDriver: true }), Animated.timing(fade, { toValue: 0, duration: 240, useNativeDriver: true })]).start(() => trig('', undefined, close));
  const snap = (to: number) => { cur.current = to; Animated.spring(h, { toValue: to, damping: 24, stiffness: 220, useNativeDriver: false }).start(); };
  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 3,
    onPanResponderMove: (_, g) => h.setValue(Math.max(minH * 0.4, Math.min(maxH, cur.current - g.dy))),
    onPanResponderRelease: (_, g) => {
      const v = cur.current - g.dy;
      if (Math.abs(g.dy) < 4) return snap(cur.current === maxH ? minH : maxH);   // un toque en el asa: expandir o recoger
      if (g.vy > 1.1 || v < minH * 0.72) return shut();
      snap(g.vy < -0.4 || v > (minH + maxH) / 2 ? maxH : minH);
    },
  }), [H]);
  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]}><Pressable accessibilityLabel="Cerrar" onPress={shut} style={{ flex: 1, backgroundColor: t.dark ? '#020608A8' : '#1A2B2A66' }} /></Animated.View>
      <Animated.View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', transform: [{ translateY: y }] }}>
        <Animated.View style={{ width: '100%', maxWidth: 680, height: h, backgroundColor: t.bg, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingBottom: insetBottom, overflow: 'hidden' }}>
          <Grad r={0} a={t.bgA} b={t.bgB} dir="v" />
          <View {...pan.panHandlers} style={{ paddingTop: 10, paddingBottom: 6, paddingHorizontal: 20 }}>
            <View style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: t.mu, opacity: 0.35, marginBottom: 12 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {title ? <Tx s={25} serif numberOfLines={2} style={{ flex: 1, letterSpacing: -0.4 }}>{title}</Tx> : <View style={{ flex: 1 }} />}
              <Press onPress={shut} label="Cerrar" style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: t.glass, borderWidth: 1, borderColor: t.glassLn, alignItems: 'center', justifyContent: 'center' }}><Icon n="x" size={18} color={t.ink} /></Press>
            </View>
          </View>
          {sheetShift ? <DemoScroll v={sheetShift} gap={16 * t.sp}>{children}</DemoScroll>
            : <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingTop: 8, gap: 16 * t.sp, paddingBottom: 44 }} showsVerticalScrollIndicator={false}>{children}</ScrollView>}
        </Animated.View>
      </Animated.View>
    </View>
  );
}

/* ---------- estructura ---------- */
const Screen = D('Screen', 'Raíz: page (scroll), nav (barra inferior), sheet (hoja) o intro (presentación)', { children: z.array(z.any()), mode: z.string().optional(), title: z.string().optional(), close: A() }, ({ props, renderNode }) => {
  const { t, insetTop, insetBottom } = useC();
  if (props.mode === 'nav')
    return (
      <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', paddingBottom: insetBottom + 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: t.nav, borderRadius: 22, padding: 6, boxShadow: t.shadow, gap: 2, borderWidth: 1, borderColor: t.glassLn, width: '92%', maxWidth: 560, elevation: 8, shadowColor: '#0B2A28', shadowOpacity: t.dark ? 0.45 : 0.12, shadowRadius: 22, shadowOffset: { width: 0, height: 10 } }}>{renderNode(props.children)}</View>
      </View>
    );
  if (props.mode === 'sheet') return <Sheet title={props.title} close={props.close}>{renderNode(props.children)}</Sheet>;
  if (props.mode === 'intro') return <View style={StyleSheet.absoluteFill}>{renderNode(props.children)}</View>;
  // Sin desplazamiento ni márgenes: un bloque dentro de otra pantalla (el formulario de tus datos en la presentación).
  if (props.mode === 'plain') return <View style={{ gap: 10 * t.sp, width: '100%' }}>{renderNode(props.children)}</View>;
  return (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: insetTop + 18, paddingBottom: insetBottom + 128, paddingHorizontal: 18, alignItems: 'center' }}>
      <View style={{ width: '100%', maxWidth: 1000, gap: 16 * t.sp }}>{renderNode(props.children)}</View>
    </ScrollView>
  );
});

const Stack = D('Stack', 'Fila o columna', { children: z.array(z.any()), dir: z.string().optional(), gap: z.number().optional(), wrap: z.boolean().optional() }, ({ props, renderNode }) => {
  const { t } = useC(); const kids: any[] = props.children || [], tight = t.big && props.dir === 'row' && !props.wrap && kids.length >= 3 && kids.length <= 4, row = props.dir === 'row';
  if (tight) return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: props.gap ?? 10 }}>{kids.map((k, i) => <View key={i} style={{ flexBasis: '45%', flexGrow: 1, minWidth: 0 }}>{renderNode(k)}</View>)}</View>;
  return (
    <View style={{ flexDirection: row ? 'row' : 'column', gap: props.gap ?? 10, flexWrap: props.wrap ? 'wrap' : 'nowrap' }}>
      {row && !props.wrap ? kids.map((k, i) => <View key={i} style={{ flex: 1, minWidth: 0 }}>{renderNode(k)}</View>) : renderNode(kids)}
    </View>
  );
});
const Cols = D('Cols', 'Dos columnas en tablet, una en móvil (c va bajo a en tablet y al final en móvil)', { a: z.array(z.any()), b: z.array(z.any()), c: z.array(z.any()) }, ({ props, renderNode }) => {
  const { t } = useC(); const wide = useWindowDimensions().width >= 840, col = { minWidth: 0, gap: 16 * t.sp };
  if (!wide) return <View style={{ gap: 16 * t.sp }}>{renderNode(props.a)}<View style={{ ...col, gap: 12 * t.sp }}>{renderNode(props.b)}</View>{renderNode(props.c || [])}</View>;
  return (
    <View style={{ flexDirection: 'row', gap: 18 * t.sp, alignItems: 'flex-start' }}>
      <View style={{ flex: 1, ...col }}>{renderNode(props.a)}{renderNode(props.c || [])}</View>
      <View style={{ flex: 1.15, ...col, gap: 12 * t.sp }}>{renderNode(props.b)}</View>
    </View>
  );
});

/** Cabecera: saludo o contexto pequeño arriba y título grande en serif; flechas discretas para moverse. */
const Head = D('Head', 'Cabecera con navegación', { kicker: z.string(), title: z.string(), prev: A(), today: A(), next: A() }, ({ props }) => {
  const { t } = useC();
  const B = ({ a, i, l }: any) => a ? <Press a={a} label={l || (i === 'left' ? 'Anterior' : 'Siguiente')} style={{ minWidth: 40, height: 40, borderRadius: 20, backgroundColor: t.glass, borderWidth: 1, borderColor: t.glassLn, alignItems: 'center', justifyContent: 'center', paddingHorizontal: l ? 14 : 0 }}>{l ? <Tx s={14} w="700" c={t.ac}>{l}</Tx> : <Icon n={i} size={19} color={t.ink} />}</Press> : null;
  const btns = props.prev || props.today || props.next ? <View style={{ flexDirection: 'row', gap: 6, paddingBottom: 2 }}><B a={props.prev} i="left" /><B a={props.today} l="Hoy" /><B a={props.next} i="right" /></View> : null;
  const text = <View style={{ flex: t.big ? undefined : 1, minWidth: 0 }}><Tx s={14} w="600" c={t.mu}>{props.kicker}</Tx>{t.big ? <Tx s={30} serif style={{ letterSpacing: -0.6 }}>{props.title}</Tx> : <Tx s={32} serif numberOfLines={1} adjustsFontSizeToFit style={{ letterSpacing: -0.8, lineHeight: 40 * t.fs }}>{props.title}</Tx>}</View>;
  // Con letra grande el título va entero (en una o dos líneas) y las flechas debajo, a la derecha.
  if (t.big) return <View style={{ gap: 8, paddingTop: 4 }}>{text}{btns ? <View style={{ alignItems: 'flex-end' }}>{btns}</View> : null}</View>;
  return <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingTop: 4 }}>{text}{btns}</View>;
});

/** Botón: solid = degradado del acento; soft = cristal; ghost = solo borde. */
const Btn = D('Btn', 'Botón', { label: z.string(), action: A(), tone: z.string().optional(), icon: z.string().optional() }, ({ props }) => {
  const { t } = useC(); const solid = props.tone !== 'soft' && props.tone !== 'ghost', ink = solid ? '#FFFFFF' : t.ac;
  return (
    <Press a={props.action} style={{ minHeight: 50, borderRadius: 14, overflow: 'hidden', paddingHorizontal: 20, paddingVertical: 10, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: solid ? t.g1 : props.tone === 'soft' ? t.glass : 'transparent', borderWidth: solid ? 0 : 1, borderColor: props.tone === 'soft' ? t.glassLn : t.ln }}>
      {solid ? <Grad r={14} a={t.g1} b={t.g2} dir="h" /> : null}
      {props.icon ? <Icon n={props.icon} size={18} color={ink} /> : null}<Tx s={15} w="700" c={ink}>{props.label}</Tx>
    </Press>
  );
});

/** Día de la semana: el elegido con degradado; un punto indica cómo de completo está el día. */
const DayChip = D('DayChip', 'Día de la semana', { label: z.string(), num: z.number(), fill: z.number(), on: z.boolean(), action: A(), isNew: z.boolean().optional() }, ({ props }) => {
  const { t } = useC(); const on = props.on;
  return (
    <Press a={props.action} label={`${props.label} ${props.num}`} style={{ alignItems: 'center', paddingVertical: 9, borderRadius: 14, overflow: 'hidden', gap: 1, backgroundColor: on ? t.g1 : 'transparent' }}>
      {on ? <Grad r={14} a={t.g1} b={t.g2} dir="v" /> : null}
      <Tx s={12} w="700" c={on ? '#FFFFFFCC' : t.mu} numberOfLines={1} adjustsFontSizeToFit>{props.label}</Tx><Tx s={18} w="800" c={on ? '#FFFFFF' : t.ink} numberOfLines={1} adjustsFontSizeToFit>{props.num}</Tx>
      {props.isNew ? <View style={{ width: 8, height: 8, borderRadius: 4, marginTop: 1, backgroundColor: SLOT[1], borderWidth: 1.5, borderColor: on ? '#FFFFFF' : 'transparent' }} />
        : <View style={{ width: 6, height: 6, borderRadius: 3, marginTop: 2, backgroundColor: on ? '#FFFFFF' : t.ac, opacity: props.fill > 0 ? 0.25 + 0.75 * Math.min(1, props.fill) : 0 }} />}
    </Press>
  );
});

/** Tarjeta del día: anillo de calorías por franja, proteína, fibra y minutos. Todo se dimensiona con el ancho real de la tarjeta. */
const Hero = D('Hero', 'Calorías del día', { title: z.string(), seg: z.array(z.number()), total: z.number(), goal: z.number(), pro: z.number(), proGoal: z.number(), fib: z.number(), fibGoal: z.number(), mins: z.number(), cols: z.array(z.number()) }, ({ props }) => {
  const { t } = useC(); const [w, setW] = useState(0);
  const wide = w >= 330, size = Math.max(112, Math.min(150, (wide ? w * 0.42 : w * 0.6) || 136)), stroke = Math.round(size * 0.1), R = (size - stroke) / 2 - 2, C = 2 * Math.PI * R;
  let off = 0;
  const cols: number[] = props.cols || [0, 1, 2, 3, 4, 5];
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width - 36)} style={card(t, { padding: 18, gap: 10 })}>
      <Tx s={14} w="700" c={t.mu}>{props.title}</Tx>
      <View style={{ flexDirection: wide ? 'row' : 'column', alignItems: 'center', gap: 20 }}>
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: [{ rotate: '-90deg' }] }}>
            <Circle cx={size / 2} cy={size / 2} r={R} stroke={t.soft} strokeWidth={stroke} fill="none" />
            {/* Anillo continuo: cada franja empieza justo donde acaba la anterior, sin huecos ni extremos redondeados. */}
            {props.seg.map((kc: number, i: number) => { const len = Math.min((kc / props.goal) * C, C - off), o = off; off += (kc / props.goal) * C; return len > 0.5 ? <Circle key={i} cx={size / 2} cy={size / 2} r={R} stroke={SLOT[cols[i] ?? i]} strokeWidth={stroke} fill="none" strokeLinecap="butt" strokeDasharray={`${len} ${C}`} strokeDashoffset={-o} /> : null; })}
          </Svg>
          <View style={{ position: 'absolute', width: size - stroke * 2 - 12, alignItems: 'center' }}>
            <Tx s={32} serif numberOfLines={1} adjustsFontSizeToFit style={{ letterSpacing: -1, lineHeight: 38 * t.fs }}><Count v={Math.round(props.total)} /></Tx>
            <Tx s={11} w="600" c={t.mu} numberOfLines={1} adjustsFontSizeToFit>de {props.goal} kcal</Tx>
          </View>
        </View>
        <View style={{ flex: wide ? 1 : undefined, alignSelf: 'stretch', gap: 14, justifyContent: 'center', minWidth: 0 }}>
          {[['Proteína', props.pro, props.proGoal, 'g', SLOT[1]], ['Fibra', props.fib, props.fibGoal, 'g', SLOT[3]]].map(([l, v, g, u, c]: any) => (
            <View key={l} style={{ gap: 6 }}><View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}><Tx s={13} w="700">{l}</Tx><Tx s={13} w="600" c={t.mu}>{Math.round(v)} / {g} {u}</Tx></View><Bar v={v / g} c={c} bg={t.soft} h={8} /></View>
          ))}
          {props.mins > 0 ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Icon n="clock" size={15} color={t.mu} /><Tx s={13} w="600" c={t.mu} style={{ flexShrink: 1 }}>{props.mins} min en la cocina</Tx></View> : null}
        </View>
      </View>
    </View>
  );
});

/* ---------- platos ---------- */
const SLN = ['Desayuno', 'Comida', 'Cena', 'Merienda de mañana', 'Merienda de tarde', 'Bebida'];
const ORD = [0, 3, 1, 4, 2, 5];
/** Plato de una franja: ilustración grande, nombre y una sola línea de datos. El resto está dentro de la receta. */
const Meal = D('Meal', 'Plato de una franja', { slot: z.number(), name: z.string(), ids: z.array(z.string()), minutes: z.number(), kcal: z.number(), prot: z.number(), portion: z.number(), flag: z.string(), action: A(), action2: A(), price: z.string().optional(), done: z.boolean().optional(), locked: z.boolean().optional(), time: z.string().optional(), isNew: z.boolean().optional(), lockA: A() }, ({ props }) => {
  const { t } = useC(); const col = SLOT[props.slot];
  // Candado: fija el plato (la app ya no lo cambia, aunque sí puede ajustar la ración). Grande y con texto para que se vea.
  const lock = props.lockA && !props.done ? (
    <Press a={props.lockA} label={props.locked ? 'Desbloquear plato' : 'Bloquear plato'} style={{ alignItems: 'center', gap: 2, minWidth: 44, justifyContent: 'center' }}>
      <View style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: props.locked ? t.ac : t.soft, borderWidth: props.locked ? 0 : 1, borderColor: t.ln }}>
        <Icon n={props.locked ? 'lock' : 'unlock'} size={17} color={props.locked ? t.acText : t.mu} w={2.2} />
      </View>
      {props.locked ? <Tx s={10.5} w="800" c={t.ac}>Fijado</Tx> : null}
    </Press>
  ) : null;
  return (
    // key = nombre del plato: si cambia (reajuste, «Algo más fácil», otro día), la tarjeta vuelve a entrar con su animación.
    <FadeIn key={props.name} delay={ORD.indexOf(props.slot) * 60}>
      <Press a={props.action} label={props.name} style={card(t, { flexDirection: 'row', gap: 14, alignItems: 'center', padding: 10 * t.sp, paddingRight: 14, opacity: props.done ? 0.62 : 1 })}>
        <ArtBox slot={props.slot} size={84}><MealArt ids={props.ids} name={props.name} slot={props.slot} tint={col} size={80} /></ArtBox>
        <View style={{ flex: 1, gap: 3, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Tx s={11.5} w="800" c={t.mu} style={{ letterSpacing: 0.3, textTransform: 'uppercase', flexShrink: 1 }} numberOfLines={1}>{props.time ? `${props.time} · ` : ''}{SLN[props.slot]}</Tx>
            {props.done ? <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: t.ok, alignItems: 'center', justifyContent: 'center' }}><Icon n="check" size={11} color="#fff" w={3.4} /></View> : null}
            {props.locked && !props.lockA ? <Icon n="lock" size={13} color={t.ac} /> : null}
            {props.isNew ? <View style={{ backgroundColor: t.ac, borderRadius: 9, paddingHorizontal: 7, paddingVertical: 1 }}><Tx s={11} w="800" c={t.acText}>Cambiado</Tx></View> : null}
          </View>
          <Tx s={16} w="700" numberOfLines={2} style={{ letterSpacing: -0.1 }}>{props.name}</Tx>
          <Tx s={13} w="600" c={t.mu} numberOfLines={1}>{props.minutes} min · {Math.round(props.kcal)} kcal · {Math.round(props.prot)} g prot.</Tx>
          {props.flag ? <Tx s={12} w="700" c={props.flag === 'Elegido ahora' ? t.ok : t.warn}>{props.flag}</Tx> : null}
        </View>
        {/* A la derecha, en columna: candado y, debajo, la ración (si no es ×1), para no quitar sitio al nombre. */}
        <View style={{ alignItems: 'center', gap: 6 }}>
          {lock}
          {props.portion && props.portion !== 1 ? <Press a={props.action2} label="Cambiar ración" style={{ backgroundColor: t.acSoft, borderRadius: 14, paddingHorizontal: 9, paddingVertical: 4 }}><Tx s={12} w="800" c={t.ac}>×{f1(props.portion)}</Tx></Press> : lock ? null : <Icon n="right" size={18} color={t.mu} />}
        </View>
      </Press>
    </FadeIn>
  );
});

const Tip = D('Tip', 'Consejo con botón', { text: z.string(), label: z.string(), action: A() }, ({ props }) => {
  const { t } = useC();
  return (
    <FadeIn>
      <View style={card(t, { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 })}>
        <View style={{ width: 40, height: 40, borderRadius: 20, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}><Grad a={SLOT[0]} b={SLOT[1]} /><Icon n="bulb" size={19} color="#FFFFFF" /></View>
        <Tx s={14} w="600" style={{ flex: 1 }}>{props.text}</Tx>
        <Press a={props.action} style={{ borderRadius: 12, overflow: 'hidden', paddingHorizontal: 14, paddingVertical: 9, backgroundColor: t.g1 }}><Grad r={12} a={t.g1} b={t.g2} dir="h" /><Tx s={13} w="700" c="#FFFFFF">{props.label}</Tx></Press>
      </View>
    </FadeIn>
  );
});

const Tile = D('Tile', 'Dato destacado', { icon: z.string(), value: z.string(), label: z.string(), fill: z.number().optional() }, ({ props }) => {
  const { t } = useC();
  return (
    <View style={card(t, { gap: 4, padding: 14 * t.sp, flexGrow: 1, minWidth: 130 })}>
      {/* Cada dato con su color (más alegre que todo en azul), en una pastilla suave. */}
      <View style={{ width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: (TILE[props.icon] || t.ac) + (t.dark ? '33' : '22') }}><Icon n={props.icon} size={18} color={TILE[props.icon] || t.ac} w={2.3} /></View>
      <Tx s={23} serif numberOfLines={1} adjustsFontSizeToFit style={{ letterSpacing: -0.4, marginTop: 4 }}>{props.value}</Tx><Tx s={12} w="600" c={t.mu}>{props.label}</Tx>
      {props.fill != null && props.fill > 0 ? <View style={{ marginTop: 4 }}><Bar v={props.fill} c={t.ac} bg={t.soft} h={6} /></View> : null}
    </View>
  );
});

const Section = D('Section', 'Título de sección', { title: z.string(), icon: z.string().optional() }, ({ props }) => <Tx s={21} serif style={{ letterSpacing: -0.3, marginTop: 10 }}>{props.title}</Tx>);
const Label = D('Label', 'Subtítulo pequeño', { text: z.string() }, ({ props }) => { const { t } = useC(); return <Tx s={12} w="800" c={t.mu} style={{ letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 8 }}>{props.text}</Tx>; });

const Bars = D('Bars', 'Barras por día', { labels: z.array(z.string()), values: z.array(z.number()), goal: z.number() }, ({ props }) => {
  const { t } = useC(); const mx = Math.max(props.goal * 1.15, ...props.values, 1);
  return (
    <View style={card(t, { height: 196 })}>
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
        {props.values.map((v: number, i: number) => <View key={i} style={{ flex: 1, height: '100%', justifyContent: 'flex-end' }}><View style={{ width: '100%', height: `${(v / mx) * 100}%`, borderRadius: 12, overflow: 'hidden', backgroundColor: t.ac, opacity: v >= props.goal * 0.9 ? 1 : 0.45 }}><Grad r={12} a={t.g2} b={t.g1} dir="v" /></View></View>)}
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: `${(props.goal / mx) * 100}%`, borderTopWidth: 1.5, borderStyle: 'dashed', borderColor: t.mu, opacity: 0.6 }} />
      </View>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>{props.labels.map((l: string, i: number) => <Tx key={i} s={12} w="700" c={t.mu} style={{ flex: 1, textAlign: 'center' }}>{l}</Tx>)}</View>
    </View>
  );
});

/** Cobertura semanal de micronutrientes: verde si llega, acento si casi, ámbar si falta. */
const Micro = D('Micro', 'Micronutrientes', { title: z.string(), items: z.array(z.any()) }, ({ props }) => {
  const { t } = useC(); const wide = useWindowDimensions().width >= 600;
  return (
    <View style={card(t, { gap: 12 })}>
      <Tx s={15} w="700">{props.title}</Tx>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 18, rowGap: 10 }}>
        {props.items.map(([n, v]: [string, number]) => { const c = v >= 100 ? t.ok : v >= 80 ? t.ac : t.amber; return (
          <View key={n} style={{ width: wide ? '47%' : '100%', gap: 5 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Tx s={13} w="600" c={t.mu}>{n}</Tx><Tx s={13} w="700" c={c}>{v >= 100 ? 'Cubierto' : `${v} %`}</Tx></View>
            <Bar v={v / 100} c={c} bg={t.soft} h={6} />
          </View>); })}
      </View>
    </View>
  );
});

const Wd = D('Wd', 'Cabecera de días', { labels: z.array(z.string()) }, ({ props }) => <View style={{ flexDirection: 'row', gap: 4 }}>{props.labels.map((l: string) => <Tx key={l} s={12} w="700" c={useC().t.mu} style={{ flex: 1, textAlign: 'center' }}>{l}</Tx>)}</View>);
const Cell = D('Cell', 'Día del calendario', { num: z.number(), fill: z.number(), on: z.boolean(), today: z.boolean(), ids: z.array(z.string()), action: A(), name: z.string().optional() }, ({ props }) => {
  const { t } = useC();
  if (!props.num) return <View style={{ minHeight: 76 }} />;
  return (
    <Press a={props.action} style={{ alignItems: 'center', paddingVertical: 6, gap: 2, borderRadius: 12, overflow: 'hidden', backgroundColor: props.on ? t.glass : 'transparent', borderWidth: props.today ? 2 : 1, borderColor: props.today ? t.ac : props.on ? t.glassLn : 'transparent', minHeight: 76 }}>
      <Tx s={12} w="800" c={props.today ? t.ac : t.mu}>{props.num}</Tx>
      {props.ids.length ? <MealArt ids={props.ids} name={props.name} slot={1} size={36} /> : <View style={{ height: 36 }} />}
      {props.on ? <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: t.ac, opacity: 0.25 + 0.75 * Math.min(1, props.fill) }} /> : null}
    </Press>
  );
});

const ShopRow = D('ShopRow', 'Producto de la compra', { id: z.string(), name: z.string(), pack: z.string(), qty: z.number(), price: z.number(), base: z.number(), done: z.boolean(), status: z.string(), action: A(), photo: z.string(), store: z.string(), swap: A(), zoom: A() }, ({ props }) => {
  const { t, dispatch } = useC(); const offer = props.price < props.base - 0.001;
  const price = (
    <View style={{ alignItems: 'flex-end', gap: 2 }}>
      <NumBox id={'p:' + props.id} label={`Precio de ${props.name}`} unit="€" value={props.price} max={3} done={(n) => dispatch({ type: 'Price', params: { id: props.id, value: n } })}
        style={{ paddingHorizontal: 10, paddingVertical: 6, minWidth: 74 * t.fs, alignItems: 'flex-end', backgroundColor: offer ? t.offer : t.soft }} />
      {offer ? <Tx s={11} w="700" c={t.warn}>oferta</Tx> : <Tx s={11} w="600" c={t.mu}>€ · toca para cambiar</Tx>}
    </View>
  );
  return (
    <View style={{ paddingVertical: 8, gap: 6, opacity: props.done ? 0.5 : 1 }}>
    <View style={{ flexDirection: 'row', alignItems: t.big ? 'flex-start' : 'center', gap: 10 }}>
      <Press a={props.action} label={props.done ? 'Quitar del carrito' : 'Al carrito'} style={{ width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: props.done ? t.ok : t.mu + '88', backgroundColor: props.done ? t.ok : 'transparent', alignItems: 'center', justifyContent: 'center' }}>{props.done ? <Icon n="check" size={15} color="#fff" w={3} /> : null}</Press>
      {props.zoom ? <Press a={props.zoom} label="Ampliar la foto"><Photo uri={props.photo} ids={[props.id]} size={50} /></Press> : <Photo uri={props.photo} ids={[props.id]} size={50} />}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Tx s={15} w="700" numberOfLines={3} style={{ textDecorationLine: props.done ? 'line-through' : 'none' }}>{props.qty} × {props.name}</Tx>
        <Tx s={12} w="500" c={t.mu} numberOfLines={2}>{props.pack}</Tx>
        {props.store ? <View style={{ alignSelf: 'flex-start', marginTop: 3, backgroundColor: props.store === 'Día' ? '#D7263D' : '#2E8B57', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 1 }}><Tx s={11} w="700" c="#FFFFFF">{props.store}</Tx></View> : null}
        {props.status ? <Tx s={11} w="700" c={props.status.startsWith('Precio est') ? t.warn : props.status.startsWith('En lugar') ? t.ac : t.ok}>{props.status}</Tx> : null}
        {props.swap && !props.done ? <Press a={props.swap} label="Cambiar por otro producto" style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2, paddingVertical: 3 }}><Icon n="swap" size={13} color={t.mu} w={2.2} /><Tx s={12} w="700" c={t.mu} style={{ textDecorationLine: 'underline' }}>Sustituir</Tx></Press> : null}
      </View>
      {t.big ? null : price}
    </View>
    {t.big ? <View style={{ alignItems: 'flex-end' }}>{price}</View> : null}
    </View>
  );
});

/** Fila de ingrediente con foto: en recetas y al añadir a la despensa. */
const IngRow = D('IngRow', 'Ingrediente con foto', { photo: z.string(), name: z.string(), sub: z.string(), qty: z.string(), ids: z.array(z.string()), note: z.string(), action: A(), swap: A() }, ({ props }) => {
  const { t } = useC();
  // swap: botón «Cambiar» para usar otro producto de los sustitutos (por ejemplo, leche entera en vez de soja).
  const qty = <View style={{ backgroundColor: props.action ? t.ac : t.soft, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6 }}><Tx s={13} w="800" c={props.action ? t.acText : t.ink}>{props.qty}</Tx></View>;
  const inner = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 }}>
      <Photo uri={props.photo} ids={props.ids} size={50} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Tx s={15} w="700" numberOfLines={2}>{props.name}</Tx>
        {props.sub ? <Tx s={12} c={t.mu} numberOfLines={2}>{props.sub}</Tx> : null}
        {props.note ? <Tx s={12} w="700" c={t.ok}>{props.note}</Tx> : null}
      </View>
      {props.swap ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Press a={props.swap} label={`Cambiar ${props.name} por otro producto`} style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: t.acSoft }}>
            <Icon n="swap" size={15} color={t.ac} w={2.3} />
          </Press>
          {qty}
        </View>
      ) : qty}
    </View>
  );
  return props.action || props.swap ? <Press a={props.action || props.swap}>{inner}</Press> : inner;
});

/** Producto de la despensa: foto, cantidad que queda (editable), caducidad y acciones. */
const PantryRow = D('PantryRow', 'Producto de la despensa', { id: z.string(), photo: z.string(), name: z.string(), sub: z.string(), qty: z.number(), unit: z.string(), fill: z.number(), left: z.number(), when: z.string(), open: z.boolean(), canOpen: z.boolean(), minus: A(), plus: A(), openAct: A(), del: A() }, ({ props }) => {
  const { t, dispatch } = useC();
  const urg = props.left <= 1 ? t.warn : props.left <= 3 ? '#C8952E' : props.left >= 999 ? t.mu : t.ok;
  const R = ({ a, i, l }: any) => <Press a={a} label={l} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: t.soft, alignItems: 'center', justifyContent: 'center' }}><Icon n={i} size={17} color={t.ac} w={2.4} /></Press>;
  const openChip = <Press a={props.openAct} style={{ alignSelf: 'flex-start', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: props.open ? t.acSoft : 'transparent', borderWidth: 1, borderColor: props.open ? t.ac : t.ln }}><Tx s={12} w="700" c={props.open ? t.ac : t.mu}>{props.open ? 'Abierto' : 'Cerrado'}</Tx></Press>;
  return (
    <View style={{ gap: 8, paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: t.ln }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Photo uri={props.photo} ids={[props.id]} size={54} />
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Tx s={15} w="700" numberOfLines={2}>{props.name}</Tx>
          <Tx s={12} c={t.mu} numberOfLines={2}>{props.sub}</Tx>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: urg }} /><Tx s={12} w="700" c={urg}>{props.when}</Tx></View>
        </View>
        {props.canOpen && !t.big ? openChip : null}
        <Press a={props.del} label="Quitar de la despensa" style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' }}><Icon n="trash" size={17} color={t.mu} /></Press>
      </View>
      {t.big && props.canOpen ? openChip : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ flex: 1 }}>{t.big ? null : <Bar v={props.fill} c={urg === t.mu ? t.ac : urg} bg={t.soft} h={7} />}</View>
        <R a={props.minus} i="minus" l="Menos" />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <NumBox id={'q:' + props.id} label={`Cuánto queda de ${props.name}`} unit={props.unit} value={props.qty} max={4} done={(n) => dispatch({ type: 'PanQ', params: { id: props.id, value: n } })}
            style={{ paddingHorizontal: 10, paddingVertical: 6, minWidth: 54 * t.fs, alignItems: 'flex-end' }} />
          <Tx s={12} w="600" c={t.mu}>{props.unit}</Tx>
        </View>
        <R a={props.plus} i="plus" l="Más" />
      </View>
    </View>
  );
});

/* ---------- controles de ajustes ---------- */
const Pill = D('Pill', 'Opción seleccionable', { label: z.string(), on: z.boolean(), action: A(), icon: z.string().optional() }, ({ props }) => {
  const { t } = useC(); const on = props.on;
  return (
    <Press a={props.action} style={{ flexDirection: 'row', gap: 6, alignItems: 'center', minHeight: 42, paddingHorizontal: 16, borderRadius: 12, overflow: 'hidden', backgroundColor: on ? t.g1 : t.glass, borderWidth: on ? 0 : 1, borderColor: t.glassLn }}>
      {on ? <Grad r={12} a={t.g1} b={t.g2} dir="h" /> : null}
      {props.icon ? <Icon n={props.icon} size={16} color={on ? '#FFFFFF' : t.ac} /> : null}<Tx s={14} w="700" c={on ? '#FFFFFF' : t.ink} numberOfLines={1} style={{ flexShrink: 0 }}>{props.label}</Tx>
    </Press>
  );
});
const Swatch = D('Swatch', 'Color de acento', { color: z.string(), on: z.boolean(), action: A(), name: z.string().optional(), color2: z.string().optional(), icon: z.string().optional() }, ({ props }) => {
  const { t } = useC();
  // Con icono (el «+» de crear tema): círculo con borde discontinuo en vez de color.
  if (props.icon) return (
    <Press a={props.action} label={props.name} style={{ alignItems: 'center', gap: 4, width: 62 }}>
      <View style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderStyle: 'dashed', borderColor: t.ac, backgroundColor: t.acSoft, alignItems: 'center', justifyContent: 'center' }}><Icon n={props.icon} size={20} color={t.ac} w={2.6} /></View>
      {props.name ? <Tx s={11} w="600" c={t.mu} numberOfLines={1}>{props.name}</Tx> : null}
    </Press>
  );
  return (
    <Press a={props.action} label={props.name} style={{ alignItems: 'center', gap: 4, width: 62 }}>
      <View style={{ width: 44, height: 44, borderRadius: 22, overflow: 'hidden', backgroundColor: props.color, alignItems: 'center', justifyContent: 'center', borderWidth: props.on ? 3 : 0, borderColor: t.ink }}>{props.color2 ? <Grad a={props.color} b={props.color2} /> : null}{props.on ? <Icon n="check" size={20} color="#fff" w={3} /> : null}</View>
      {props.name ? <Tx s={11} w={props.on ? '800' : '600'} c={props.on ? t.ink : t.mu} numberOfLines={1}>{props.name}</Tx> : null}
    </Press>
  );
});
const Toggle = D('Toggle', 'Interruptor', { label: z.string(), sub: z.string(), on: z.boolean(), action: A() }, ({ props }) => {
  const { t, motion } = useC(); const a = useRef(new Animated.Value(props.on ? 1 : 0)).current;
  useEffect(() => { if (!motion) return a.setValue(props.on ? 1 : 0); Animated.spring(a, { toValue: props.on ? 1 : 0, damping: 16, stiffness: 240, useNativeDriver: false }).start(); }, [props.on]);
  // Se ve y se lee en voz alta si está activado: palabra «Sí / No» junto al interruptor (no solo el color), y área táctil de 48 dp como mínimo.
  return (
    <Press a={props.action} role="switch" state={{ checked: props.on }} label={`${props.label}. ${props.on ? 'Activado' : 'Desactivado'}${props.sub ? '. ' + props.sub : ''}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, minHeight: 48 }}>
      <View style={{ flex: 1, minWidth: 0 }}><Tx s={15} w="700">{props.label}</Tx>{props.sub ? <Tx s={12} c={t.mu}>{props.sub}</Tx> : null}</View>
      <View style={{ alignItems: 'center', gap: 2 }}>
        <Animated.View style={{ width: 52, height: 30, borderRadius: 15, padding: 3, backgroundColor: a.interpolate({ inputRange: [0, 1], outputRange: [t.ln, t.ac] }) }}>
          <Animated.View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff', transform: [{ translateX: a.interpolate({ inputRange: [0, 1], outputRange: [0, 22] }) }] }} />
        </Animated.View>
        <Tx s={11} w="800" c={props.on ? t.ac : t.mu}>{props.on ? 'Sí' : 'No'}</Tx>
      </View>
    </Press>
  );
});
/* ---------- teclado numérico propio ---------- */
/**
 * La app usa su propio teclado para los números (edad, peso, precios, cantidades): no abre el de Android, así la
 * pantalla no se mueve, no se tapa nada y se ve igual en cualquier móvil. Lo que escribes se guarda al tocar «Listo»,
 * «Siguiente», fuera del teclado o el botón «atrás».
 */
type KeyOpts = { id: string; label: string; unit: string; value: number; decimal: boolean; max: number; done: (n: number) => void; next?: () => void };
let keypadOpen: ((o: KeyOpts) => void) | null = null, keypadCur = '';
const keypadSubs = new Set<(id: string) => void>();
/** El campo que se está escribiendo (para resaltarlo). */
function useKeypadCur(id: string) { const [on, setOn] = useState(keypadCur === id); useEffect(() => { const f = (x: string) => setOn(x === id); keypadSubs.add(f); return () => { keypadSubs.delete(f); }; }, [id]); return on; }
const fmtN = (n: number) => (n ? String(Math.round(n * 100) / 100).replace('.', ',') : '');
/** Teclado: va encima de todo (también de la presentación). Se pone una vez, en App.tsx. */
export function KeypadHost() {
  const { t, haptic, sound } = useC(); const { width } = useWindowDimensions();
  const [o, setO] = useState<KeyOpts | null>(null), [txt, setTxt] = useState(''), a = useRef(new Animated.Value(0)).current;
  const cur = useRef<{ o: KeyOpts | null; txt: string }>({ o: null, txt: '' }); cur.current = { o, txt };
  const setCur = (id: string) => { keypadCur = id; keypadSubs.forEach((f) => f(id)); };
  useEffect(() => { keypadOpen = (n) => { setO(n); setTxt(fmtN(n.value)); setCur(n.id); a.setValue(0); Animated.spring(a, { toValue: 1, damping: 18, stiffness: 220, useNativeDriver: true }).start(); }; return () => { keypadOpen = null; }; }, []);
  // Guardar (solo si ha cambiado) y cerrar; con «Siguiente», abre el campo de después.
  const commit = (next = false) => {
    const { o: c, txt: v } = cur.current; if (!c) return;
    const n = parseFloat(v.replace(',', '.')) || 0;
    if (n !== c.value) c.done(n);
    if (next && c.next) { c.next(); return; }
    setCur(''); Animated.timing(a, { toValue: 0, duration: 160, useNativeDriver: true }).start(() => setO(null));
  };
  useEffect(() => { if (!o) return; const sub = BackHandler.addEventListener('hardwareBackPress', () => { commit(); return true; }); return () => sub.remove(); }, [!!o]);
  if (!o) return null;
  const key = (k: string) => {
    haptic(); sound('tap');
    setTxt((v) => {
      if (k === 'del') return v.slice(0, -1);
      if (k === ',') return !o.decimal || v.includes(',') ? v : (v || '0') + ',';
      const nv = v === '0' ? k : v + k, [ent, dec = ''] = nv.split(',');
      return ent.length > o.max || dec.length > 2 ? v : nv;
    });
  };
  const K = ({ k, l }: { k: string; l?: any }) => (
    <Pressable onPress={() => key(k)} accessibilityRole="button" accessibilityLabel={k === 'del' ? 'Borrar' : k} style={({ pressed }) => ({ flex: 1, height: 54, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? t.acSoft : t.card, borderWidth: 1, borderColor: t.ln, opacity: k === ',' && !o.decimal ? 0.35 : 1 })}>
      {l || <Tx s={22} w="800">{k}</Tx>}
    </Pressable>
  );
  const rows = [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9']];
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#00000055', opacity: a }]}><Pressable style={{ flex: 1 }} onPress={() => commit()} accessibilityLabel="Guardar y cerrar el teclado" /></Animated.View>
      <Animated.View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [420, 0] }) }] }}>
        <View style={{ width: '100%', maxWidth: 520, backgroundColor: t.bg, borderTopLeftRadius: 26, borderTopRightRadius: 26, padding: 16, paddingBottom: 22, gap: 10, boxShadow: '0px -10px 30px rgba(10, 30, 60, 0.25)' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ flex: 1 }}><Tx s={13} w="800" c={t.mu}>{o.label}</Tx>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}><Tx s={34} w="800" c={txt ? t.ink : t.mu}>{txt || '—'}</Tx><Tx s={16} w="700" c={t.mu}>{o.unit}</Tx></View></View>
            {txt ? <Pressable onPress={() => setTxt('')} style={{ paddingHorizontal: 12, paddingVertical: 8 }}><Tx s={14} w="800" c={t.mu}>Borrar</Tx></Pressable> : null}
          </View>
          {rows.map((r) => <View key={r[0]} style={{ flexDirection: 'row', gap: 8 }}>{r.map((k) => <K key={k} k={k} />)}</View>)}
          <View style={{ flexDirection: 'row', gap: 8 }}><K k="," /><K k="0" /><K k="del" l={<Icon n="left" size={22} color={t.ink} w={2.4} />} /></View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 2 }}>
            {o.next ? <Pressable onPress={() => commit(true)} style={{ flex: 1, minHeight: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: t.acSoft }}><Tx s={16} w="800" c={t.ac}>Siguiente</Tx></Pressable> : null}
            <Pressable onPress={() => commit()} style={{ flex: o.next ? 1 : undefined, width: o.next ? undefined : Math.min(width - 32, 488), minHeight: 52, borderRadius: 14, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}><Grad r={14} a={t.g1} b={t.g2} dir="h" /><Tx s={16} w="800" c="#FFFFFF">Listo</Tx></Pressable>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}
/** Caja de un número: al tocarla se abre el teclado de la app. */
function NumBox({ id, label, unit, value, decimal = true, max = 4, done, next, style, size = 15 }: { id: string; label: string; unit: string; value: number; decimal?: boolean; max?: number; done: (n: number) => void; next?: () => void; style?: any; size?: number }) {
  const { t } = useC(); const on = useKeypadCur(id);
  return (
    <Press onPress={() => keypadOpen?.({ id, label, unit, value, decimal, max, done, next })} label={`${label}: ${fmtN(value) || 'sin rellenar'} ${unit}`} style={[{ borderRadius: 12, borderWidth: 2, borderColor: on ? t.ac : 'transparent', backgroundColor: on ? t.acSoft : t.soft }, style]}>
      <Tx s={size} w="800" c={value ? t.ink : t.mu}>{fmtN(value) || '—'}</Tx>
    </Press>
  );
}
// Tus datos se rellenan seguidos con «Siguiente»: edad → altura → peso.
const FIELDS = new Map<string, { label: string; unit: string; value: number; done: (n: number) => void }>();
const FIELD_ORDER = ['age', 'h', 'w'];
const openField = (name: string): void => {
  const f = FIELDS.get(name); if (!f) return;
  const nx = FIELD_ORDER[FIELD_ORDER.indexOf(name) + 1];
  keypadOpen?.({ id: 'f:' + name, label: f.label, unit: f.unit, value: f.value, decimal: name === 'w', max: 3, done: f.done, next: nx && FIELDS.has(nx) ? () => openField(nx) : undefined });
};
const Step = D('Step', 'Ajuste con − y +', { label: z.string(), value: z.string(), minus: A(), plus: A() }, ({ props }) => {
  const { t } = useC(); const B = ({ a, i, l }: any) => <Press a={a} label={l} style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: t.acSoft, alignItems: 'center', justifyContent: 'center' }}><Icon n={i} size={18} color={t.ac} w={2.6} /></Press>;
  const ctl = <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><B a={props.minus} i="minus" l="Menos" /><Tx s={16} w="800" style={{ minWidth: 76 * t.fs, textAlign: 'center' }}>{props.value}</Tx><B a={props.plus} i="plus" l="Más" /></View>;
  if (t.big) return <View style={{ gap: 6, paddingVertical: 4 }}><Tx s={15} w="700">{props.label}</Tx><View style={{ alignItems: 'flex-end' }}>{ctl}</View></View>;
  return <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 }}><Tx s={15} w="700" style={{ flex: 1 }}>{props.label}</Tx>{ctl}</View>;
});
/** Edad, altura o peso: se tocan y se escriben con el teclado de la app (se guarda al terminar). */
const Field = D('Field', 'Campo numérico', { label: z.string(), name: z.string(), value: z.number(), unit: z.string() }, ({ props }) => {
  const { t, dispatch } = useC(); const on = useKeypadCur('f:' + props.name);
  const done = (n: number) => dispatch({ type: 'Prof', params: { key: props.name, value: n } });
  FIELDS.set(props.name, { label: props.label, unit: props.unit, value: props.value, done });
  return (
    <Press onPress={() => openField(props.name)} label={`${props.label}: ${props.value || 'sin rellenar'} ${props.unit}`} style={{ flex: 1, backgroundColor: on ? t.acSoft : t.soft, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 2, borderColor: on ? t.ac : 'transparent' }}>
      <Tx s={12} w="700" c={on ? t.ac : t.mu}>{props.label}</Tx>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}><Tx s={22} w="800" c={props.value ? t.ink : t.mu} numberOfLines={1} style={{ flexShrink: 1 }}>{props.value ? fmtN(props.value) : '—'}</Tx><View style={{ flex: 1 }} /><Tx s={13} w="600" c={t.mu}>{props.unit}</Tx></View>
    </Press>
  );
});
const Note = D('Note', 'Aviso', { text: z.string(), tone: z.string().optional() }, ({ props }) => {
  const { t } = useC(); const w = props.tone === 'warn';
  // Las notas informativas van como texto discreto (sin caja) para no llenar la pantalla de recuadros; los avisos sí van destacados.
  if (!w) return <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 4, paddingVertical: 2 }}><View style={{ marginTop: 2 }}><Icon n="info" size={14} color={t.mu} /></View><Tx s={13} w="500" c={t.mu} style={{ flex: 1 }}>{props.text}</Tx></View>;
  return <View style={{ borderRadius: 14, padding: 14, backgroundColor: t.warnBg, flexDirection: 'row', gap: 10 }}><Icon n="info" size={17} color={t.warnInk} /><Tx s={13} w="600" c={t.warnInk} style={{ flex: 1 }}>{props.text}</Tx></View>;
});
const Card = D('Card', 'Tarjeta', { children: z.array(z.any()) }, ({ props, renderNode }) => <View style={card(useC().t, { gap: 8 })}>{renderNode(props.children)}</View>);
const Empty = D('Empty', 'Estado vacío', { title: z.string(), sub: z.string(), ids: z.array(z.string()), label: z.string(), action: A(), label2: z.string().optional(), action2: A(), name: z.string().optional() }, ({ props }) => {
  const { t } = useC();
  return (
    <FadeIn>
      <View style={card(t, { alignItems: 'center', gap: 14, padding: 28 })}>
        <ArtBox slot={1} size={170} r={0.5}><MealArt ids={props.ids} name={props.name} slot={1} size={150} /></ArtBox>
        <Tx s={25} serif style={{ textAlign: 'center', letterSpacing: -0.3 }}>{props.title}</Tx><Tx s={15} c={t.mu} style={{ textAlign: 'center', maxWidth: 420 }}>{props.sub}</Tx>
        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Press a={props.action} style={{ minHeight: 52, borderRadius: 14, overflow: 'hidden', paddingHorizontal: 24, backgroundColor: t.g1, justifyContent: 'center' }}><Grad r={14} a={t.g1} b={t.g2} dir="h" /><Tx s={16} w="700" c="#FFFFFF">{props.label}</Tx></Press>
          {props.label2 ? <Press a={props.action2} style={{ minHeight: 52, borderRadius: 14, paddingHorizontal: 22, backgroundColor: t.acSoft, justifyContent: 'center' }}><Tx s={15} w="700" c={t.ac}>{props.label2}</Tx></Press> : null}
        </View>
      </View>
    </FadeIn>
  );
});
/** Pestaña de la barra inferior: solo icono; la activa se ensancha con degradado y muestra su nombre. */
const NavItem = D('NavItem', 'Pestaña', { icon: z.string(), label: z.string(), on: z.boolean(), action: A() }, ({ props }) => {
  const { t, fonts } = useC(); const on = props.on;
  return (
    <Press a={props.action} label={props.label} style={{ flex: on ? 2.1 : 1, height: 50 * Math.min(t.fs, 1.2), flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 16, overflow: 'hidden', backgroundColor: on ? t.g1 : 'transparent', paddingHorizontal: on ? 10 : 0 }}>
      {on ? <Grad r={16} a={t.g1} b={t.g2} dir="h" /> : null}
      <Icon n={props.icon} size={21} color={on ? '#FFFFFF' : t.mu} />
      {on ? <Text numberOfLines={1} adjustsFontSizeToFit allowFontScaling={false} style={[{ fontSize: 13 * Math.min(t.fs, 1.15), color: '#FFFFFF', flexShrink: 1 }, font(fonts, '800')]}>{props.label}</Text> : null}
    </Press>
  );
});
/** Ilustración grande del plato en la cabecera de la receta, sobre un degradado del color de su franja. */
const Art = D('Art', 'Ilustración del plato', { ids: z.array(z.string()), size: z.number().optional(), name: z.string().optional(), slot: z.number().optional() }, ({ props }) => {
  const { t } = useC(); const size = props.size ?? 180, slot = props.slot ?? -1, c = slot >= 0 ? SLOT[slot] : t.ac;
  return (
    <FadeIn>
      <View style={{ height: size + 36, borderRadius: 22, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
        {/* Fondo sobrio: degradado suave del color de la franja y una luz difusa detrás del plato (sin círculos). */}
        <Grad r={22} a={c} b={t.ac} o1={t.dark ? 0.32 : 0.34} o2={t.dark ? 0.12 : 0.12} />
        <View pointerEvents="none" style={{ position: 'absolute', width: size * 1.6, height: size * 1.6 }}><Glow c="#FFFFFF" size={size * 1.6} x={size * 0.8} y={size * 0.8} o={t.dark ? 0.1 : 0.4} /></View>
        <MealArt ids={props.ids} name={props.name} slot={slot} tint={c} size={size} />
      </View>
    </FadeIn>
  );
});
const Chips = D('Chips', 'Datos en fila', { items: z.array(z.string()) }, ({ props }) => {
  const { t } = useC();
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>{props.items.map((x: string, i: number) => <View key={i} style={{ backgroundColor: t.glass, borderWidth: 1, borderColor: t.glassLn, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 }}><Tx s={13} w="700">{x}</Tx></View>)}</View>;
});
/** Etiqueta con una x para quitarla (por ejemplo, un plato o ingrediente vetado). */
const Chip = D('Chip', 'Etiqueta que se quita', { label: z.string(), action: A() }, ({ props }) => {
  const { t } = useC();
  return <Press a={props.action} label={`Quitar ${props.label}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: t.soft, borderRadius: 16, paddingLeft: 12, paddingRight: 9, paddingVertical: 7, maxWidth: '100%' }}><Tx s={13} w="700" style={{ flexShrink: 1 }}>{props.label}</Tx><Icon n="x" size={13} color={t.mu} w={2.6} /></Press>;
});
const Cook = D('Cook', 'Paso de receta', { n: z.number(), text: z.string() }, ({ props }) => {
  const { t } = useC();
  return <View style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}><View style={{ width: 32, height: 32, borderRadius: 16, overflow: 'hidden', backgroundColor: t.g1, alignItems: 'center', justifyContent: 'center' }}><Grad a={t.g1} b={t.g2} /><Tx s={14} w="800" c="#FFFFFF">{props.n}</Tx></View><Tx s={16} w="500" style={{ flex: 1, lineHeight: 25 * t.fs }}>{props.text}</Tx></View>;
});
const Timer = D('Timer', 'Temporizador', { seconds: z.number(), end: z.number().optional(), demo: z.boolean().optional() }, ({ props }) => {
  const { t, dispatch: real } = useC(); const running = (props.end || 0) > Date.now();
  // demo: en la presentación empieza a contar solo y no avisa a la app (es un ejemplo).
  const dispatch = props.demo ? () => {} : real;
  useEffect(() => { if (!props.demo) return; const id = setTimeout(() => { end.current = Date.now() + props.seconds * 1000; setRun(true); }, 1600); return () => clearTimeout(id); }, []);
  const [left, setLeft] = useState(running ? Math.round((props.end - Date.now()) / 1000) : props.seconds); const [run, setRun] = useState(running); const end = useRef(running ? props.end : 0);
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => { if (!run) return; const id = setInterval(() => { const r = Math.max(0, Math.round((end.current - Date.now()) / 1000)); setLeft(r); if (!r) { setRun(false); dispatch({ type: 'TimerDone' }); Animated.sequence([Animated.spring(pulse, { toValue: 1.15, useNativeDriver: true }), Animated.spring(pulse, { toValue: 1, useNativeDriver: true })]).start(); } }, 400); return () => clearInterval(id); }, [run]);
  const go = () => { if (run) { setRun(false); setLeft(props.seconds); dispatch({ type: 'TimerStop' }); } else { const s = left || props.seconds; setLeft(s); end.current = Date.now() + s * 1000; setRun(true); dispatch({ type: 'TimerStart', params: { sec: s, end: end.current } }); } };
  return (
    <View style={card(t, { alignItems: 'center', gap: 10 })}>
      <Animated.View style={{ transform: [{ scale: pulse }] }}><Tx s={54} serif c={left === 0 ? t.ok : t.ac} style={{ letterSpacing: -2, fontVariant: ['tabular-nums'], lineHeight: 64 * t.fs }}>{Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</Tx></Animated.View>
      <Press onPress={go} style={{ height: 52, borderRadius: 14, overflow: 'hidden', paddingHorizontal: 30, backgroundColor: run ? t.warn : t.g1, justifyContent: 'center' }}>{run ? null : <Grad r={14} a={t.g1} b={t.g2} dir="h" />}<Tx s={16} w="700" c="#FFFFFF">{run ? 'Parar' : left === 0 ? 'Otra vez' : 'Iniciar temporizador'}</Tx></Press>
      {run ? <Tx s={12} c={t.mu}>Puedes cerrar la receta: el temporizador sigue y te aviso.</Tx> : null}
    </View>
  );
});

/** Consejo de cocina destacado: título pequeño con icono y texto. */
/** Aviso discreto que lleva a otra pantalla (por ejemplo, a «Tú» si faltan tus datos). */
const Nudge = D('Nudge', 'Aviso discreto con enlace', { text: z.string(), action: A() }, ({ props }) => {
  const { t } = useC();
  return (
    <Press a={props.action} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 14, backgroundColor: t.glass, borderWidth: 1, borderColor: t.glassLn }}>
      <Icon n="tu" size={16} color={t.mu} w={2.2} />
      <Tx s={13} w="700" c={t.mu} style={{ flex: 1 }}>{props.text}</Tx>
      <Icon n="right" size={16} color={t.mu} w={2.4} />
    </Press>
  );
});
/* ---------- Nevú Plus ---------- */
// Colores de Plus: azul noche a índigo, con detalles de cian a violeta (alto contraste, se distingue del azul de la app).
export const PLUS_A = '#0E1838', PLUS_B = '#2A1D6B', PLUS_INK = '#4338CA';
export const PLUS_FEATS: [string, string][] = [
  ['plan', 'Tus comidas en Google Calendar, siempre al día'],
  ['cloud', 'Sincronización automática entre tus dispositivos'],
  ['print', 'Menú para la nevera y lista de la compra en PDF'],
  ['leaf', 'Libro de recetas y resumen de nutrición de tu semana'],
  ['spark', 'Crea tus propios temas de color'],
];
/** Etiqueta pequeña de Plus (su icono + «Nevú Plus»). */
export const PlusTag = ({ label = 'Nevú Plus' }: { label?: string }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', borderRadius: 999, overflow: 'hidden', paddingHorizontal: 12, paddingVertical: 5 }}>
    <Grad a={PLUS_A} b={PLUS_B} dir="h" /><Icon n="nplus" size={14} color="#FFFFFF" w={2.2} /><Tx s={12} w="800" c="#FFFFFF" style={{ letterSpacing: 0.4 }}>{label}</Tx>
  </View>
);
/**
 * Icono de Plus: la «n» del logotipo de Nevú, con su hoja y un «+», sobre azul noche con un borde de cian a violeta
 * (alto contraste y aire de «premium»). Todo cabe dentro de su cuadrado.
 */
export const PlusIcon = ({ size = 54 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Defs>
      <LinearGradient id="pBg" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#0B1430" /><Stop offset="1" stopColor="#24195C" /></LinearGradient>
      <LinearGradient id="pIri" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor="#22D3EE" /><Stop offset="0.5" stopColor="#3B82F6" /><Stop offset="1" stopColor="#A855F7" /></LinearGradient>
      <LinearGradient id="pN" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor="#FFFFFF" /><Stop offset="1" stopColor="#C7E6FF" /></LinearGradient>
      <LinearGradient id="pLeaf" x1="0" y1="1" x2="1" y2="0"><Stop offset="0" stopColor="#2FC79A" /><Stop offset="1" stopColor="#8BF0CF" /></LinearGradient>
    </Defs>
    <Rect x="0" y="0" width="48" height="48" rx="14" fill="url(#pBg)" />
    <Rect x="0.9" y="0.9" width="46.2" height="46.2" rx="13.2" fill="none" stroke="url(#pIri)" strokeWidth={1.8} />
    <Path d="M13 36V22M13 27.5a8.5 8.5 0 0 1 17 0V36" fill="none" stroke="url(#pN)" strokeWidth={5} strokeLinecap="round" />
    <Path d="M27 17c0-5 3-8.5 8-10 .5 5-2.5 8.6-8 10z" fill="url(#pLeaf)" />
    <Path d="M38 27v9M33.5 31.5h9" stroke="url(#pIri)" strokeWidth={3.4} strokeLinecap="round" />
  </Svg>
);
/** Tarjeta de Nevú Plus: qué incluye y, si aún no lo tienes, comprar o restaurar. */
const PlusCard = D('PlusCard', 'Nevú Plus', { has: z.boolean(), price: z.string(), buy: A(), restore: A() }, ({ props }) => {
  const { t } = useC();
  return (
    <View style={{ borderRadius: 22, overflow: 'hidden', padding: 18, gap: 12, borderWidth: 1.5, borderColor: '#7C8CFF66' }}>
      <Grad r={22} a={PLUS_A} b={PLUS_B} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <PlusIcon size={50} />
        <View style={{ flex: 1, minWidth: 0 }}><Tx s={20} serif c="#FFFFFF">Nevú Plus</Tx><Tx s={13} w="700" c="#FFFFFFD9">{props.has ? 'Lo tienes. ¡Gracias por apoyar la app!' : `Pago único de ${props.price}, para siempre. Sin suscripción.`}</Tx></View>
      </View>
      <View style={{ gap: 8 }}>
        {PLUS_FEATS.map(([ic, x]) => (
          <View key={x} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Icon n={props.has ? 'check' : ic} size={17} color="#67E8F9" w={2.3} /><Tx s={14} w="700" c="#FFFFFF" style={{ flex: 1 }}>{x}</Tx>
          </View>
        ))}
      </View>
      {props.has ? null : (
        <View style={{ gap: 4 }}>
          <Press a={props.buy} label={`Desbloquear por ${props.price}`} style={{ minHeight: 50, borderRadius: 14, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}>
            <Icon n="nplus" size={17} color={PLUS_INK} w={2.3} /><Tx s={15} w="800" c={PLUS_INK}>{`Desbloquear por ${props.price}`}</Tx>
          </Press>
          <Press a={props.restore} style={{ minHeight: 40, alignItems: 'center', justifyContent: 'center' }}><Tx s={13} w="700" c="#FFFFFFE6">Ya lo compré: restaurar</Tx></Press>
        </View>
      )}
    </View>
  );
});
/** Consejo de primer uso: sale una vez en cada pestaña y se va con «Entendido». */
const Guide = D('Guide', 'Consejo de primer uso', { title: z.string(), text: z.string(), action: A() }, ({ props }) => {
  const { t } = useC();
  return (
    <View accessibilityRole="summary" style={card(t, { gap: 8, padding: 14, borderColor: t.ac + '55' })}>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
        <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: t.acSoft, alignItems: 'center', justifyContent: 'center' }}><Icon n="spark" size={17} color={t.ac} w={2.4} /></View>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}><Tx s={13} w="800" c={t.ac}>{props.title}</Tx><Tx s={15} w="500" style={{ lineHeight: 22 * t.fs }}>{props.text}</Tx></View>
      </View>
      <Press a={props.action} label="Entendido, cerrar consejo" style={{ alignSelf: 'flex-end', minHeight: 44, paddingHorizontal: 16, borderRadius: 12, backgroundColor: t.acSoft, alignItems: 'center', justifyContent: 'center' }}><Tx s={14} w="800" c={t.ac}>Entendido</Tx></Press>
    </View>
  );
});
const Hint = D('Hint', 'Consejo de cocina', { title: z.string(), text: z.string(), icon: z.string().optional() }, ({ props }) => {
  const { t } = useC();
  return (
    <View style={card(t, { flexDirection: 'row', gap: 12, padding: 14, alignItems: 'flex-start' })}>
      <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: t.acSoft, alignItems: 'center', justifyContent: 'center' }}><Icon n={props.icon || 'spark'} size={17} color={t.ac} w={2.4} /></View>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}><Tx s={13} w="800" c={t.ac}>{props.title}</Tx><Tx s={15} w="500" style={{ lineHeight: 22 * t.fs }}>{props.text}</Tx></View>
    </View>
  );
});
/** Aviso discreto de versión nueva: una línea, «Ver novedades» y una x para cerrarlo. */
const News = D('News', 'Aviso de novedades', { title: z.string(), text: z.string(), open: A(), close: A(), badge: z.string().optional() }, ({ props }) => {
  const { t } = useC();
  return (
    <FadeIn>
      <View style={card(t, { flexDirection: 'row', gap: 12, padding: 12, paddingRight: 6, alignItems: 'center' })}>
        <View style={{ minWidth: 40, height: 40, paddingHorizontal: 6, borderRadius: 20, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}><Grad a={t.g1} b={t.g2} /><Tx s={13} w="800" c="#FFFFFF">{props.badge || 'Nuevo'}</Tx></View>
        <Press a={props.open} label={props.title} style={{ flex: 1, minWidth: 0, gap: 1 }}>
          <Tx s={13} w="800" c={t.ac}>{props.title}</Tx>
          <Tx s={14} w="500" numberOfLines={2}>{props.text}</Tx>
          <Tx s={13} w="800" c={t.ac} style={{ marginTop: 2 }}>Ver novedades</Tx>
        </Press>
        <Press a={props.close} label="Cerrar aviso" style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}><Icon n="x" size={16} color={t.mu} w={2.4} /></Press>
      </View>
    </FadeIn>
  );
});
/** Bloque de una versión en el registro de cambios: número grande, fecha y lista de cambios. */
const Ver = D('Ver', 'Versión del registro', { v: z.string(), sub: z.string(), children: z.array(z.any()) }, ({ props, renderNode }) => {
  const { t } = useC();
  return (
    <View style={card(t, { gap: 10, padding: 16 })}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}><Tx s={22} serif>{props.v}</Tx><Tx s={12.5} w="700" c={t.mu}>{props.sub}</Tx></View>
      <View style={{ gap: 9 }}>{renderNode(props.children)}</View>
    </View>
  );
});
/** Un cambio: etiqueta de color (Nuevo, Mejorado, Corregido) y una frase corta. */
const Change = D('Change', 'Cambio de una versión', { kind: z.string(), text: z.string() }, ({ props }) => {
  const { t } = useC(); const c = props.kind === 'Corregido' ? t.amber : props.kind === 'Mejorado' ? t.ok : t.ac;
  return (
    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
      <View style={{ minWidth: 84, alignItems: 'center', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: t.soft }}><Tx s={11.5} w="800" c={c}>{props.kind}</Tx></View>
      <Tx s={14.5} w="500" style={{ flex: 1, lineHeight: 21 * t.fs }}>{props.text}</Tx>
    </View>
  );
});
/** «Ahora toca»: la siguiente comida de hoy, como gran tarjeta con degradado, ilustración y dos botones claros. */
const NowCard = D('NowCard', 'Siguiente comida de hoy', { slot: z.number(), label: z.string(), name: z.string(), ids: z.array(z.string()), minutes: z.number(), open: A(), easy: A() }, ({ props }) => {
  const { t } = useC(); const { width } = useWindowDimensions(), art = Math.min(150, Math.max(116, width * 0.32)), c = props.slot >= 0 ? SLOT[props.slot] : SLOT[3];
  return (
    <FadeIn>
      <View style={{ borderRadius: 24, overflow: 'hidden', padding: 20, gap: 16, backgroundColor: t.g1 }}>
        <Grad r={24} a={t.g1} b={t.g2} />
        {/* Luz suave detrás del plato (sin círculos de color: más sobrio). */}
        <Glow c="#FFFFFF" size={art * 2.2} x={width - art * 0.9} y={art * 0.55} o={0.22} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
            <Tx s={13} w="800" c="#FFFFFFD9" style={{ letterSpacing: 0.4 }}>{props.label}</Tx>
            <Tx s={24} serif c="#FFFFFF" style={{ letterSpacing: -0.4, lineHeight: 29 * t.fs }}>{props.name}</Tx>
            {props.minutes ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Icon n="clock" size={15} color="#FFFFFFD9" /><Tx s={13} w="700" c="#FFFFFFD9">{props.minutes} min</Tx></View> : null}
          </View>
          <Float><MealArt ids={props.ids} name={props.slot >= 0 ? props.name : ''} slot={props.slot} tint={c} size={art} /></Float>
        </View>
        {props.open ? (
          <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
            <Press a={props.open} style={{ flexGrow: 1, minHeight: 52, borderRadius: 14, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 }}><Tx s={16} w="800" c={t.g1}>Ver receta</Tx></Press>
            <Press a={props.easy} style={{ flexGrow: 1, minHeight: 52, borderRadius: 14, backgroundColor: '#FFFFFF26', borderWidth: 1, borderColor: '#FFFFFF55', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 }}><Tx s={16} w="700" c="#FFFFFF">Algo más fácil</Tx></Press>
          </View>
        ) : null}
      </View>
    </FadeIn>
  );
});
/** Fila simple del modo sencillo: ilustración, franja y plato, sin cifras. */
const SimpleRow = D('SimpleRow', 'Plato sin cifras', { slot: z.number(), label: z.string(), name: z.string(), done: z.boolean(), action: A(), ids: z.array(z.string()) }, ({ props }) => {
  const { t } = useC();
  return (
    <Press a={props.action} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 8, opacity: props.done ? 0.55 : 1 }}>
      <ArtBox slot={props.slot} size={56}><MealArt ids={props.ids || []} name={props.name} slot={props.slot} tint={SLOT[props.slot]} size={54} /></ArtBox>
      <View style={{ flex: 1, minWidth: 0 }}><Tx s={12} w="800" c={t.mu} style={{ letterSpacing: 0.5, textTransform: 'uppercase' }}>{props.label}{props.done ? ' · hecho' : ''}</Tx><Tx s={17} w="700" style={{ textDecorationLine: props.done ? 'line-through' : 'none' }}>{props.name}</Tx></View>
      <Icon n="right" size={18} color={t.mu} />
    </Press>
  );
});

/** Permiso del móvil: estado y botón para activarlo o abrir su ajuste. state: ok, off o vacío (no se sabe). */
const Perm = D('Perm', 'Permiso del móvil', { label: z.string(), sub: z.string(), state: z.string(), action: A() }, ({ props }) => {
  const { t } = useC(); const ok = props.state === 'ok';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 }}>
      <View style={{ flex: 1, minWidth: 0 }}><Tx s={15} w="700">{props.label}</Tx><Tx s={12} c={props.state === 'off' ? t.warn : t.mu}>{props.state === 'off' ? 'Desactivado: ' : ''}{props.sub}</Tx></View>
      {ok ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10 }}><Icon n="check" size={16} color={t.ok} w={2.6} /><Tx s={13} w="800" c={t.ok}>Activado</Tx></View>
        : <Press a={props.action} style={{ borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: t.acSoft }}><Tx s={13} w="800" c={t.ac}>{props.state === 'off' ? 'Activar' : 'Abrir'}</Tx></Press>}
    </View>
  );
});
/** Menú para la nevera: imprimir (o guardar en PDF desde el diálogo) y compartir. */
const Fridge = D('Fridge', 'Imprimir el menú', { title: z.string(), sub: z.string(), print: A(), share: A() }, ({ props }) => {
  const { t } = useC();
  return (
    <FadeIn>
      <View style={card(t, { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 })}>
        <View style={{ width: 62, height: 62, borderRadius: 16, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}><Grad r={16} a={SLOT[0]} b={SLOT[1]} /><Icon n="print" size={26} color="#FFFFFF" /></View>
        <View style={{ flex: 1, minWidth: 0 }}><Tx s={18} serif>{props.title}</Tx><Tx s={13} w="600" c={t.mu}>{props.sub}</Tx></View>
        <Press a={props.share} label="Compartir PDF" style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: t.acSoft, alignItems: 'center', justifyContent: 'center' }}><Icon n="share" size={18} color={t.ac} /></Press>
        <Press a={props.print} label="Imprimir" style={{ width: 42, height: 42, borderRadius: 21, overflow: 'hidden', backgroundColor: t.g1, alignItems: 'center', justifyContent: 'center' }}><Grad a={t.g1} b={t.g2} /><Icon n="print" size={18} color="#FFFFFF" /></Press>
      </View>
    </FadeIn>
  );
});

/** Foto ampliada de un producto con su nombre y envase como pie de foto. */
const Zoom = D('Zoom', 'Foto ampliada', { uri: z.string(), title: z.string(), caption: z.string(), ids: z.array(z.string()) }, ({ props }) => {
  const { t } = useC(); const { width } = useWindowDimensions(), S = Math.min(width - 40, 560);
  const [bad, setBad] = useState(false);
  return (
    <FadeIn style={{ alignItems: 'center', gap: 14 }}>
      <View style={{ width: S, height: S, borderRadius: 18, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {bad ? <MealArt ids={props.ids} size={S * 0.7} /> : <Image source={{ uri: props.uri }} onError={() => setBad(true)} resizeMode="contain" style={{ width: S - 24, height: S - 24 }} />}
      </View>
      <Tx s={20} serif style={{ textAlign: 'center' }}>{props.title}</Tx>
      <Tx s={15} w="600" c={t.mu} style={{ textAlign: 'center' }}>{props.caption}</Tx>
    </FadeIn>
  );
});

/* ---------- calma ---------- */
/** Acceso a un momento de calma: círculos concéntricos con degradado, título y una frase. */
const Calm = D('Calm', 'Tarjeta de calma', { title: z.string(), sub: z.string(), action: A() }, ({ props }) => {
  const { t } = useC();
  return (
    <FadeIn>
      <Press a={props.action} style={card(t, { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 })}>
        <View style={{ width: 62, height: 62, borderRadius: 31, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
          <Grad a={SLOT[5]} b={SLOT[3]} />
          <View style={{ position: 'absolute', width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF', opacity: 0.22 }} />
          <View style={{ position: 'absolute', width: 26, height: 26, borderRadius: 13, backgroundColor: '#FFFFFF', opacity: 0.35 }} />
          <Icon n="wind" size={22} color="#FFFFFF" />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}><Tx s={18} serif>{props.title}</Tx><Tx s={13} w="600" c={t.mu}>{props.sub}</Tx></View>
        <Icon n="right" size={18} color={t.mu} />
      </Press>
    </FadeIn>
  );
});
/**
 * Respiración guiada: 6 respiraciones lentas (4 s tomando aire, 6 s soltándolo), un minuto en total.
 * Respirar a unas 6 respiraciones por minuto se asocia a más calma y menos activación (revisión de Zaccaro y col., 2018).
 */
const BR = { inn: 4000, out: 6000, n: 6 };
const Breathe = D('Breathe', 'Respiración guiada', { auto: z.boolean().optional() }, ({ props }) => {
  const { t, sound, winH } = useC(); const { width } = useWindowDimensions(), S = Math.min(280, width * 0.7, (winH ?? 9999) * 0.42);
  const [run, setRun] = useState(false), [ph, setPh] = useState(0), [n, setN] = useState(0);
  // auto: en la presentación empieza sola (para verla funcionando).
  useEffect(() => { if (!props.auto) return; const id = setTimeout(() => setRun(true), 500); return () => clearTimeout(id); }, []);
  const s = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!run) { (s as any).stopAnimation?.(); Animated.timing(s, { toValue: 0, duration: 700, useNativeDriver: true }).start(); return; }
    // En la presentación (auto) solo una respiración y más corta: «Toma aire» y «Suéltalo».
    let alive = true, c = 0; const max = props.auto ? 1 : BR.n, inn = props.auto ? 2400 : BR.inn, out = props.auto ? 2800 : BR.out;
    const cycle = () => {
      if (!alive) return;
      if (c >= max) { setRun(false); if (!props.auto) setN(BR.n); return; }
      setPh(0); sound('respira');
      Animated.timing(s, { toValue: 1, duration: inn, easing: Easing.inOut(Easing.sin), useNativeDriver: true }).start(({ finished }) => {
        if (!alive || !finished) return; setPh(1);
        Animated.timing(s, { toValue: 0, duration: out, easing: Easing.inOut(Easing.sin), useNativeDriver: true }).start(({ finished: f2 }) => { if (!alive || !f2) return; c++; setN(c); cycle(); });
      });
    };
    setN(0); cycle();
    return () => { alive = false; (s as any).stopAnimation?.(); };
  }, [run]);
  const done = !run && n >= BR.n, label = run ? (ph === 0 ? 'Toma aire' : 'Suéltalo') : done ? 'Bien hecho' : 'Respira';
  const scale = s.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });
  return (
    <View style={{ alignItems: 'center', gap: 22, paddingVertical: 10 }}>
      <View style={{ width: S, height: S, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ position: 'absolute', width: S, height: S, borderRadius: S / 2, borderWidth: 1.5, borderColor: t.ac, opacity: 0.25 }} />
        <View style={{ position: 'absolute', width: S * 0.55, height: S * 0.55, borderRadius: S, borderWidth: 1, borderColor: t.ac, opacity: 0.2 }} />
        <Animated.View style={{ width: S, height: S, borderRadius: S / 2, overflow: 'hidden', transform: [{ scale }] }}>
          <Grad a={SLOT[5]} b={t.g1} o1={0.85} o2={0.85} />
          <View style={{ position: 'absolute', left: S * 0.12, top: S * 0.1, width: S * 0.5, height: S * 0.5, borderRadius: S, backgroundColor: '#FFFFFF', opacity: 0.16 }} />
        </Animated.View>
        <View style={{ position: 'absolute', alignItems: 'center' }}><Tx s={22} serif c="#FFFFFF" style={{ textAlign: 'center' }}>{label}</Tx></View>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>{Array.from({ length: BR.n }, (_, i) => <View key={i} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: t.ac, opacity: i < n ? 1 : 0.22 }} />)}</View>
      <Press onPress={() => setRun(!run)} style={{ minHeight: 54, minWidth: 210, borderRadius: 16, overflow: 'hidden', backgroundColor: t.g1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 26 }}>
        {run ? null : <Grad r={16} a={t.g1} b={t.g2} dir="h" />}<Tx s={16} w="800" c="#FFFFFF">{run ? 'Parar' : done ? 'Otra vez' : 'Empezar'}</Tx>
      </Press>
      <Tx s={13} w="600" c={t.mu} style={{ textAlign: 'center', maxWidth: 380 }}>Un minuto: toma aire en 4 segundos y suéltalo en 6. Respirar así de despacio ayuda a calmar el cuerpo.</Tx>
    </View>
  );
});

/** Presentación: una página por pantalla, sobre un degradado con luces, y animación de entrada en cada cambio. */
/* ---------- presentación: cada paso es una pequeña demostración animada ---------- */
const loopAnim = (v: any, ms: number, motion: boolean, pause = 0) => {
  if (!motion) { v.setValue(1); return () => {}; }
  const l = Animated.loop(Animated.sequence([Animated.timing(v, { toValue: 1, duration: ms, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }), Animated.delay(pause), Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: true })]));
  l.start(); return () => l.stop();
};
/** Marco de móvil en miniatura donde ocurre la demostración. */
/**
 * Pantalla real de la app dentro de un móvil, para la presentación. Es una imagen pequeña (no la app «en vivo»), así que no pesa:
 * solo se mueven con el motor nativo la flotación y un brillo que cruza la pantalla.
 */
const SHOT: Record<string, any> = { dishes: require('../assets/intro/plan.webp'), sync: require('../assets/intro/plus.webp') };
function Shot({ src, w }: { src: any; w: number }) {
  const { motion } = useC(); const f = useRef(new Animated.Value(0)).current;
  useEffect(() => { if (!motion) return; const l = Animated.loop(Animated.timing(f, { toValue: 1, duration: 7000, easing: Easing.linear, useNativeDriver: true })); l.start(); return () => l.stop(); }, [motion]);
  const bez = Math.max(6, w * 0.035), r = w * 0.13, iw = w - bez * 2, ih = iw * 2.06;
  return (
    <Animated.View style={{ width: w, padding: bez, borderRadius: r, backgroundColor: '#0B1220', boxShadow: '0px 28px 60px rgba(4, 20, 50, 0.45)', transform: [{ translateY: f.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -7, 0] }) }, { rotate: f.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['-1.2deg', '1.2deg', '-1.2deg'] }) }] }}>
      <View style={{ width: iw, height: ih, borderRadius: r - bez, overflow: 'hidden' }}>
        <Image source={src} style={{ width: iw, height: ih }} resizeMode="cover" accessibilityIgnoresInvertColors />
        <Animated.View pointerEvents="none" style={{ position: 'absolute', top: -ih * 0.2, bottom: -ih * 0.2, width: iw * 0.4, backgroundColor: '#FFFFFF1F', transform: [{ translateX: f.interpolate({ inputRange: [0, 1], outputRange: [-iw * 0.6, iw * 1.3] }) }, { rotate: '18deg' }] }} />
      </View>
    </Animated.View>
  );
}
const MiniPhone = ({ w, children }: any) => (
  <View style={{ width: w, height: w * 1.12, borderRadius: 26, padding: 12, backgroundColor: '#FFFFFFF2', boxShadow: '0px 18px 40px rgba(4, 20, 50, 0.35)', overflow: 'hidden', gap: 8 }}>{children}</View>
);
const MBar = ({ w, c = '#E3E9F1', h = 10 }: any) => <View style={{ width: w, height: h, borderRadius: h / 2, backgroundColor: c }} />;
/** Dedo que toca: aparece, pulsa (se encoge y deja una onda) y se va. */
const Tap = ({ x, y, v }: any) => (
  <Animated.View pointerEvents="none" style={{ position: 'absolute', left: x, top: y, opacity: v.interpolate({ inputRange: [0, 0.35, 0.5, 0.75, 1], outputRange: [0, 1, 1, 0.9, 0] }), transform: [{ scale: v.interpolate({ inputRange: [0, 0.4, 0.5, 0.6, 1], outputRange: [1.2, 1, 0.82, 1, 1] }) }] }}>
    <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#FFFFFFCC', borderWidth: 3, borderColor: '#1565C0AA' }} />
  </Animated.View>
);
/** Aviso de comida que baja desde arriba (como el de Android) encima de la pantalla real, a mitad de la escena. */
function NotifBanner({ name, v }: { name: string; v: any }) {
  const a = v.interpolate(keys([[0, 0], [0.3, 0], [0.42, 1], [1, 1]]));   // baja y se queda
  return (
    <Animated.View style={{ position: 'absolute', left: 14, right: 14, top: 40, flexDirection: 'row', gap: 12, alignItems: 'center', padding: 14, borderRadius: 22, backgroundColor: '#FFFFFF', boxShadow: '0px 12px 30px rgba(10, 30, 60, 0.3)', opacity: a, transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [-120, 0] }) }] } as any}>
      <MealArt ids={[]} name={name} size={54} />
      <View style={{ flex: 1, gap: 3 }}><Tx s={15} w="800" c="#0B1524">Comida · {name}</Tx><Tx s={13} w="600" c="#5A6678">Lo tienes todo en casa · 12 min</Tx></View>
    </Animated.View>
  );
}
const DEMO_DISHES = ['Tostada con tomate y aguacate', 'Bowl de pollo y arroz', 'Batido de plátano y avena', 'Yogur con fruta y nueces', 'Macarrones con tomate y queso', 'Tostada con huevo y espinacas'];
function Demo({ kind, art, accent }: { kind: string; art: number; accent: string }) {
  const { motion } = useC(); const v = useRef(new Animated.Value(0)).current, w = art * 1.15;
  useEffect(() => loopAnim(v, kind === 'breathe' ? 4200 : 2600, motion, 900), [kind, motion]);
  const step = (a: number, b: number) => v.interpolate({ inputRange: [0, a, b, 1], outputRange: [0, 0, 1, 1], extrapolate: 'clamp' });
  if (kind === 'week') {
    // La semana se rellena sola, plato a plato.
    return (
      <MiniPhone w={w}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>{['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d, i) => <View key={i} style={{ width: w / 9, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: i === 2 ? accent : '#EEF2F7' }}><Tx s={11} w="800" c={i === 2 ? '#FFFFFF' : '#5A6678'}>{d}</Tx></View>)}</View>
        {DEMO_DISHES.slice(0, 4).map((n, i) => (
          <Animated.View key={n} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 6, borderRadius: 12, backgroundColor: '#F5F7FA', opacity: step(i * 0.15, i * 0.15 + 0.15), transform: [{ translateX: step(i * 0.15, i * 0.15 + 0.15).interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }] }}>
            <MealArt ids={[]} name={n} size={w * 0.17} /><View style={{ gap: 5, flex: 1 }}><MBar w="80%" c="#C9D3E0" /><MBar w="50%" /></View>
          </Animated.View>
        ))}
      </MiniPhone>
    );
  }
  if (kind === 'now') {
    // «Algo más fácil»: un toque y el plato cambia por uno más rápido.
    const a = step(0.45, 0.6);
    return (
      <MiniPhone w={w}>
        <View style={{ borderRadius: 18, padding: 12, gap: 8, backgroundColor: accent, overflow: 'hidden' }}>
          <MBar w="45%" c="#FFFFFF88" h={8} />
          <View style={{ height: w * 0.42, alignItems: 'center', justifyContent: 'center' }}>
            <Animated.View style={{ position: 'absolute', opacity: a.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }), transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [1, 0.8] }) }] }}><MealArt ids={[]} name={DEMO_DISHES[4]} size={w * 0.42} /></Animated.View>
            <Animated.View style={{ position: 'absolute', opacity: a, transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [1.15, 1] }) }] }}><MealArt ids={[]} name={DEMO_DISHES[3]} size={w * 0.42} /></Animated.View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}><View style={{ flex: 1, height: 30, borderRadius: 10, backgroundColor: '#FFFFFF' }} /><View style={{ flex: 1, height: 30, borderRadius: 10, backgroundColor: '#FFFFFF33', borderWidth: 1, borderColor: '#FFFFFF66', alignItems: 'center', justifyContent: 'center' }}><Tx s={10} w="800" c="#FFFFFF">Más fácil</Tx></View></View>
        </View>
        <MBar w="70%" /><MBar w="55%" />
        <Tap x={w * 0.62} y={w * 0.58} v={step(0.25, 0.6)} />
      </MiniPhone>
    );
  }
  if (kind === 'shop') {
    // La lista se va marcando y la barra se llena.
    const items = ['Avena', 'Plátanos', 'Leche', 'Yogur griego'];
    return (
      <MiniPhone w={w}>
        <Tx s={13} w="800" c="#0B1524">Lista de la compra</Tx>
        <View style={{ height: 8, borderRadius: 4, backgroundColor: '#EEF2F7', overflow: 'hidden' }}><Animated.View style={{ height: 8, width: '100%', backgroundColor: '#1FA67A', transform: [{ scaleX: step(0.05, 0.85) }], transformOrigin: 'left' } as any} /></View>
        {items.map((n, i) => { const on = step(0.1 + i * 0.18, 0.2 + i * 0.18); return (
          <View key={n} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 5 }}>
            <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#B8C4D3', alignItems: 'center', justifyContent: 'center' }}>
              <Animated.View style={{ position: 'absolute', width: 22, height: 22, borderRadius: 11, backgroundColor: '#1FA67A', alignItems: 'center', justifyContent: 'center', opacity: on, transform: [{ scale: on.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }] }}><Icon n="check" size={13} color="#FFFFFF" w={3} /></Animated.View>
            </View>
            <Animated.View style={{ flex: 1, opacity: on.interpolate({ inputRange: [0, 1], outputRange: [1, 0.45] }) }}><Tx s={13} w="700" c="#2A3546">{n}</Tx></Animated.View>
            <MBar w={34} />
          </View>); })}
      </MiniPhone>
    );
  }
  if (kind === 'notif') {
    // Un aviso que baja desde arriba a la hora de comer.
    const d = step(0.05, 0.3), up = step(0.8, 0.98);
    return (
      <MiniPhone w={w}>
        <Tx s={30} serif c="#0B1524" style={{ textAlign: 'center', marginTop: w * 0.12 }}>14:00</Tx>
        <Tx s={11} w="700" c="#5A6678" style={{ textAlign: 'center' }}>miércoles</Tx>
        <Animated.View style={{ position: 'absolute', left: 10, right: 10, top: 10, flexDirection: 'row', gap: 8, alignItems: 'center', padding: 10, borderRadius: 16, backgroundColor: '#FFFFFF', boxShadow: '0px 8px 20px rgba(10, 30, 60, 0.22)', opacity: Animated.subtract(d, up), transform: [{ translateY: d.interpolate({ inputRange: [0, 1], outputRange: [-60, 0] }) }] } as any}>
          <MealArt ids={[]} name={DEMO_DISHES[1]} size={36} />
          <View style={{ flex: 1, gap: 2 }}><Tx s={11} w="800" c="#0B1524">Comida · Bowl de pollo y arroz</Tx><Tx s={10} w="600" c="#5A6678">Lo tienes todo en casa. 12 min</Tx></View>
        </Animated.View>
      </MiniPhone>
    );
  }
  if (kind === 'sync') {
    // Un punto viaja entre el móvil y la tablet: todo sincronizado.
    const x = v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 0] });
    return (
      <View style={{ width: w * 1.2, height: w * 0.9, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <View style={{ width: w * 0.42, height: w * 0.78, borderRadius: 18, backgroundColor: '#FFFFFFF2', padding: 8, gap: 6 }}><MealArt ids={[]} name={DEMO_DISHES[5]} size={w * 0.26} /><MBar w="80%" /><MBar w="60%" /></View>
        <View style={{ width: w * 0.62, height: w * 0.5, borderRadius: 16, backgroundColor: '#FFFFFFF2', padding: 8, flexDirection: 'row', gap: 6 }}><MealArt ids={[]} name={DEMO_DISHES[5]} size={w * 0.26} /><View style={{ flex: 1, gap: 6 }}><MBar w="90%" /><MBar w="60%" /></View></View>
        <Animated.View style={{ position: 'absolute', top: w * 0.12, left: w * 0.3, width: 16, height: 16, borderRadius: 8, backgroundColor: '#FFFFFF', boxShadow: '0px 0px 14px rgba(255,255,255,0.9)', transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [0, w * 0.55] }) }, { translateY: x.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -24, 0] }) }] } as any} />
      </View>
    );
  }
  if (kind === 'breathe') {
    // Respira: el círculo crece (inspira) y se encoge (espira).
    const b = v.interpolate({ inputRange: [0, 0.45, 0.55, 1], outputRange: [0.62, 1, 1, 0.62] });
    return (
      <View style={{ width: art * 1.2, height: art * 1.2, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={{ position: 'absolute', width: art * 1.1, height: art * 1.1, borderRadius: art, backgroundColor: '#FFFFFF22', transform: [{ scale: b }] }} />
        <Animated.View style={{ position: 'absolute', width: art * 0.8, height: art * 0.8, borderRadius: art, backgroundColor: '#FFFFFF33', transform: [{ scale: b }] }} />
        <MealArt ids={[]} name="Infusión de manzanilla con limón" size={art * 0.62} />
      </View>
    );
  }
  // Bienvenida: tres platos que flotan en órbita alrededor del principal.
  const r = (i: number) => v.interpolate({ inputRange: [0, 1], outputRange: [`${i * 120}deg`, `${i * 120 + 360}deg`] });
  return (
    <View style={{ width: art * 1.25, height: art * 1.25, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', width: art * 1.2, height: art * 1.2, borderRadius: art, borderWidth: 1, borderColor: '#FFFFFF33' }} />
      {[1, 2, 3].map((i) => (
        <Animated.View key={i} style={{ position: 'absolute', width: art * 1.2, height: art * 1.2, transform: [{ rotate: r(i) }] }}>
          <Animated.View style={{ position: 'absolute', top: -art * 0.12, left: art * 0.48, transform: [{ rotate: v.interpolate({ inputRange: [0, 1], outputRange: [`${-i * 120}deg`, `${-i * 120 - 360}deg`] }) }] }}><MealArt ids={[]} name={DEMO_DISHES[i]} size={art * 0.3} /></Animated.View>
        </Animated.View>
      ))}
      <Float><MealArt ids={[]} name={DEMO_DISHES[0]} size={art * 0.78} /></Float>
    </View>
  );
}

/**
 * Fotogramas clave con curva suave: entre cada par se muestrea una «smoothstep» (el motor nativo solo interpola en
 * línea recta, así se consigue el «acelerar y frenar» sin pasar por JavaScript en cada fotograma).
 */
function keys(k: [number, number][]) {
  const inputRange: number[] = [], outputRange: number[] = [];
  k.forEach(([t, v], n) => {
    if (n === 0) { inputRange.push(t); outputRange.push(v); return; }
    const [t0, v0] = k[n - 1];
    for (let s = 1; s <= 6; s++) { const u = s / 6; inputRange.push(t0 + (t - t0) * u); outputRange.push(v0 + (v - v0) * u * u * (3 - 2 * u)); }
  });
  return { inputRange, outputRange };
}

/**
 * La pantalla de verdad de la app (la misma que verás al usarla), en un móvil en miniatura. Cuando es el paso que ves,
 * hace una escena de unos 6,5 s y se queda quieta al final (no se repite):
 *   1. la pantalla se desliza hasta el botón importante (que se busca solo, ver DemoCtx) y la «cámara» se acerca;
 *   2. un dedo entra desde abajo, se posa en el botón, lo pulsa y sale una onda;
 *   3. la pantalla cambia de verdad (el plato se cambia, la compra se marca, se abre la receta…), la cámara se aleja
 *      y debajo aparece un consejo corto con lo que acaba de pasar.
 * Todo sale de un solo valor animado en el motor nativo; cada pantalla se pinta una sola vez.
 * `target`: la acción del botón que se toca (["Easy", 2]…). `after`: [pantalla después, su barra, hoja que se abre
 * encima, hasta dónde está deslizada (-1 = igual que antes)]. `pan`/`from`: deslizamiento si no hay botón.
 */
const NOOP = () => {};
const SCENE = 6500, STEP = 9500;   // la escena dura 6,5 s; el paso pasa solo a los 9,5 s (o antes, si tocas «Siguiente»)
type After = [string, string, string, number] | [];
const LivePreview = React.memo(function LivePreview({ screen, bar, pan: pan0, from: from0 = 0, frame, asp, notif, target, after = [], tip, active }: { screen: string; bar: string; pan: number; from?: number; frame: number; asp: number; notif?: string; target?: any[]; after?: After; tip?: string; active: boolean }) {
  // La pantalla en miniatura es la de tu dispositivo (mismo ancho y la misma proporción, ver Intro → asp) reducida a
  // «frame» px de ancho: en una tablet se ve la app de tablet, en vertical o en horizontal.
  const ctx = useC(), { motion, t } = ctx; const { width } = useWindowDimensions(), W = width, s = frame / W, H = W * asp, FH = frame * asp;
  // Dentro del móvil en miniatura: sin animaciones propias y con el alto de su pantalla (para que las hojas quepan).
  const still = useMemo(() => ({ ...ctx, motion: false, winH: H, t: { ...t, shadow: undefined as any } }), [ctx, H]);
  // Dónde está el botón (en px de la pantalla real); se mide al montar, aunque el paso aún no se vea.
  const [spot, setSpot] = useState<{ x: number; y: number; w: number; h: number } | null>(null), [late, setLate] = useState(false);
  const root = useRef<any>(null);
  const demo = useMemo<Demo | null>(() => (target?.length ? {
    key: JSON.stringify(target),
    found: (node: any) => node?.measureInWindow?.((x: number, y: number, w: number, h: number) => root.current?.measureInWindow?.((rx: number, ry: number, rw: number) => {
      const k = rw / W || 1; if (w > 0) setSpot({ x: (x - rx) / k, y: (y - ry) / k, w: w / k, h: h / k });
    })),
  } : null), [JSON.stringify(target), W]);
  useEffect(() => { const id = setTimeout(() => setLate(true), 600); return () => clearTimeout(id); }, []);
  // Deslizamiento: que el botón quede un poco por encima del centro. Si hay mucho recorrido, se empieza más arriba.
  const pan = spot ? Math.max(0, Math.round(spot.y + spot.h / 2 - H * 0.42)) : pan0;
  const from = spot ? (pan > H ? Math.round(pan - H * 0.75) : 0) : from0;
  const [aScr = '', aBar = '', aSheet = '', aPan0 = -1] = after, aPan = aPan0 < 0 ? pan : aPan0, tall = Math.max(H + 200, pan + H + 400, 2400);
  const fx = spot ? spot.x + spot.w / 2 : W / 2, fy = spot ? spot.y + spot.h / 2 : 0, tap = !!spot;
  const ready = !demo || !!spot || late;
  const v = useRef(new Animated.Value(motion ? 0 : 1)).current;
  // Las hojas (receta, respiración) se montan al llegar el cambio: así su temporizador o su respiración empiezan
  // justo cuando se ven, y no antes.
  const liveSheet = !!after[2], [live, setLive] = useState(false);
  useEffect(() => {
    if (!active || !ready) { setLive(false); return; }
    if (!motion) { v.setValue(1); setLive(true); return; }
    v.setValue(0);
    const lt = setTimeout(() => setLive(true), SCENE * 0.5);
    const a = Animated.timing(v, { toValue: 1, duration: SCENE, easing: Easing.linear, useNativeDriver: true }); a.start();
    // El toque suena como en la app (si tienes los sonidos activados): cada acción con su sonido.
    const son = notif ? 'elige' : ({ Easy: 'cambio', Check: 'marca', Open: 'hoja', Jump: 'nav', Export: 'toggle' } as Record<string, string>)[target?.[0]] || 'tap';
    const id = setTimeout(() => ctx.sound?.(son), SCENE * (notif ? 0.36 : tap ? 0.5 : 0.42));
    return () => { a.stop(); clearTimeout(id); clearTimeout(lt); };
  }, [active, motion, ready]);
  // Cámara: se desliza (0–35 %), se acerca al botón (25–48 %) y, cuando cambia la pantalla, se aleja (62–80 %).
  const y = v.interpolate(keys([[0, -from], [0.06, -from], [0.35, -pan], [1, -pan]]));
  const zoom = v.interpolate(keys([[0, 1], [0.22, 1], [0.44, tap ? 1.1 : 1.03], [0.6, tap ? 1.1 : 1.03], [0.8, 1], [1, 1]]));
  const t0 = tap ? 0.56 : 0.42, ch = v.interpolate({ inputRange: [0, t0, t0 + 0.12, 1], outputRange: [0, 0, 1, 1] });
  const tipA = v.interpolate({ inputRange: [0, t0 + 0.12, t0 + 0.24, 1], outputRange: [0, 0, 1, 1] });
  // Escalar alrededor del botón: llevar el botón al centro, escalar y devolverlo (sin transformOrigin).
  const ox = fx - W / 2, oy = Math.max(0, Math.min(H, fy - pan)) - H / 2;
  // Se pintan una vez: al pasar a ser el paso actual («active») no se vuelven a pintar.
  const scr = useMemo(() => <Renderer response={screen} library={library} onAction={NOOP} />, [screen, still]);
  const nav = useMemo(() => <Renderer response={bar} library={library} onAction={NOOP} />, [bar, still]);
  const scr2 = useMemo(() => (aScr ? <Renderer response={aScr} library={library} onAction={NOOP} /> : null), [aScr, still]);
  const nav2 = useMemo(() => (aBar && aBar !== bar ? <Renderer response={aBar} library={library} onAction={NOOP} /> : null), [aBar, bar, still]);
  const sheetCtx = useMemo(() => ({ ...still, sheetShift: v.interpolate(keys([[0, 0], [0.72, 0], [0.94, 1], [1, 1]])) }), [still]);
  const sh2 = useMemo(() => (aSheet && (!liveSheet || live) ? <AppCtx.Provider value={sheetCtx}><Renderer response={aSheet} library={library} onAction={NOOP} /></AppCtx.Provider> : null), [aSheet, sheetCtx, live]);
  return (
    <View pointerEvents="none" style={{ alignItems: 'center', gap: 14 }}>
      <View style={{ width: frame, height: FH, borderRadius: 26, overflow: 'hidden', borderWidth: 4, borderColor: t.dark ? '#2A3A4E' : '#FFFFFF', backgroundColor: t.bg, boxShadow: t.dark ? '0px 18px 40px rgba(0, 0, 0, 0.55)' : '0px 18px 40px rgba(20, 50, 90, 0.22)' }}>
        <View style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transform: [{ translateX: -(W - frame) / 2 }, { translateY: -(H - FH) / 2 }, { scale: s }] }}>
          <AppCtx.Provider value={still}>
            <DemoCtx.Provider value={demo}>
              <View style={[StyleSheet.absoluteFill, { backgroundColor: t.bg }]} />
              <Animated.View style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transform: [{ translateX: ox }, { translateY: oy }, { scale: zoom }, { translateX: -ox }, { translateY: -oy }] }}>
                <Animated.View ref={root} collapsable={false} style={{ position: 'absolute', left: 0, right: 0, top: 0, height: tall, transform: [{ translateY: y }] }}>{scr}</Animated.View>
                {/* La misma pantalla después del toque (se funde encima) */}
                {scr2 ? <Animated.View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: tall, backgroundColor: t.bg, opacity: ch, transform: [{ translateY: -aPan }] }}>{scr2}</Animated.View> : null}
                {tap ? <Animated.View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: tall, transform: [{ translateY: y }] }}><Finger x={fx} y={fy} W={W} H={H} v={v} /></Animated.View> : null}
              </Animated.View>
            </DemoCtx.Provider>
            <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 120 }}>{nav}</View>
            {nav2 ? <Animated.View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 120, opacity: ch }}>{nav2}</Animated.View> : null}
            {/* Hoja que se abre encima (receta, respiración…) */}
            {sh2 ? <Animated.View style={[StyleSheet.absoluteFill, { opacity: ch, transform: [{ translateY: ch.interpolate({ inputRange: [0, 1], outputRange: [H * 0.3, 0] }) }] }]}>{sh2}</Animated.View> : null}
          </AppCtx.Provider>
          {notif ? <NotifBanner name={notif} v={v} /> : null}
        </View>
      </View>
      {/* Consejo: lo que acaba de pasar, en una frase */}
      <Animated.View style={{ minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 17, backgroundColor: tip ? t.acSoft : 'transparent', opacity: tipA, transform: [{ translateY: tipA.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }, { scale: tipA.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }] }}>
        {tip ? <><Icon n="check" size={15} color={t.ac} w={2.6} /><Tx s={14} w="800" c={t.ac}>{tip}</Tx></> : null}
      </Animated.View>
    </View>
  );
});
/**
 * Dedo: entra desde abajo a la derecha (28–46 %), se posa sobre el botón, lo pulsa (50 %) con una onda y se va
 * hacia abajo (60–72 %). x, y: centro del botón en px de la pantalla real.
 */
function Finger({ x, y, W, H, v }: { x: number; y: number; W: number; H: number; v: any }) {
  const dx = Math.min(W * 0.3, W - x + 40), dy = H * 0.45;
  const op = v.interpolate({ inputRange: [0, 0.28, 0.36, 0.62, 0.72, 1], outputRange: [0, 0, 1, 1, 0, 0] });
  const mx = v.interpolate(keys([[0, dx], [0.28, dx], [0.46, 0], [0.6, 0], [0.72, dx * 0.6], [1, dx * 0.6]]));
  const my = v.interpolate(keys([[0, dy], [0.28, dy], [0.46, 0], [0.6, 0], [0.72, dy * 0.7], [1, dy * 0.7]]));
  const sc = v.interpolate({ inputRange: [0, 0.46, 0.5, 0.53, 0.57, 1], outputRange: [1.1, 1.1, 0.8, 0.8, 1, 1] });
  const ro = v.interpolate({ inputRange: [0, 0.5, 0.51, 0.66, 1], outputRange: [0, 0, 0.5, 0, 0] });
  const rs = v.interpolate({ inputRange: [0, 0.5, 0.66, 1], outputRange: [0.4, 0.4, 2.8, 2.8] });
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: x - 30, top: y - 30, width: 60, height: 60, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{ position: 'absolute', width: 60, height: 60, borderRadius: 30, backgroundColor: '#FFFFFF', opacity: ro, transform: [{ scale: rs }] }} />
      <Animated.View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: '#FFFFFFD9', borderWidth: 3, borderColor: '#1565C0B3', boxShadow: '0px 8px 18px rgba(10, 30, 60, 0.35)', opacity: op, transform: [{ translateX: mx }, { translateY: my }, { scale: sc }] }} />
    </View>
  );
}

/** Un paso de la presentación (los de al lado se preparan antes, para que el cambio sea instantáneo y fluido). */
type Pg = { page: number; title: string; text: string; demo: string; screen: string; bar: string; pan: number; from: number; target: any[]; extras: any[]; after: After; tip: string };
const toPg = (a: any[]): Pg => ({ page: a[0], title: a[1], text: a[2], demo: a[3], screen: a[4], bar: a[5], pan: a[6], from: a[7], target: a[8] || [], extras: a[9] || [], after: a[10] || [], tip: a[11] || '' });

/**
 * Presentación tipo «historias»: barras de progreso arriba, cada paso es una demostración animada, avanza sola a los
 * pocos segundos (menos en los pasos con botones) y se puede deslizar, tocar «Atrás», «Siguiente» o «Saltar».
 * Los pasos anterior y siguiente ya están montados (invisibles): al cambiar, uno se desliza y se funde mientras el otro
 * entra, todo en el motor nativo, sin esperar a pintar nada. Los nuevos vecinos se montan después, cuando la
 * transición ya ha terminado (así el cambio nunca espera a que se pinte una pantalla).
 */
const Intro = D('Intro', 'Presentación inicial', { page: z.number(), total: z.number(), title: z.string(), text: z.string(), ids: z.array(z.string()), next: A(), skip: A(), label: z.string(), name: z.string().optional(), slot: z.number().optional(), extras: z.array(z.any()), back: A(), demo: z.string().optional(), screen: z.string().optional(), bar: z.string().optional(), pan: z.number().optional(), from: z.number().optional(), pv: z.array(z.any()) }, ({ props }) => {
  const { t, insetTop, insetBottom, motion } = useC(); const { width, height } = useWindowDimensions(), art = Math.min(230, width * 0.56);
  const act = useContext(ActionCtx), page = props.page, ctxI = useC(), calm = useMemo(() => ({ ...ctxI, motion: false }), [ctxI]);
  const bg = useRef(new Animated.Value(motion ? 0 : 1)).current, prog = useRef(new Animated.Value(0)).current, float = useRef(new Animated.Value(0)).current;
  // El paso de tus datos no avanza solo (estarías escribiendo).
  const auto = !props.extras?.length && props.demo !== 'perfil' && page < props.total - 1, held = useRef(false);
  const pages: Pg[] = props.pv?.length ? props.pv.map(toPg) : [toPg([page, props.title, props.text, props.demo || 'dishes', props.screen || '', props.bar || '', props.pan || 0, props.from || 0, [], props.extras, [], ''])];
  // Opacidad (y con ella el movimiento) de cada paso; se crea una vez por paso.
  const ops = useRef(new Map<number, any>()).current;
  const op = (p: number) => { let v = ops.get(p); if (!v) { v = new Animated.Value(p === page && !motion ? 1 : 0); ops.set(p, v); } return v; };
  const seen = useRef(new Map<number, Pg>()).current; pages.forEach((p) => seen.set(p.page, p));
  const prev = useRef(page), dir = useRef(1), [leaving, setLeaving] = useState<number | null>(null);
  // Pasos montados: al principio solo el actual; los de al lado, en cuanto la app está tranquila.
  const [mounted, setMounted] = useState<number[]>([page]), [moving, setMoving] = useState(false);
  useEffect(() => {
    if (moving) return;
    const id = setTimeout(() => setMounted([page - 1, page, page + 1]), 350);
    return () => clearTimeout(id);
  }, [page, moving]);
  useEffect(() => {
    if (!motion) { op(page).setValue(1); return; }
    Animated.timing(bg, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    Animated.timing(op(page), { toValue: 1, duration: 700, delay: 120, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    const l = Animated.loop(Animated.timing(float, { toValue: 1, duration: 6000, easing: Easing.linear, useNativeDriver: true })); l.start(); return () => l.stop();
  }, []);
  useEffect(() => {
    const was = prev.current;
    if (was !== page) {
      dir.current = page > was ? 1 : -1; prev.current = page; setLeaving(was); setMoving(true);
      if (!mounted.includes(page)) setMounted((m) => [...m, page]);
      if (motion) Animated.parallel([
        Animated.timing(op(was), { toValue: 0, duration: 380, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
        Animated.timing(op(page), { toValue: 1, duration: 560, delay: 40, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start(() => { setLeaving((x) => (x === was ? null : x)); setMoving(false); });
      else { op(was).setValue(0); op(page).setValue(1); setLeaving(null); setMoving(false); }
    }
    // Avance automático (como las historias); si tocas o deslizas, manda lo que hagas tú.
    prog.setValue(0);
    if (!auto) { prog.setValue(1); return; }
    // La barra se mueve con el motor nativo (fluida aunque la app esté ocupada) y el paso cambia con un temporizador.
    const anim = Animated.timing(prog, { toValue: 1, duration: STEP, easing: Easing.linear, useNativeDriver: true });
    anim.start(); const id = setTimeout(() => { if (!held.current) act(props.next); }, STEP);
    return () => { anim.stop(); clearTimeout(id); };
  }, [page]);
  const pan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 20 && Math.abs(g.dx) > Math.abs(g.dy) * 2,
    onPanResponderRelease: (_, g) => { if (g.dx < -60) act(props.next); else if (g.dx > 60 && props.back) act(props.back); },
  }), [page]);
  // Tamaño del móvil en miniatura: lo más grande posible dejando sitio al título, el texto, el consejo y los botones
  // (se mide el hueco real, así cabe también en móviles pequeños o con letra grande).
  // La miniatura copia la proporción de tu pantalla (alto / ancho). En móviles muy alargados se recorta a 1,6 para que
  // no quede demasiado pequeña. En horizontal (tablet o móvil girado), la miniatura va a la izquierda y el texto a la derecha.
  const [midH, setMidH] = useState(0), reserve = 250 * t.fs + 24;
  const asp = Math.max(0.56, Math.min(1.6, height / width)), land = width > height * 1.1 && width >= 640;
  const c = SLOT[props.slot ?? page % 6];
  const mid = midH || height - insetTop - insetBottom - 150;
  const frameOf = (pg: Pg) => {
    const extra = pg.extras.length ? 66 * Math.ceil(pg.extras.length / (width > 380 ? 2 : 1)) : 0;
    if (land) return Math.max(200, Math.min(width * 0.56, (mid - 56) / asp));          // 56: el consejo de debajo
    return Math.max(140, Math.min(width * 0.8, (mid - reserve - extra) / asp));
  };
  const keep = new Set([...mounted, page, ...(leaving != null ? [leaving] : [])]);
  const layers = [...keep].map((p) => seen.get(p)).filter((p): p is Pg => !!p);
  const fy = float.interpolate(keys([[0, 0], [0.5, -4], [1, 0]]));
  return (
    <Animated.View {...pan.panHandlers} style={{ flex: 1, backgroundColor: t.bg, opacity: bg, paddingTop: insetTop + 12, paddingBottom: insetBottom + 22, paddingHorizontal: 22, overflow: 'hidden' }}>
      {/* Mismo fondo que la app: sigue el tema (claro u oscuro) y el color de acento que tengas. */}
      <AppCtx.Provider value={calm}><Backdrop /></AppCtx.Provider>
      <Glow c={c} size={Math.max(width, height) * 0.7} x={width * 0.85} y={height * 0.2} o={t.blob * 0.6} drift={0} />
      {/* Progreso por pasos (el actual se llena mientras lo ves). */}
      <View style={{ flexDirection: 'row', gap: 5, marginBottom: 6 }}>
        {Array.from({ length: props.total }, (_, i) => (
          <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: t.ac + '33', overflow: 'hidden' }}>
            {i < page ? <View style={{ flex: 1, backgroundColor: t.ac }} /> : i === page ? <Animated.View style={{ height: 4, width: '100%', backgroundColor: t.ac, transformOrigin: 'left', transform: [{ scaleX: prog }] } as any} /> : null}
          </View>
        ))}
      </View>
      {/* Arriba: «Atrás» (desde el segundo paso) a la izquierda y «Saltar» a la derecha. */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 38 }}>
        {props.back ? <Press a={props.back} label="Paso anterior" style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 8 }}><Icon n="left" size={18} color={t.mu} w={2.4} /><Tx s={15} w="700" c={t.mu}>Atrás</Tx></Press> : <View />}
        {page < props.total - 1 ? <Press a={props.skip} style={{ paddingHorizontal: 14, paddingVertical: 8 }}><Tx s={15} w="700" c={t.mu}>Saltar</Tx></Press> : <View />}
      </View>
      <View style={{ flex: 1 }} onLayout={(e) => { const h = e.nativeEvent.layout.height; if (Math.abs(h - midH) > 4) setMidH(h); }}>
        {layers.sort((a, b) => a.page - b.page).map((pg) => {
          const v = op(pg.page), cur = pg.page === page, side = pg.page < page ? -1 : pg.page > page ? 1 : dir.current;
          return (
            <Animated.View key={pg.page} pointerEvents={cur ? 'box-none' : 'none'} renderToHardwareTextureAndroid={moving} style={[StyleSheet.absoluteFill, { flexDirection: land ? 'row' : 'column', alignItems: 'center', justifyContent: 'center', gap: land ? 40 : 26, opacity: v }]}>
              <Animated.View style={{ transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [side * 56, 0] }) }, { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.93, 1] }) }, { translateY: fy }] }}>
                {pg.demo === 'perfil' ? <View style={{ width: Math.min(width - 44, 520) }}><Renderer response={pg.screen} library={library} onAction={(e: any) => ctxI.dispatch({ type: e.type, params: e.params })} /></View>
                  : pg.screen ? <LivePreview screen={pg.screen} bar={pg.bar} pan={pg.pan} from={pg.from} frame={frameOf(pg)} asp={asp} notif={pg.demo === 'notif' ? DEMO_DISHES[1] : undefined} target={pg.target.length ? pg.target : undefined} after={pg.after} tip={pg.tip} active={cur} />
                  : SHOT[pg.demo] ? <Shot src={SHOT[pg.demo]} w={Math.min(Math.round(frameOf(pg) * 0.9), Math.floor((mid - 48) / 2.1))} />
                  : <Demo kind={pg.demo || 'dishes'} art={art} accent={t.g1} />}
              </Animated.View>
              <Animated.View style={{ opacity: v.interpolate({ inputRange: [0, 0.45, 1], outputRange: [0, 0, 1] }), transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [side * 28, 0] }) }, { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }], gap: 12, maxWidth: 560, width: land ? Math.min(460, width - 44 - 40 - frameOf(pg)) : '100%' }}>
                {pg.demo === 'sync' ? <PlusTag label="Con Nevú Plus" /> : null}
                <Tx s={30} serif c={t.ink} style={{ textAlign: 'center', letterSpacing: -0.6, lineHeight: 36 * t.fs }}>{pg.title}</Tx>
                <Tx s={16} w="600" c={t.mu} style={{ textAlign: 'center', lineHeight: 24 * t.fs }}>{pg.text}</Tx>
                {pg.extras?.length ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 8 }}>
                    {pg.extras.map(([l, ac, done, ic]: [string, any, boolean, string], i: number) => (
                      <Press key={i} a={done ? null : ac} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, borderRadius: 14, paddingHorizontal: 16, backgroundColor: done ? t.acSoft : t.glass, borderWidth: 1, borderColor: done ? t.ac : t.glassLn }}>
                        <Icon n={done ? 'check' : ic || 'info'} size={16} color={t.ac} w={2.4} />
                        <Tx s={14} w="800" c={done ? t.ac : t.ink}>{l}</Tx>
                      </Press>
                    ))}
                  </View>
                ) : null}
              </Animated.View>
            </Animated.View>
          );
        })}
      </View>
      <View style={{ alignItems: 'center' }}>
        <Press a={props.next} style={{ minHeight: 56, minWidth: 230, borderRadius: 16, overflow: 'hidden', backgroundColor: t.g1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30, boxShadow: t.shadow }}><Grad r={16} a={t.g1} b={t.g2} dir="h" /><Tx s={17} w="800" c="#FFFFFF">{props.label}</Tx></Press>
      </View>
    </Animated.View>
  );
});

/* ---------- acciones y Renderer nativo ---------- */
const act = (name: string, params: any) => ({ name, keys: Object.keys(params) });
const V = 1;
export const actions = [
  act('Go', { tab: V }), act('Day', { i: V }), act('Open', { kind: V, k: V, from: V }), act('Close', {}),
  act('Choose', { k: V, j: V }), act('Unlock', { k: V }), act('Lock', { k: V }), act('News', { open: V }), act('Wipe', { cloud: V }), act('Restore', { k: V }), act('Veto', { v: V }), act('Easy', { k: V }), act('OpenTimer', {}), act('Portion', { k: V }), act('Apply', { k: V, j: V, f: V, i: V }),
  act('Week', { d: V }), act('Today', {}), act('Month', { d: V }), act('Pin', {}), act('Gen', {}), act('Check', { id: V }),
  act('Cfg', { key: V, value: V }), act('Tips', { tab: V }), act('Draft', { k: V, c: V }), act('ThemeAdd', {}), act('ThemeDel', { i: V }), act('Prof', { key: V, value: V }), act('Export', { kind: V }), act('Jump', { date: V }),
  act('PanAdd', { id: V }), act('PanStep', { id: V, d: V }), act('PanOpen', { id: V }), act('PanDel', { id: V }), act('Cooked', { k: V }), act('Intro', { page: V }), act('Sub', { id: V, to: V }), act('BuyAll', {}), act('Rebuy', {}),
];


export const library = {
  components: Object.fromEntries([Screen, Stack, Cols, Head, Btn, Nudge, PlusCard, DayChip, Hero, Meal, Tip, Tile, Section, Label, Bars, Micro, Wd, Cell, ShopRow, IngRow, PantryRow, Pill, Swatch, Toggle, Guide, Step, Field, Note, Card, Empty, NavItem, Art, Chips, Chip, Cook, Timer, Intro, NowCard, SimpleRow, Calm, Breathe, Perm, Fridge, Zoom, Hint, News, Ver, Change].map((c) => [c.name, c])) as Record<string, ReturnType<typeof D>>,
  actions: Object.fromEntries(actions.map((a) => [a.name, a])),
};

function splitArgs(s: string): string[] {
  const out: string[] = []; let cur = '', depth = 0, inStr = false, esc = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (esc) { cur += ch; esc = false; continue; }
    if (ch === '\\' && inStr) { cur += ch; esc = true; continue; }
    if (ch === '"') { inStr = !inStr; cur += ch; continue; }
    if (!inStr) {
      if (ch === '[' || ch === '(') depth++;
      else if (ch === ']' || ch === ')') depth--;
      else if (ch === ',' && depth === 0) { out.push(cur.trim()); cur = ''; continue; }
    }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

/** Convierte el texto de una pantalla en nodos (se guarda: si el texto no cambia, no se vuelve a leer). */
function parseScreen(response: string, lib: typeof library) {
  const nodes: Record<string, { comp: string; args: any[] }> = {};
  const evalVal = (raw: string): any => {
    const t = raw.trim();
    if (!t) return undefined;
    if (t.startsWith('"') || t === 'true' || t === 'false' || t === 'null' || /^-?\d/.test(t)) {
      try { return JSON.parse(t); } catch {}
    }
    if (t.startsWith('[')) {
      const inner = t.slice(1, -1).trim();
      return inner ? splitArgs(inner).map(evalVal) : [];
    }
    if (t.startsWith('@')) {
      const m = t.match(/^@(\w+)\((.*)\)$/s);
      if (!m) return undefined;
      const def = lib.actions[m[1]], vals = splitArgs(m[2]).map(evalVal), params: any = {};
      def?.keys.forEach((k: string, i: number) => { params[k] = vals[i]; });
      return { type: m[1], params };
    }
    return t;
  };

  for (const line of response.split('\n')) {
    const m = line.trim().match(/^(\w+)\s*=\s*(\w+)\((.*)\)$/s);
    if (m) nodes[m[1]] = { comp: m[2], args: splitArgs(m[3]).map(evalVal) };
  }

  return nodes;
}

/** Pinta una pantalla. El texto solo se vuelve a leer si cambia (useMemo). */
export function Renderer({ response, library: lib, onAction }: { response: string; library: typeof library; onAction: (e: any) => void }) {
  const nodes = useMemo(() => (response ? parseScreen(response, lib) : {}), [response, lib]);
  if (!response) return null;
  const renderNode = (n: any): any => {
    if (Array.isArray(n)) return n.map((x, i) => <React.Fragment key={i}>{renderNode(x)}</React.Fragment>);
    const target = typeof n === 'string' ? nodes[n] : null;
    if (!target) return null;
    const def = lib.components[target.comp];
    if (!def) return null;
    const props: any = {};
    def.keys.forEach((k: string, i: number) => { if (target.args[i] !== undefined && target.args[i] !== null) props[k] = target.args[i]; });
    const Comp = def.component;
    return <Comp props={props} renderNode={renderNode} />;
  };

  return <ActionCtx.Provider value={onAction}>{renderNode('root')}</ActionCtx.Provider>;
}

import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, AppState, BackHandler, Easing, Image, PanResponder, Pressable, StyleSheet, Text, useColorScheme, useWindowDimensions, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppCtx, Backdrop, font, Grad, KeypadHost, library, Renderer } from './src/library';
import { body, intro, nav, sheet, UI } from './src/screens';
import { calendarEvents, cloudCopy, firstUI, handle, hasPlus, mergeState, mergeStates, PLUS_EXPORTS, reminders, sameCloud } from './src/controller';
import { CLOUD_BACKUP, CLOUD_FILE } from './src/config';
import { dishesOf, fridgeHtml, shopHtml } from './src/pdf';
import { DEFAULT, SLN, State, mask, monday, nut, parse, shop, ymd } from './src/logic';
import { makeTheme } from './src/theme';
import { Platform } from 'react-native';
import WebPCView from './src/web/WebPCView';
import * as P from './src/platform';

/**
 * Animación de arranque: solo cuando la app se abre de cero (no al volver desde segundo plano, porque entonces
 * la app sigue montada). Empieza igual que la pantalla de inicio de Android (mismo fondo e icono) y, cuando ya
 * están tus datos, el icono se acerca despacio mientras todo se funde con la app. Dura menos de medio segundo.
 */
export function Launch({ go, motion }: { go: boolean; motion: boolean }) {
  const dark = useColorScheme() === 'dark', [done, setDone] = useState(false);
  const out = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!go) return;
    Animated.timing(out, { toValue: 1, duration: motion ? 460 : 180, easing: Easing.bezier(0.4, 0, 0.2, 1), useNativeDriver: true }).start(() => setDone(true));
  }, [go]);
  if (done) return null;
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: dark ? '#0A1520' : '#1565C0', alignItems: 'center', justifyContent: 'center', opacity: out.interpolate({ inputRange: [0, 0.35, 1], outputRange: [1, 0.9, 0] }) }]}>
      <Animated.View style={{ opacity: out.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 0.4, 0] }), transform: [{ scale: out.interpolate({ inputRange: [0, 1], outputRange: [1, motion ? 1.28 : 1] }) }] }}>
        <Image source={require('./assets/splash-icon.png')} style={{ width: 200, height: 200 }} resizeMode="contain" />
      </Animated.View>
    </Animated.View>
  );
}

/**
 * Si algo falla al pintar una pantalla, en vez de cerrarse la app enseña un aviso con «Volver a intentar».
 * Tus datos no se tocan (están guardados en el móvil).
 */
class Safe extends React.Component<{ children: React.ReactNode }, { err: boolean }> {
  state = { err: false };
  static getDerivedStateFromError() { return { err: true }; }
  render() {
    if (!this.state.err) return this.props.children;
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16, backgroundColor: '#0A1520' }}>
        <Text allowFontScaling={false} style={{ color: '#FFFFFF', fontSize: 20, fontWeight: '800', textAlign: 'center' }}>Algo no ha ido bien</Text>
        <Text allowFontScaling={false} style={{ color: '#C9D6E6', fontSize: 15, textAlign: 'center' }}>Tus datos están a salvo. Vuelve a intentarlo.</Text>
        <Pressable accessibilityRole="button" onPress={() => this.setState({ err: false })} style={{ backgroundColor: '#1565C0', borderRadius: 14, paddingHorizontal: 22, paddingVertical: 12 }}>
          <Text allowFontScaling={false} style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700' }}>Volver a intentar</Text>
        </Pressable>
      </View>
    );
  }
}
export default function App(props: { onReady?: (h: { dispatch: (e: any) => void }) => void }) {
	if (Platform.OS === 'web') {
    return <WebPCView />;
  }
  return <SafeAreaProvider><Safe><Inner {...props} /></Safe></SafeAreaProvider>;
}

/** ¿Cumple el día sus objetivos? (calorías ±5 %, proteína y fibra). */
const dayOk = (st: State, w: string, i: number) => {
  const p = st.plans[w]; if (!p) return false;
  const n = nut(mask(st.set, p.sel[i]), p.q[i]);
  return Math.abs(n[0] - st.set.k) / st.set.k <= 0.05 && n[1] >= st.set.p && n[4] >= st.set.f;
};
const shopDone = (st: State, w: string) => { const p = st.plans[w]; if (!p) return false; const s = shop(p, st.set, st.conf, st.pantry, w); return s.all > 0 && s.done === s.all; };
const TAP = ['Day', 'Portion', 'Apply', 'PanStep', 'PanAdd', 'PanOpen', 'Prof', 'Unlock'];
const TABS = ['plan', 'mes', 'compra', 'desp', 'tu', 'aj', 'adv'];
const NOTIF_KEYS = ['notif', 'meals', 'exp'];

/** Contenido de una pestaña: entra deslizándose desde el lado hacia el que vas, con un fundido. */
function TabFade({ children, motion, dir }: { children: React.ReactNode; motion: boolean; dir: number }) {
  const a = useRef(new Animated.Value(motion ? 0 : 1)).current;
  useEffect(() => { if (motion) Animated.spring(a, { toValue: 1, damping: 22, stiffness: 190, mass: 0.9, useNativeDriver: true }).start(); }, []);
  return <Animated.View style={{ flex: 1, opacity: a, transform: [{ translateX: a.interpolate({ inputRange: [0, 1], outputRange: [28 * dir, 0] }) }, { scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.985, 1] }) }] }}>{children}</Animated.View>;
}

/**
 * Deslizar a izquierda o derecha en el menú cambia de día (más rápido que tocar arriba). Mientras arrastras, la
 * pantalla sigue un poco al dedo y vuelve con un muelle: da sensación de profundidad sin marear.
 */
function DaySwipe({ children, onSwipe, enabled, motion }: { children: React.ReactNode; onSwipe: (d: number) => void; enabled: boolean; motion: boolean }) {
  const x = useRef(new Animated.Value(0)).current, cb = useRef(onSwipe); cb.current = onSwipe;
  const back = () => Animated.spring(x, { toValue: 0, damping: 18, stiffness: 230, mass: 0.8, useNativeDriver: true }).start();
  const pan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => enabled && Math.abs(g.dx) > 18 && Math.abs(g.dx) > Math.abs(g.dy) * 2.2,
    onPanResponderMove: (_, g) => { if (motion) x.setValue(Math.max(-60, Math.min(60, g.dx * 0.3))); },
    onPanResponderRelease: (_, g) => { const d = g.dx < -64 || g.vx < -0.55 ? 1 : g.dx > 64 || g.vx > 0.55 ? -1 : 0; if (d) cb.current(d); back(); },
    onPanResponderTerminate: back,
  }), [enabled, motion]);
  return <Animated.View {...pan.panHandlers} style={{ flex: 1, transform: [{ translateX: x }] }}>{children}</Animated.View>;
}

/** Temporizador en marcha visible en cualquier pantalla: al tocarlo vuelves a la receta. */
function TimerPill({ end, t, bottom, onPress, fonts }: { end: number; t: any; bottom: number; onPress: () => void; fonts: boolean }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(id); }, []);
  const left = Math.max(0, Math.round((end - now) / 1000));
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom, alignItems: 'center' }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Volver a la receta" onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: t.g1, borderRadius: 14, overflow: 'hidden', paddingHorizontal: 18, paddingVertical: 10, boxShadow: t.shadow }}>
        <Grad r={14} a={t.g1} b={t.g2} dir="h" />
        <Text allowFontScaling={false} style={[{ color: '#FFFFFF', fontSize: 15 * t.fs, fontVariant: ['tabular-nums'] }, font(fonts, '800')]}>Temporizador {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</Text>
      </Pressable>
    </View>
  );
}

type Toast = { text: string; good?: boolean; label?: string; act?: () => void };

function Inner({ onReady }: { onReady?: (h: { dispatch: (e: any) => void }) => void }) {
  const scheme = useColorScheme(), ins = useSafeAreaInsets();
  const [st, setSt] = useState<State>(DEFAULT), [ui, setUi] = useState<UI>(firstUI()), [ready, setReady] = useState(false), [fonts, setFonts] = useState(false);
  const ref = useRef({ st, ui }); ref.current = { st, ui };
  useEffect(() => { P.loadFonts().then(setFonts); }, []);
  // Las animaciones van siempre (aunque Android las tenga reducidas); se quitan solo con Ajustes → Animaciones.
  // Un «tic» por minuto para que «Ahora toca» cambie solo con la hora aunque no toques nada.
  const [, setTick] = useState(0);
  useEffect(() => { const id = setInterval(() => setTick((x) => x + 1), 60000); return () => clearInterval(id); }, []);

  // Menú dinámico: al abrir la app y al cambiar de día se aplican los consejos al resto de la semana (si no es «Menú fijo»).
  const dayKey = new Date().toDateString();
  useEffect(() => { if (ready) dispatchRef.current?.({ type: 'Auto' }); }, [ready, dayKey]);
  useEffect(() => { P.loadState().then((x) => { const m = mergeState(x || {}); ref.current.st = m; setSt(m); setReady(true); }); }, []);
  useEffect(() => { if (ready) P.saveState(st); }, [st, ready]);
  // Avisos: solo se reprograman si cambia algo que les afecta (no en cada toque).
  const remSig = useRef('');
  useEffect(() => {
    if (!ready) return;
    const items = reminders(st), sig = JSON.stringify([items, st.set.popup, st.set.nsound]);
    if (sig === remSig.current) return; remSig.current = sig;
    P.scheduleAll(items, { popup: st.set.popup, sound: st.set.nsound }).catch(() => {});
  }, [st, ready]);
  // Quita la pantalla de inicio cuando ya están tus datos y las letras (o, como mucho, en 1,5 s).
  const [launch, setLaunch] = useState(false);
  useEffect(() => { if (ready && fonts) { P.hideSplash(); setLaunch(true); } }, [ready, fonts]);
  useEffect(() => { const id = setTimeout(() => { P.hideSplash(); setLaunch(true); }, 1500); return () => clearTimeout(id); }, []);

  /* ---------- aviso flotante animado (con botón opcional) ---------- */
  const [msg, setMsg] = useState<Toast | null>(null);
  const toastA = useRef(new Animated.Value(0)).current, toastT = useRef<any>(null);
  const note = useRef((text: string, good = false, label?: string, act?: () => void) => {
    setMsg({ text, good, label, act }); clearTimeout(toastT.current); toastA.setValue(0);
    Animated.spring(toastA, { toValue: 1, damping: 15, stiffness: 190, useNativeDriver: true }).start();
    toastT.current = setTimeout(() => Animated.timing(toastA, { toValue: 0, duration: 240, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => setMsg(null)), label ? 4200 : 2600);
  });
  const sound = useCallback((n: string) => { if (ref.current.st.set.sound) P.play(n); }, []);
  const dispatchRef = useRef<(e: any) => void>(() => {});
  const autoT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const perms = useCallback(() => { P.notifAllowed().then((v) => dispatchRef.current({ type: 'Perms', params: { notif: v } })); }, []);

  /* ---------- sincronización con Google Drive ---------- */
  const syncing = useRef(false);
  const sync = useCallback(async (silent = false) => {
    // La sincronización con Drive es de Nevú Plus.
    if (syncing.current || !ref.current.st.sync || !hasPlus(ref.current.st)) return; syncing.current = true;
    try {
      // 1) Bajar la copia de la nube y juntarla con lo de aquí (cada parte se queda con su cambio más reciente).
      const remote = await P.cloudPull(CLOUD_FILE);
      if (remote && !sameCloud(mergeStates(ref.current.st, remote), ref.current.st)) dispatchRef.current({ type: 'Merge', params: { state: remote } });
      // 2) Subir el resultado si la nube no lo tiene ya.
      const now = ref.current.st;
      if (!remote || !sameCloud(now, mergeState(remote))) await P.cloudPush(CLOUD_FILE, JSON.stringify(cloudCopy(now)));
      const seen = await P.cloudStat(CLOUD_FILE).catch(() => '');
      dispatchRef.current({ type: 'Dev', params: { seen } });
      dispatchRef.current({ type: 'SyncSet', params: { email: now.sync?.email, at: Date.now() } });
      if (ref.current.st.dev.syncErr) dispatchRef.current({ type: 'Dev', params: { syncErr: '' } });
      if (!silent) note.current('Sincronizado', true);
    } catch (e) {
      const why = P.googleError(e);
      dispatchRef.current({ type: 'Dev', params: { syncErr: why } });
      if (!silent) note.current('No se pudo sincronizar: ' + why);
    } finally { syncing.current = false; }
  }, []);

  /* ---------- calendario: se actualiza solo si lo activas (en este dispositivo) ---------- */
  // Resumen de lo que se ha hecho, para Ajustes → Calendario (así se ve si de verdad cambia y borra).
  const calSummary = (rs: P.CalResult[]) => {
    const sum = (k: 'updated' | 'created' | 'removed' | 'stuck') => rs.reduce((a, r) => a + r[k], 0), where = rs.map((r) => r.cal).filter(Boolean).pop() || '';
    const parts = [sum('updated') && `${sum('updated')} cambiados`, sum('created') && `${sum('created')} creados`, sum('removed') && `${sum('removed')} borrados`].filter(Boolean).join(', ');
    return { info: `Último cambio (${new Date().toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}): ${parts || 'nada que cambiar'}${where ? ` en ${where}` : ''}`,
      err: sum('stuck') ? `Android no ha dejado borrar ${sum('stuck')} ${sum('stuck') === 1 ? 'evento' : 'eventos'}${rs.find((r) => r.err)?.err ? ` (${rs.find((r) => r.err)!.err})` : ''}` : rs.find((r) => r.err)?.err || '' };
  };
  // calGen sube al pulsar «Borrar los eventos de la app»: una escritura que estuviera a medias se para al momento.
  const calBusy = useRef(false), calGen = useRef(0);
  // force: compara con lo que hay de verdad en el calendario aunque no hayas cambiado nada (al activar la
  // sincronización, al abrir la app y al volver a ella). Si ya hay una escritura en marcha, se repite al acabar.
  const calAgain = useRef(false);
  const calSync = useCallback(async (force = false): Promise<P.CalResult[] | null> => {
    // Solo en el calendario de la cuenta con la que iniciaste sesión; sin sesión, espera a que la inicies.
    const s0 = ref.current.st, email = s0.sync?.email; if (!s0.set.calSync || (!force && !s0.dev.calDirty) || !email || !hasPlus(s0)) return null;
    if (calBusy.current) { calAgain.current = true; return null; }
    calBusy.current = true;
    try {
      const now = ymd(monday(new Date())), rs: P.CalResult[] = [], gen = calGen.current;
      const alive = () => gen === calGen.current && ref.current.st.set.calSync;
      for (const w of Object.keys(s0.plans).filter((x) => x >= now).sort().slice(0, 2)) {
        const evs = calendarEvents(ref.current.st, { ...ref.current.ui, w }), sig = JSON.stringify(evs);
        if (!force && ref.current.st.dev.calSig?.[w] === sig) continue;
        if (!alive()) return null;
        const r = await P.calendarWrite(w, evs, ref.current.st.dev.cal[w] || [], false, email, alive); rs.push(r);
        if (!alive()) return null;   // se ha parado a medias: «Borrar los eventos» lo limpia todo
        dispatchRef.current({ type: 'Dev', params: { cal: { ...ref.current.st.dev.cal, [w]: r.ids }, calSig: { ...(ref.current.st.dev.calSig || {}), [w]: sig } } });
      }
      // Si mientras escribía has cambiado algo más, se queda pendiente para la próxima vez.
      const again = Object.keys(ref.current.st.plans).filter((x) => x >= now).sort().slice(0, 2).some((w) => ref.current.st.dev.calSig?.[w] !== JSON.stringify(calendarEvents(ref.current.st, { ...ref.current.ui, w })));
      const sm = rs.length ? calSummary(rs) : null;
      dispatchRef.current({ type: 'Dev', params: { calDirty: again, calErr: sm?.err || '', calInfo: sm?.info || ref.current.st.dev.calInfo } });
      return rs;
    } catch (e: any) {
      // Sin tragarse el error: se enseña en Ajustes → Calendario para saber qué pasa.
      const why = String(e?.message || e); dispatchRef.current({ type: 'Dev', params: { calErr: why } }); throw e;
    } finally {
      calBusy.current = false;
      if (calAgain.current) { calAgain.current = false; setTimeout(() => calSync(true).catch(() => {}), 200); }
    }
  }, []);

  const dispatch = useCallback(async (e: { type: string; params?: any }) => {
    const before = ref.current;
    const r = handle(before.st, before.ui, e, true);
    ref.current = { st: r.st, ui: r.ui }; setSt(r.st); setUi(r.ui);
    // Menú dinámico: el resto de la semana se reajusta justo después de pintar el cambio (y una sola vez si tocas varias veces seguidas).
    if (r.later) {
      if (autoT.current) clearTimeout(autoT.current);
      const quiet = e.type === 'Cooked' || e.type === 'Easy';
      const idle = (globalThis as any).requestIdleCallback || ((f: () => void) => setTimeout(f, 1));
      autoT.current = setTimeout(() => idle(() => dispatchRef.current({ type: 'Auto', params: { user: true, quiet } })), 300);
    }
    // Sonidos: toque, navegación y hojas solo si los activas; lo importante (logros, temporizador, cambios) con «Sonidos».
    const tap = r.st.set.tapSound;
    if (tap && (e.type === 'Go' || e.type === 'Week' || e.type === 'Month' || e.type === 'Intro')) sound('nav');
    else if (tap && e.type === 'Open') sound('hoja');
    else if (tap && e.type === 'Close') sound('cierra');
    else if (tap && e.type === 'Cfg') sound(e.params.value === false ? 'toggleOff' : 'toggle');
    else if (e.type === 'Lock') sound(r.st.plans[r.ui.w]?.l?.[`${r.ui.day}-${e.params.k}`] ? 'candado' : 'suelta');
    else if (tap && TAP.includes(e.type)) sound('tap');
    // Elegir un plato tú y que la app lo cambie suenan distinto.
    if (e.type === 'Choose') sound('elige'); else if (e.type === 'Easy' || e.type === 'Unlock') sound('cambio');
    if (e.type === 'Check' && r.st.plans[r.ui.w]?.c[e.params.id]) sound('marca');
    // Celebraciones solo cuando haces algo tú (no al generar, que sería celebrar por nada).
    const w = r.ui.w, i = r.ui.day;
    if (e.type === 'Apply' && dayOk(r.st, w, i) && !dayOk(before.st, before.ui.w, i)) { sound('logro'); note.current('Día equilibrado', true); }
    // Siguiente paso a un toque: tras generar, ir a la compra; tras completar la compra, volver al menú.
    if (e.type === 'Check' && shopDone(r.st, w) && !shopDone(before.st, w)) { sound('compra'); note.current('Compra completa: ya está en tu despensa', true, 'Ver menú', () => dispatchRef.current({ type: 'Go', params: { tab: 'plan' } })); }
    if (e.type === 'Gen') note.current('Semana lista', true, 'Ver la compra', () => dispatchRef.current({ type: 'Go', params: { tab: 'compra' } }));
    // Activar un aviso pide el permiso en ese momento (y no antes).
    if (e.type === 'Cfg' && NOTIF_KEYS.includes(e.params.key) && e.params.value === true) P.askNotifications().then(perms);
    const fx = r.fx; if (!fx) return;
    const goPlan = () => dispatchRef.current({ type: 'Go', params: { tab: 'plan' } });
    if (fx.kind === 'plain' && e.type === 'Cooked') sound('deshacer');
    if (fx.kind === 'wipe') {
      // Quita los eventos que la app puso en el calendario y, si lo pediste, la copia de Google Drive.
      (async () => {
        calGen.current++; await P.calendarPurge().catch(() => null);
        if (fx.data.cloud) { await P.cloudDelete(CLOUD_FILE).catch(() => {}); await P.cloudDelete(CLOUD_BACKUP).catch(() => {}); await P.googleOut().catch(() => {}); }
        note.current(fx.data.cloud ? 'Datos borrados aquí y en tu Google Drive' : 'Datos borrados de este móvil', true);
      })();
    }
    if (fx.kind === 'cooked') { sound('logro'); const d = fx.data; note.current('¡Buen provecho! Descontado de la despensa', true, 'Deshacer', () => dispatchRef.current({ type: 'Cooked', params: d })); }
    if (fx.kind === 'retuned') { sound('cambio'); const n = fx.data.n; note.current(`${fx.data.pre ? fx.data.pre + '. ' : ''}He cambiado ${n} ${n === 1 ? 'plato' : 'platos'}${fx.data.days?.length ? ` (${fx.data.days.join(', ')})` : ' de hoy en adelante'}`, false, fx.data.tab !== 'plan' ? 'Ver menú' : undefined, goPlan); }
    if (fx.kind === 'info') note.current(fx.data);
    if (fx.kind === 'bought') note.current('Compra hecha: si cambias algo, usaré lo que tienes en casa', true, 'Ver menú', goPlan);
    if (fx.kind === 'easy') { if (fx.data) sound('cambio'); note.current(fx.data ? `Cambiado por: ${fx.data}` : 'Ya es de lo más rápido que hay'); }
    if (fx.kind === 'TimerStart') { sound('timer'); P.timerNotify(fx.data.sec); } else if (fx.kind === 'TimerStop') P.timerCancel(); else if (fx.kind === 'TimerDone') { sound('alarma'); P.buzz(); note.current('Tiempo cumplido', true); }
    else if (fx.kind === 'export') {
      const { st: s, ui: u } = ref.current, p = s.plans[u.w], k = fx.data;
      // Sin Nevú Plus, lo que es de Plus abre la hoja que lo explica (con el botón de compra).
      if ((PLUS_EXPORTS.includes(k) || (k === 'calsync' && !s.set.calSync)) && !hasPlus(s)) { dispatch({ type: 'Open', params: { kind: 'plus', k: 0 } }); return; }
      // PDF con el estilo de la app (ver src/pdf.ts): el menú en A4 apaisado y la compra en A4 vertical.
      const fridge = async (share: boolean) => P.htmlPdf(fridgeHtml(s, u.w, await P.pdfAssets(dishesOf(s, u.w))), 'nevu-menu.pdf', share, true);
      const shopDoc = async (share: boolean) => P.htmlPdf(shopHtml(s, u.w, await P.pdfAssets([])), 'nevu-compra.pdf', share, false);
      try {
        if ((k === 'pdf' || k === 'print' || k === 'shoppdf' || k === 'printshop') && !p) note.current('Primero prepara el menú de esta semana');
        else if (k === 'pdf') await fridge(true);
        else if (k === 'print') await fridge(false);
        else if (k === 'shoppdf') await shopDoc(true);
        else if (k === 'printshop') await shopDoc(false);
        else if (k === 'backup') await P.shareFile('nevu-copia.json', JSON.stringify(cloudCopy(s)), false, 'application/json');
        else if (k === 'restore') { const j = await P.pickJson(); if (j) dispatch({ type: 'Replace', params: { state: JSON.parse(j) } }); }
        else if (k === 'calendar') {
          // Solo abre el calendario en esta semana: no escribe nada (eso lo hace «Sincronizar», si está activado).
          await P.calendarOpen(parse(u.w));
          if (!s.set.calSync) note.current('Tus comidas solo van al calendario con «Sincronizar» activado');
        }
        else if (k === 'calpurge') {
          // Deja de sincronizar ANTES de borrar (y para la escritura que hubiera a medias); luego borra todos los eventos
          // que puso la app, en cualquier calendario. No vuelve a poner nada hasta que actives «Sincronizar».
          if (!(await P.calendarAllowed(true))) { note.current('Sin permiso para el calendario'); return; }
          calGen.current++; calAgain.current = false;
          if (ref.current.st.set.calSync) dispatch({ type: 'Cfg', params: { key: 'calSync', value: false } });
          dispatch({ type: 'Dev', params: { calDirty: false } });
          for (let i = 0; i < 100 && calBusy.current; i++) await new Promise((ok) => setTimeout(ok, 100));
          let r = { n: 0, left: 0, err: '', where: '' }; try { r = await P.calendarPurge(Object.values(ref.current.st.dev.cal || {}).flat()); } catch (e: any) { r.err = String(e?.message || e); }
          dispatch({ type: 'Dev', params: { cal: {}, calSig: {}, calDirty: false, calErr: r.left ? `Quedan ${r.left} ${r.left === 1 ? 'evento' : 'eventos'} de la app: ${r.where}${r.err ? ` (${r.err})` : ''}` : r.err, calInfo: r.n ? `Borrados ${r.n} eventos de la app` : '' } });
          note.current(r.left ? `No he podido borrar ${r.left} ${r.left === 1 ? 'evento' : 'eventos'}: mira Ajustes → Calendario` : r.n ? `He borrado ${r.n} ${r.n === 1 ? 'evento' : 'eventos'} y ya no actualizo el calendario` : r.err ? `No he podido borrar: ${r.err}` : 'No había eventos de la app. Ya no actualizo el calendario', !!r.n);
        }
        else if (k === 'calsync') {
          const on = !s.set.calSync;
          if (on && !s.sync?.email) note.current('Primero inicia sesión con Google: las comidas van al calendario de esa cuenta');
          else if (on && !(await P.calendarAllowed(true))) note.current('Sin permiso para el calendario');
          else { dispatch({ type: 'Cfg', params: { key: 'calSync', value: on } }); dispatch({ type: 'Dev', params: { calSig: {}, calDirty: on } }); if (!on) note.current('Ya no actualizo el calendario');
            else setTimeout(() => calSync(true).then((rs) => { const c = (rs || []).reduce((a, x) => a + x.created + x.updated, 0), all = (rs || []).reduce((a, x) => a + x.ids.length, 0); note.current(c ? `He puesto ${c} comidas en tu calendario de ${s.sync!.email}` : all ? 'Tu calendario ya estaba al día' : 'Prepara primero el menú de esta semana', true); }).catch((e: any) => note.current(String(e?.message || e))), 300); }
        }
        else if (k === 'event' && u.sheet) { const ev = calendarEvents(s, u).find((x) => x.start.getDay() === (parse(u.w).getDay() + u.day + 7) % 7 && x.title.startsWith(SLN[u.sheet!.k])); if (ev) await P.calendarEvent(ev); else note.current('Esta franja no va al calendario'); }
        else if (k === 'signin') {
          try { const g = await P.googleSignIn(); if (g) { dispatch({ type: 'SyncSet', params: { email: g.email } }); note.current('Sesión iniciada: ' + g.email, true); setTimeout(() => sync(true), 50); } }
          catch (err) { const why = P.googleError(err); dispatch({ type: 'Dev', params: { syncErr: why } }); note.current('No se pudo iniciar sesión: ' + why); }
        }
        else if (k === 'signout') { await P.googleOut().catch(() => {}); dispatch({ type: 'SyncSet', params: {} }); }
        else if (k === 'sync') await sync();
        else if (k === 'cloudsave') { try { await P.cloudPush(CLOUD_BACKUP, JSON.stringify(cloudCopy(s))); note.current('Copia guardada en tu Drive', true); } catch (err) { note.current('No se pudo guardar la copia: ' + P.googleError(err)); } }
        else if (k === 'cloudrestore') { try { const c = await P.cloudPull(CLOUD_BACKUP); if (c) dispatch({ type: 'Replace', params: { state: c } }); else note.current('Aún no hay copia en la nube'); } catch (err) { note.current('No se pudo restaurar: ' + P.googleError(err)); } }
        else if (k === 'buy') { try { await P.plusBuy(); } catch (err: any) { note.current('No se pudo abrir el pago: ' + String(err?.message || err)); } }
        else if (k === 'restorebuy') {
          const v = await P.plusOwned();
          if (v) { dispatch({ type: 'Dev', params: { plus: true } }); if (ref.current.ui.sheet?.kind === 'plus') dispatch({ type: 'Close' }); note.current('Nevú Plus restaurado', true); setTimeout(() => sync(true), 50); }
          else note.current(v === false ? 'Esta cuenta de Google Play no tiene Nevú Plus' : 'No he podido hablar con Google Play. Prueba con internet');
        }
        else if (k === 'perm-notif') { await P.askNotifications(); perms(); }
        else if (k === 'perm-notif-on') {
          const ok = await P.askNotifications(); perms();
          if (ok) { (['meals', 'notif', 'exp'] as const).forEach((key) => { if (!ref.current.st.set[key]) dispatch({ type: 'Cfg', params: { key, value: true } }); }); note.current('Avisos activados', true); }
        }
        else if (k === 'perm-alarm') await P.openExactAlarm();
        else if (k === 'perm-battery') await P.openBattery();
      } catch { note.current('No se pudo completar'); }
    }
  }, []);
  dispatchRef.current = dispatch;

  // Sincroniza 3 s después de cada cambio, al abrir la app y al volver a ella; el calendario, igual.
  useEffect(() => { if (ready && st.sync) { const id = setTimeout(() => sync(true), 3000); return () => clearTimeout(id); } }, [st.updated, ready]);
  // Al abrir la app: comprueba el calendario (por si borraste eventos a mano o cambió algo en otro dispositivo).
  useEffect(() => { if (ready && ref.current.st.set.calSync) { const id = setTimeout(() => calSync(true).catch(() => {}), 5000); return () => clearTimeout(id); } }, [ready]);
  useEffect(() => { if (ready && st.set.calSync && st.dev.calDirty) { const id = setTimeout(() => calSync().catch(() => {}), 2500); return () => clearTimeout(id); } }, [st.updated, st.set.calSync, st.dev.calDirty, ready]);
  // Mientras la app está abierta, mira cada 30 s si el otro dispositivo ha cambiado algo (solo la fecha del archivo).
  useEffect(() => {
    if (!ready || !st.sync) return;
    const id = setInterval(async () => {
      if (AppState.currentState !== 'active' || syncing.current) return;
      try { const m = await P.cloudStat(CLOUD_FILE); if (m && m !== ref.current.st.dev.seen) sync(true); } catch {}
    }, 30000);
    return () => clearInterval(id);
  }, [ready, !!st.sync]);
  useEffect(() => {
    if (!ready) return;
    perms();
    if (ref.current.st.sync) P.googleSilent().then(() => sync(true));
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') { perms(); sync(true); dispatchRef.current?.({ type: 'Auto' }); setTimeout(() => calSync(true).catch(() => {}), 4000); } });
    return () => sub.remove();
  }, [ready]);
  useEffect(() => { onReady?.({ dispatch }); }, [dispatch]);
  // Nevú Plus: escucha las compras y, al abrir la app, pregunta a Google Play si esta cuenta lo tiene (así también se
  // recupera en otro móvil o tras reinstalar, y se quita si te devuelven el dinero) y cuál es su precio.
  useEffect(() => {
    if (!ready) return;
    let stop = () => {};
    P.plusListen(() => {
      const was = !!ref.current.st.dev.plus;
      dispatchRef.current({ type: 'Dev', params: { plus: true } });
      if (was) return;
      sound('logro'); note.current('¡Gracias! Ya tienes Nevú Plus', true);
      if (ref.current.ui.sheet?.kind === 'plus') dispatchRef.current({ type: 'Close' });
      setTimeout(() => sync(true), 50);
    }, (why) => note.current('No se pudo completar la compra: ' + why)).then((f) => { stop = f; });
    P.plusOwned().then((v) => { if (v !== null && v !== !!ref.current.st.dev.plus) dispatchRef.current({ type: 'Dev', params: { plus: v } }); });
    P.plusPrice().then((pr) => { if (pr && pr !== ref.current.st.dev.plusPrice) dispatchRef.current({ type: 'Dev', params: { plusPrice: pr } }); });
    return () => stop();
  }, [ready]);
  // Botón «atrás» de Android: cierra la hoja abierta o vuelve al plan antes de salir de la app.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      const u = ref.current.ui;
      if (!ref.current.st.intro && ready) { if (u.intro > 0) { dispatchRef.current({ type: 'Intro', params: { page: u.intro - 1 } }); return true; } return false; }
      if (u.sheet) { dispatchRef.current({ type: 'Close' }); return true; }
      if (u.tab !== 'plan') { dispatchRef.current({ type: 'Go', params: { tab: 'plan' } }); return true; }
      return false;
    });
    return () => sub.remove();
  }, [ready]);

  const win = useWindowDimensions();
  const t = makeTheme(st.set.mode, scheme, st.set.accent, st.set.text, st.set.dens, win.fontScale, win.width, hasPlus(st) ? st.set.themes?.[st.set.grad ?? -1] ?? null : null), motion = st.set.motion;
  useEffect(() => { P.rootColor(t.bg); }, [t.bg]);
  const ctx = useMemo(() => ({ t, dispatch, sound, motion, fonts, haptic: () => { if (ref.current.st.set.haptics) P.haptic(); }, insetTop: ins.top, insetBottom: ins.bottom }), [t.dark, t.ac, t.fs, t.sp, t.big, dispatch, ins.top, ins.bottom, motion, fonts]);
  const on = useCallback((e: any) => dispatch({ type: e.type, params: e.params }), [dispatch]);
  // Deslizar: día siguiente o anterior (y, en los extremos, la semana de al lado).
  const swipeDay = useCallback((d: number) => {
    const u = ref.current.ui, i = u.day + d;
    if (ref.current.st.set.haptics) P.haptic();
    if (i >= 0 && i <= 6) dispatch({ type: 'Day', params: { i } });
    else { dispatch({ type: 'Week', params: { d } }); dispatch({ type: 'Day', params: { i: d > 0 ? 0 : 6 } }); }
  }, [dispatch]);
  // Dirección de la transición entre pestañas: hacia la derecha si vas a una pestaña posterior.
  const prevTab = useRef(ui.tab), dir = useRef(1);
  if (prevTab.current !== ui.tab) { dir.current = TABS.indexOf(ui.tab) >= TABS.indexOf(prevTab.current) ? 1 : -1; prevTab.current = ui.tab; }
  const sh = sheet(st, ui), showIntro = ready && !st.intro;
  // La pantalla y la barra solo se vuelven a pintar si cambia su contenido (por ejemplo, no al pasar de paso en la
  // presentación, que va encima): así los cambios de paso no tienen que esperar a repintar la app entera.
  // Cambio de pestaña sin tirones: la barra se actualiza al instante y el contenido nuevo se pinta enseguida después,
  // con prioridad baja (useDeferredValue), así el toque no espera a que se dibuje toda la pantalla.
  const bodyNow = useMemo(() => body(st, ui), [st, ui]), bodyStr = useDeferredValue(bodyNow), navStr = useMemo(() => nav(ui), [ui.tab]);
  const tabShown = useDeferredValue(ui.tab);
  const bodyEl = useMemo(() => <Renderer response={bodyStr} library={library} onAction={on} />, [bodyStr, on]);
  const navEl = useMemo(() => <Renderer response={navStr} library={library} onAction={on} />, [navStr, on]);
  // Sonido de bienvenida de la presentación: suena cada vez que la ves (también desde Ajustes → Ver la presentación), si tienes los
  // sonidos activados. Al terminar o saltarla se apaga poco a poco; si te vas a otra app, se corta.
  useEffect(() => {
    if (!showIntro || !st.set.sound) return;
    const id = setTimeout(P.musicStart, 350);
    const sub = AppState.addEventListener('change', (a) => { if (a !== 'active') P.musicStop(0); });
    return () => { clearTimeout(id); sub.remove(); P.musicStop(1200); };
  }, [showIntro, st.set.sound]);
  // Fin del temporizador aunque hayas cerrado la receta (el reloj de la receta solo cuenta mientras está abierta).
  useEffect(() => {
    if (!ui.timer) return;
    const end = ui.timer.end, id = setTimeout(() => { if (ref.current.ui.timer?.end === end) dispatch({ type: 'TimerDone' }); }, Math.max(0, end - Date.now()));
    return () => clearTimeout(id);
  }, [ui.timer?.end]);
  // Pantalla encendida: «Siempre», o «Al cocinar» mientras ves una receta o corre el temporizador.
  const ka = st.set.keepAwake || 'receta', awake = ka === 'siempre' || (ka === 'receta' && (ui.sheet?.kind === 'recipe' || !!ui.timer));
  useEffect(() => { P.keepAwake(awake); }, [awake]);
  return (
    <AppCtx.Provider value={ctx}>
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        <StatusBar style={t.dark ? 'light' : 'dark'} />
        <Backdrop />
        <TabFade key={tabShown} motion={motion} dir={dir.current}>
          <DaySwipe enabled={ui.tab === 'plan' && !!st.plans[ui.w]} motion={motion} onSwipe={swipeDay}>{bodyEl}</DaySwipe>
        </TabFade>
        {navEl}
        {ui.timer && !ui.sheet ? <TimerPill end={ui.timer.end} t={t} bottom={ins.bottom + 92} onPress={() => dispatch({ type: 'OpenTimer' })} fonts={fonts} /> : null}
        {sh ? <View style={StyleSheet.absoluteFill}><Renderer key={ui.sheet!.kind + ui.sheet!.k} response={sh} library={library} onAction={on} /></View> : null}
        {showIntro ? <Renderer response={intro(st, ui)} library={library} onAction={on} /> : null}
        {/* Teclado de la app para los números: encima de todo, también de la presentación. */}
        <KeypadHost />
        <Launch go={launch} motion={motion} />
        {msg ? (
          <Animated.View pointerEvents="box-none" style={{ position: 'absolute', left: 20, right: 20, bottom: ins.bottom + 100, alignItems: 'center', opacity: toastA, transform: [{ scale: toastA.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }, { translateY: toastA.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: msg.good ? t.ok : t.ink, borderRadius: 14, boxShadow: t.shadow, paddingLeft: 20, paddingRight: msg.label ? 8 : 20, paddingVertical: msg.label ? 8 : 12, maxWidth: 460 }}>
              <Text allowFontScaling={false} style={[{ color: msg.good ? '#FFFFFF' : t.bg, fontSize: 14 * t.fs, lineHeight: 20 * t.fs, textAlign: msg.label ? 'left' : 'center', flexShrink: 1 }, font(fonts, '700')]}>{msg.text}</Text>
              {msg.label ? <Pressable onPress={() => { msg.act?.(); setMsg(null); }} style={{ backgroundColor: t.dark ? '#00000022' : '#FFFFFF26', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8 }}><Text allowFontScaling={false} style={[{ color: msg.good ? '#FFFFFF' : t.bg, fontSize: 14 * t.fs }, font(fonts, '800')]}>{msg.label}</Text></Pressable> : null}
            </View>
          </Animated.View>
        ) : null}
      </View>
    </AppCtx.Provider>
  );
}

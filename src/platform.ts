// Funciones del dispositivo (almacenamiento, avisos, calendario, compartir). En la vista previa web se sustituyen por platform.web.ts.
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Calendar from 'expo-calendar';
import * as Picker from 'expo-document-picker';
import * as FS from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import * as Sharing from 'expo-sharing';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { Linking, Platform } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Print from 'expo-print';
import * as SystemUI from 'expo-system-ui';
import * as SplashScreen from 'expo-splash-screen';

// La pantalla de inicio (icono sobre verde azulado) se queda hasta que la app ha cargado tus datos y las letras.
SplashScreen.preventAutoHideAsync().catch(() => {});
try { SplashScreen.setOptions({ fade: true, duration: 350 }); } catch {}
export const hideSplash = () => SplashScreen.hideAsync().catch(() => {});
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Font from 'expo-font';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as cloud from './cloud';
import { APP_ID, GOOGLE_WEB_CLIENT_ID, PLUS_ID } from './config';
import * as IAP from 'expo-iap';
import type { FontKey, PdfAssets } from './pdf';

const KEY = 'menu-nevera-v2';
export const loadState = async () => { try { return JSON.parse((await AsyncStorage.getItem(KEY)) || 'null'); } catch { return null; } };
export const saveState = (s: any) => AsyncStorage.setItem(KEY, JSON.stringify(s)).catch(() => {});
export const haptic = () => Haptics.selectionAsync().catch(() => {});
export const buzz = () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
/** Color de fondo de la ventana nativa (evita destellos blancos al abrir el teclado o al girar en modo oscuro). */
export const rootColor = (c: string) => SystemUI.setBackgroundColorAsync(c).catch(() => {});

// Guardar y recuperar el purchaseToken de Google Play para la validación web en PC
const PURCHASE_TOKEN_KEY = 'nevu_purchase_token_v1';
export const savePurchaseToken = async (token: string) => {
  try { await AsyncStorage.setItem(PURCHASE_TOKEN_KEY, token); } catch {}
};
export const getPurchaseToken = async (): Promise<string | null> => {
  try { return await AsyncStorage.getItem(PURCHASE_TOKEN_KEY); } catch { return null; }
};

Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldPlaySound: true, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true }) });

/* ---------- avisos: canal con o sin ventana emergente y con o sin sonido propio ---------- */
// En Android, cómo suena y si aparece encima depende del «canal», y un canal no se puede cambiar una vez creado.
// Por eso hay un canal por combinación de ajustes.
export type NotifOpts = { popup: boolean; sound: boolean };
let opts: NotifOpts = { popup: true, sound: true };
const channel = (o: NotifOpts) => `menu-${o.popup ? 'p' : 'n'}${o.sound ? 's' : 'd'}`;
async function makeChannel() {
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync(channel(opts), {
    name: `Menú y compra${opts.popup ? ' (emergente)' : ''}${opts.sound ? ', sonido de la app' : ''}`,
    importance: opts.popup ? Notifications.AndroidImportance.MAX : Notifications.AndroidImportance.DEFAULT,
    sound: opts.sound ? 'aviso.wav' : 'default', vibrationPattern: [0, 180, 120, 180], lightColor: '#24706A',
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
}
async function allowNotifications() {
  await makeChannel();
  const cur = await Notifications.getPermissionsAsync();
  return cur.granted || (await Notifications.requestPermissionsAsync()).granted;
}
const at = (date: Date) => ({ type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: channel(opts) } as any);
const content = (title: string, body: string) => ({ title, body, sound: opts.sound ? 'aviso.wav' : true, priority: opts.popup ? Notifications.AndroidNotificationPriority.MAX : Notifications.AndroidNotificationPriority.DEFAULT });

/* ---------- permisos del móvil ---------- */
/** ¿Tiene permiso de avisos? (null si no se puede saber). */
export const notifAllowed = () => Notifications.getPermissionsAsync().then((r) => r.granted).catch(() => null);
/** Pide el permiso de avisos; si ya se denegó dos veces, Android no vuelve a preguntar y se abren los ajustes de la app. */
export async function askNotifications() {
  const ok = await allowNotifications().catch(() => false);
  if (!ok) await openNotifSettings();
  return ok;
}
const pkg = { 'android.provider.extra.APP_PACKAGE': APP_ID };
/** Ajustes de avisos de la app. */
export const openNotifSettings = () => IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.APP_NOTIFICATION_SETTINGS, { extra: pkg }).catch(() => Linking.openSettings());
/** «Alarmas y recordatorios» (Android 12+): sin esto, Android puede retrasar los avisos varios minutos. */
export const openExactAlarm = () => IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.REQUEST_SCHEDULE_EXACT_ALARM, { data: 'package:' + APP_ID }).catch(() => Linking.openSettings());
/** Pide quitar la optimización de batería para esta app (si no se puede, abre la lista general). */
// Abre la lista de «Optimización de batería» de Android (ahí eliges Nevú → No optimizar). No usa el permiso
// REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, que Google Play solo permite a apps muy concretas.
export const openBattery = () => IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.IGNORE_BATTERY_OPTIMIZATION_SETTINGS).catch(() => Linking.openSettings());
export async function scheduleAll(items: { title: string; body: string; at: Date }[], o?: NotifOpts) {
  if (o) opts = o;
  // No pide permiso aquí (eso lo hacen los botones de la presentación y de Ajustes): si no lo hay, no programa nada.
  if (items.length) { if (!(await notifAllowed())) return; await makeChannel(); }
  const old = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(old.filter((n) => n.identifier !== 'timer').map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
  for (const i of items) await Notifications.scheduleNotificationAsync({ content: content(i.title, i.body), trigger: at(i.at) });
}
export async function timerNotify(sec: number) { if (await allowNotifications()) await Notifications.scheduleNotificationAsync({ identifier: 'timer', content: content('Tiempo cumplido', 'Tu receta está lista'), trigger: at(new Date(Date.now() + sec * 1000)) }); }
export const timerCancel = () => Notifications.cancelScheduledNotificationAsync('timer').catch(() => {});

export async function shareFile(name: string, data: string, base64: boolean, mime: string) {
  const uri = (FS.cacheDirectory || '') + name;
  await FS.writeAsStringAsync(uri, data, { encoding: base64 ? FS.EncodingType.Base64 : FS.EncodingType.UTF8 });
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: mime, dialogTitle: name });
}
export async function pickJson(): Promise<string | null> {
  const r = await Picker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
  return r.canceled ? null : FS.readAsStringAsync(r.assets[0].uri);
}
/** Un evento de comida. `key` = «día-franja» (por ejemplo «2-1»: miércoles, comida); sirve para cambiar solo ese evento. */
type Ev = { title: string; start: Date; end: Date; notes: string; key?: string };
/** Marca que llevan en las notas los eventos que crea la app, para poder encontrarlos y sustituirlos. */
const TAG = (w: string, key = '') => `[Nevú ${w}${key ? ' ' + key : ''}]`;
/** Prefijos de la marca: el actual y el de cuando la app se llamaba «Menú Nevera» (esos eventos también son suyos). */
const TAGS = ['[Nevú ', '[Menú Nevera '];
/** Día-franja que guarda la marca de un evento (los de versiones anteriores no la tienen). */
const keyOf = (e: { notes?: string }) => /\[(?:Nevú|Menú Nevera) \S+ (\d+-\d+)\]/.exec(e.notes || '')?.[1] || '';
/**
 * Calendario donde escribir: el principal de la cuenta de Google con la que iniciaste sesión en la app (y ningún otro,
 * aunque tengas más cuentas en el móvil). Sin sesión iniciada no se escribe nada.
 */
async function pickCalendar(email?: string) {
  if (!email) return null;
  const e = email.toLowerCase(), cals = (await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT)).filter((c) => c.allowsModifications);
  const mine = cals.filter((c) => c.source?.type === 'com.google' && [c.ownerAccount, c.source?.name].some((x) => (x || '').toLowerCase() === e));
  return mine.find((c) => c.isPrimary) || mine.find((c) => (c.ownerAccount || '').toLowerCase() === e) || mine[0] || null;
}
export const calendarAllowed = async (ask = true) => (ask ? await Calendar.requestCalendarPermissionsAsync() : await Calendar.getCalendarPermissionsAsync()).granted;
/** Eventos que creó la app: los marcados «[Nevú …]» (o «[Menú Nevera …]») y los de versiones antiguas (título de comida y la lista de ingredientes en formato «2 yogur, 30 avena»). */
const LEGACY = /^\d+(?:[.,]\d+)? [a-z]+(?:, \d+(?:[.,]\d+)? [a-z]+)*$/;
const SLOTS = ['Desayuno', 'Comida', 'Cena', 'Merienda', 'Bebida'];
const ours = (e: { title?: string; notes?: string }, w = '') => TAGS.some((t) => (e.notes || '').includes(t + w)) || (SLOTS.some((x) => (e.title || '').startsWith(x)) && LEGACY.test((e.notes || '').trim()));
const writable = async () => (await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT)).filter((c) => c.allowsModifications);
/** Eventos de varios calendarios en un rango, calendario a calendario y en tramos de 60 días (si uno falla, sigue con los demás). */
async function eventsIn(cals: { id: string }[], from: Date, to: Date) {
  const out: any[] = []; let err = '';
  for (const c of cals) for (let a = +from; a < +to; a += 60 * 864e5) {
    try { out.push(...(await Calendar.getEventsAsync([c.id], new Date(a), new Date(Math.min(+to, a + 60 * 864e5))))); } catch (e: any) { err = String(e?.message || e); }
  }
  return { evs: out.filter((e, i, l) => l.findIndex((x) => x.id === e.id) === i), err };
}
/**
 * Borra un evento entero. Se llama al módulo nativo con solo el id: la función de expo-calendar 15 manda también
 * «instanceStartDate» (vacío) y, si Android lo recibe, no borra el evento sino que añade una «excepción» y dice que
 * ha ido bien (ver CalendarModule.kt → removeEvent). Si Android dice que no ha borrado nada, se mira si el evento
 * sigue: si ya no está (por ejemplo, lo borraste tú a mano), no es un error.
 * Devuelve 'ok' (borrado), 'gone' (ya no estaba) o el mensaje de error.
 */
async function del(id: string): Promise<string> {
  const native = (globalThis as any).expo?.modules?.ExpoCalendar;
  try {
    if (native?.deleteEventAsync) await native.deleteEventAsync({ id: String(id) }, { futureEvents: false });
    else await Calendar.deleteEventAsync(String(id));   // sin módulo nativo a mano (no debería pasar en el APK)
    return 'ok';
  } catch (e: any) {
    try { await Calendar.getEventAsync(String(id)); } catch { return 'gone'; }
    return String(e?.code || '') + ' ' + String(e?.message || e);
  }
}
/** Resultado de escribir en el calendario: ids nuevos, en qué calendario y qué se ha hecho (para Ajustes → Calendario). */
export type CalResult = { ids: string[]; cal: string; removed: number; updated: number; created: number; stuck: number; err: string };
/**
 * Pone en el calendario los eventos de la semana w cambiando solo lo necesario:
 * 1. Busca los que la app ya puso para esa semana (por la marca de las notas y, además, uno a uno por los ids guardados,
 *    por si la búsqueda de Android no los devuelve).
 * 2. Cada evento lleva en la marca su día y franja («[Nevú 2026-11-02 2-1]»). Si ya hay uno igual, no se toca;
 *    si cambia el plato o la hora, se cambia ese evento y ninguno más.
 * 3. Los que sobran (repetidos, de otra cuenta o de versiones antiguas) se borran y los que faltan se crean.
 * 4. Comprueba al final que no queda ninguno viejo; si Android no deja borrar alguno, lo cuenta en «stuck».
 * `alive()` se mira antes de cada paso: si devuelve false (has pulsado «Borrar los eventos de la app» o has apagado
 * la sincronización), se para sin escribir nada más.
 */
export async function calendarWrite(w: string, events: Ev[], oldIds: string[], ask = false, email?: string, alive: () => boolean = () => true): Promise<CalResult> {
  if (!(await calendarAllowed(ask))) throw new Error('Sin permiso para el calendario');
  // Un día de margen a cada lado: Android solo devuelve los eventos que empiezan y acaban dentro del rango.
  const from = new Date(+new Date(w + 'T00:00:00') - 864e5), to = new Date(+from + 10 * 864e5), cals = await writable();
  const isMine = (e: any) => ours(e, w) || (ours(e) && !TAGS.some((t) => (e.notes || '').includes(t)));
  // Iguales a uno que vamos a poner (mismo título y hora) también cuentan, aunque no tengan la marca: son repetidos.
  const twin = (e: any) => events.some((x) => x.title === e.title && Math.abs(+new Date(e.startDate) - +x.start) < 60000);
  const q = await eventsIn(cals, from, to);
  // Si Android no deja buscar, no se escribe nada: sin saber qué hay, se crearían repetidos.
  if (q.err && !q.evs.length) throw new Error('No he podido leer el calendario: ' + q.err);
  const found = q.evs.filter((e) => isMine(e) || twin(e) || oldIds.includes(String(e.id)));
  for (const id of oldIds) if (!found.some((e) => String(e.id) === String(id))) { try { const e = await Calendar.getEventAsync(String(id)); if (e && isMine(e)) found.push(e); } catch {} }
  const cal = events.length ? await pickCalendar(email) : null;
  if (events.length && !cal) throw new Error(`No encuentro en este móvil el calendario de ${email}. Comprueba en Ajustes de Android → Cuentas que esa cuenta de Google tenga activado «Calendario»`);
  const r: CalResult = { ids: [], cal: cal ? `${cal.title || 'Calendario'} (${cal.source?.name || cal.ownerAccount || ''})` : '', removed: 0, updated: 0, created: 0, stuck: 0, err: '' };
  const fields = (e: Ev) => ({ title: e.title, startDate: e.start, endDate: e.end, notes: `${e.notes}\n${TAG(w, e.key)}`, alarms: [] });
  const same = (x: any, e: Ev) => x.title === e.title && Math.abs(+new Date(x.startDate) - +e.start) < 60000 && Math.abs(+new Date(x.endDate) - +e.end) < 60000 && (x.notes || '') === fields(e).notes;
  // Los que ya están en el calendario de tu cuenta, por día-franja (el primero de cada uno; los demás son repetidos).
  const byKey = new Map<string, any>();
  for (const e of found) { const k = keyOf(e); if (k && cal && String(e.calendarId) === String(cal.id) && !byKey.has(k)) byKey.set(k, e); }
  const used = new Set<string>(), changed = new Map<string, Ev>();
  for (const e of events) {
    if (!alive()) return r;
    const old = e.key ? byKey.get(e.key) : null;
    if (old && same(old, e)) { r.ids.push(String(old.id)); used.add(String(old.id)); continue; }   // igual: no se toca
    if (old) {
      try { await Calendar.updateEventAsync(String(old.id), fields(e)); r.ids.push(String(old.id)); used.add(String(old.id)); changed.set(String(old.id), e); r.updated++; continue; }
      catch (x: any) { r.err = 'Cambiar: ' + String(x?.message || x); }
    }
    const id = String(await Calendar.createEventAsync(cal!.id, fields(e))); r.ids.push(id); used.add(id); r.created++;
  }
  // Lo que sobra: los viejos que no se han usado y los ids guardados que ya no hacen falta.
  const extra = new Set([...found.map((e) => String(e.id)), ...oldIds.map(String)].filter((id) => !used.has(id)));
  for (const id of extra) { if (!alive()) return r; const x = await del(id); if (x === 'ok') r.removed++; else if (x !== 'gone') r.err = 'Borrar: ' + x; }
  // Comprobación: ¿queda algún evento viejo? ¿Los cambiados tienen de verdad el plato y la hora nuevos?
  if (!extra.size && !changed.size) return r;
  const after = (await eventsIn(cals, from, to)).evs, byId = new Map(after.map((e) => [String(e.id), e]));
  const left = [...extra].filter((id) => byId.has(id) && ours(byId.get(id)));
  r.stuck = left.length; r.removed = Math.max(0, r.removed - left.length);
  for (const [id, e] of changed) {
    if (!alive()) return r;
    const now = byId.get(id);
    if (now && same(now, e)) continue;
    // No se ha cambiado bien: se borra y se crea de nuevo.
    r.err = 'Android no cambió un evento: lo he vuelto a crear'; r.updated--;
    if (now) { const x = await del(id); if (x === 'ok') r.removed++; else if (x !== 'gone') r.stuck++; }
    r.ids[r.ids.indexOf(id)] = String(await Calendar.createEventAsync(cal!.id, fields(e))); r.created++;
  }
  return r;
}
/** Eventos de la app que hay en cada calendario (también en los de solo lectura), para saber dónde están. */
async function scan(from: Date, to: Date) {
  const all = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT), { evs, err } = await eventsIn(all, from, to);
  const mine = evs.filter((x) => ours(x)), name = (c: any) => `${c.title || 'Calendario'}${c.source?.name && c.source.name !== c.title ? ' · ' + c.source.name : ''}${c.allowsModifications ? '' : ' (solo lectura)'}`;
  const per = all.map((c: any) => [name(c), mine.filter((e) => String(e.calendarId) === String(c.id)).length] as const).filter(([, k]) => k > 0);
  return { mine, err, where: per.map(([n, k]) => `${k} en ${n}`).join(', '), ro: new Set(all.filter((c: any) => !c.allowsModifications).map((c: any) => String(c.id))) };
}
/**
 * Borra todos los eventos que la app ha puesto en tus calendarios (de hace un año a dentro de un año) y los de los ids
 * guardados, y comprueba que ya no están. `where` dice cuántos quedan y en qué calendario (por si alguno es de solo
 * lectura: esos no se pueden borrar desde la app).
 */
export async function calendarPurge(ids: string[] = []): Promise<{ n: number; left: number; err: string; where: string }> {
  if (!(await calendarAllowed(true))) throw new Error('Sin permiso para el calendario');
  const from = new Date(Date.now() - 400 * 864e5), to = new Date(Date.now() + 400 * 864e5);
  const a = await scan(from, to);
  const todo = new Set([...a.mine.filter((e) => !a.ro.has(String(e.calendarId))).map((e) => String(e.id)), ...ids.map(String)]);
  let n = 0, e2 = '';
  for (const id of todo) { const x = await del(id); if (x === 'ok') n++; else if (x !== 'gone') e2 = x; }
  const b = await scan(from, to);
  return { n: Math.max(0, n - b.mine.length), left: b.mine.length, err: e2 || a.err, where: b.where };
}
/** Abre la app del calendario en el día de esa fecha (no escribe nada: de eso se encarga «Sincronizar»). */
export const calendarOpen = (d: Date) => Linking.openURL(`content://com.android.calendar/time/${d.getTime()}`).catch(() => {});
/** Abre la pantalla de "nuevo evento" de la app del calendario con el plato ya rellenado. */
export const calendarEvent = (e: Ev) => Calendar.createEventInCalendarAsync({ title: e.title, startDate: e.start, endDate: e.end, notes: e.notes }).catch(() => {});

/* ---------- Google: inicio de sesión y Drive privado de la app ---------- */
const DRIVE = 'https://www.googleapis.com/auth/drive.appdata';
let configured = false;
const cfg = () => { if (!configured) { GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID || undefined, scopes: [DRIVE] }); configured = true; } };
const who = (r: any) => { const u = r?.data?.user ?? r?.user; return u?.email ? { email: String(u.email) } : null; };
/** Traduce los errores de Google a algo que se entienda (y que diga qué revisar). */
export function googleError(e: any): string {
  const c = String(e?.code ?? ''), m = String(e?.message ?? e ?? '');
  if (c === '10' || /DEVELOPER_ERROR/.test(m)) return 'Google rechaza la app (código 10): el ID de cliente Android debe tener el paquete com.nevu.menu y la huella SHA-1 5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25.';
  if (c === '7' || /NETWORK/.test(m)) return 'Sin conexión a internet.';
  if (/Drive 403/.test(m) && /accessNotConfigured|has not been used|disabled/i.test(m)) return 'La API de Google Drive no está activada en tu proyecto de Google Cloud.';
  if (/Drive 403/.test(m) && /insufficient/i.test(m)) return 'Falta el permiso de Drive: cierra sesión y vuelve a iniciarla aceptando el acceso a Drive.';
  if (/Drive 401/.test(m)) return 'La sesión de Google ha caducado: vuelve a iniciarla.';
  if (/SIGN_IN_REQUIRED|getTokens/.test(m)) return 'Tienes que volver a iniciar sesión con Google.';
  return m.slice(0, 160) || 'Error desconocido';
}
/** Comprueba que se concedió el acceso a Drive; si no, lo pide. */
async function ensureDrive(user: any) {
  const scopes: string[] = user?.data?.scopes ?? user?.scopes ?? GoogleSignin.getCurrentUser()?.scopes ?? [];
  if (!scopes.includes(DRIVE)) await GoogleSignin.addScopes({ scopes: [DRIVE] });
}
export async function googleSignIn() {
  cfg(); await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const r: any = await GoogleSignin.signIn(); if (r?.type === 'cancelled') return null;
  await ensureDrive(r); return who(r);
}
export async function googleSilent() { cfg(); try { const r: any = await GoogleSignin.signInSilently(); if (r?.type === 'noSavedCredentialFound') return null; return who(r); } catch { return null; } }
export const googleOut = () => { cfg(); return GoogleSignin.signOut(); };
/** Token de acceso válido: si no hay sesión cargada, la recupera; si el token caduca, lo renueva. */
async function token(fresh = false) {
  cfg();
  if (!GoogleSignin.getCurrentUser()) { const r: any = await GoogleSignin.signInSilently(); if (r?.type !== 'success') throw new Error('SIGN_IN_REQUIRED'); await ensureDrive(r); }
  const t = (await GoogleSignin.getTokens()).accessToken;
  if (fresh) { await GoogleSignin.clearCachedAccessToken(t); return (await GoogleSignin.getTokens()).accessToken; }
  return t;
}
/** Repite una vez con un token nuevo si Drive dice que el token ha caducado (401). */
async function withToken<T>(f: (t: string) => Promise<T>) { try { return await f(await token()); } catch (e: any) { if (/Drive 401/.test(String(e?.message))) return f(await token(true)); throw e; } }
export const cloudPull = (name: string) => withToken((t) => cloud.pull(t, name));
export const cloudPush = (name: string, json: string) => withToken((t) => cloud.push(t, name, json));
export const cloudStat = (name: string) => withToken((t) => cloud.stat(t, name));
export const cloudDelete = (name: string) => withToken((t) => cloud.remove(t, name));

/* ---------- sonidos de la app ---------- */
const SOUNDS: Record<string, any> = {
  tap: require('../assets/sounds/tap.wav'), nav: require('../assets/sounds/nav.wav'), logro: require('../assets/sounds/logro.wav'),
  alarma: require('../assets/sounds/alarma.wav'), aviso: require('../assets/sounds/aviso.wav'),
  respira: require('../assets/sounds/respira.wav'), hoja: require('../assets/sounds/hoja.wav'), marca: require('../assets/sounds/marca.wav'),
  cambio: require('../assets/sounds/cambio.wav'), cierra: require('../assets/sounds/cierra.wav'), candado: require('../assets/sounds/candado.wav'),
  suelta: require('../assets/sounds/suelta.wav'), toggle: require('../assets/sounds/toggle.wav'), toggleOff: require('../assets/sounds/toggleOff.wav'),
  elige: require('../assets/sounds/elige.wav'), compra: require('../assets/sounds/compra.wav'), timer: require('../assets/sounds/timer.wav'),
  deshacer: require('../assets/sounds/deshacer.wav'),
};
// Los sonidos de la app se mezclan con tu música (no la cortan) y respetan el modo silencio en iPhone.
setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' } as any).catch(() => {});
const players: Record<string, ReturnType<typeof createAudioPlayer>> = {};

/* ---------- sonido de la presentación: una vez cada vez que la ves; al saltarla se apaga poco a poco ---------- */
let music: ReturnType<typeof createAudioPlayer> | null = null, fadeT: any = null;
export function musicStart() {
  try {
    clearInterval(fadeT);
    if (!music) music = createAudioPlayer(require('../assets/sounds/intro.wav'));
    music.loop = false; music.volume = 0.8; music.seekTo(0); music.play();
  } catch {}
}
/** Baja la música en `ms` milisegundos y la para (con 0, al momento: por ejemplo, si te vas a otra app). */
export function musicStop(ms = 1200) {
  clearInterval(fadeT); const m = music; if (!m) return;
  if (ms <= 0) { try { m.pause(); } catch {} return; }
  const from = m.volume ?? 0.8, steps = 20; let i = 0;
  fadeT = setInterval(() => { i++; try { m.volume = from * (1 - i / steps); if (i >= steps) { clearInterval(fadeT); m.pause(); } } catch { clearInterval(fadeT); } }, ms / steps);
}


/* ---------- pantalla encendida ---------- */
export const keepAwake = (on: boolean) => { try { if (on) activateKeepAwakeAsync('nevera').catch(() => {}); else Promise.resolve(deactivateKeepAwake('nevera')).catch(() => {}); } catch {} };
/** Reproduce un sonido corto de la app. Si falla (p. ej. sin audio), no hace nada. */
export function play(name: string) {
  try {
    const p = (players[name] ||= createAudioPlayer(SOUNDS[name]));
    p.seekTo(0); p.play();
  } catch {}
}

/* ---------- tipografías ---------- */
// El plugin de expo-font ya las integra en el APK; cargarlas aquí es un respaldo (por ejemplo, en Expo Go).
export const loadFonts = () => Font.loadAsync({
  'Nunito-Regular': require('../assets/fonts/Nunito-Regular.ttf'), 'Nunito-SemiBold': require('../assets/fonts/Nunito-SemiBold.ttf'),
  'Nunito-Bold': require('../assets/fonts/Nunito-Bold.ttf'), 'Nunito-ExtraBold': require('../assets/fonts/Nunito-ExtraBold.ttf'),
  'Manrope-ExtraBold': require('../assets/fonts/Manrope-ExtraBold.ttf'), 'Manrope-Bold': require('../assets/fonts/Manrope-Bold.ttf'),
}).then(() => true).catch(() => false);

/* ---------- Nevú Plus: pago único con Google Play (expo-iap) ---------- */
// Una sola conexión con Play; si falla (sin Play Store, sin internet), se vuelve a intentar la próxima vez.
let iapReady: Promise<boolean> | null = null;
const iap = () => (iapReady ??= IAP.initConnection().then((ok) => { if (!ok) iapReady = null; return !!ok; }, () => { iapReady = null; return false; }));
/** Confirma la compra a Google (si no se confirma en 3 días, Google la devuelve sola). */
const ack = (p: any) => (p.isAcknowledgedAndroid ? Promise.resolve() : IAP.finishTransaction({ purchase: p, isConsumable: false }).then(() => {}, () => {}));
/**
 * Escucha las compras: onBuy() cuando Play confirma Nevú Plus; onErr(texto) si falla (no al cancelar tú).
 * Devuelve la función para dejar de escuchar.
 */
export async function plusListen(onBuy: () => void, onErr: (why: string) => void) {
  if (!(await iap())) return () => {};
  const a = IAP.purchaseUpdatedListener(async (p: any) => { 
    if (p.productId === PLUS_ID && p.purchaseState !== 'pending') { 
      await ack(p); 
      if (p.purchaseToken) {
        await savePurchaseToken(p.purchaseToken);
      }
      onBuy(); 
    } 
  });
  const b = IAP.purchaseErrorListener((e: any) => { if (e?.code !== IAP.ErrorCode.UserCancelled) onErr(String(e?.message || e?.code || e)); });
  return () => { a.remove(); b.remove(); };
}
/** ¿Esta cuenta de Google Play tiene Nevú Plus? true / false, o null si no se ha podido preguntar (sin conexión). */
export async function plusOwned(): Promise<boolean | null> {
  if (!(await iap())) return null;
  try {
    const mine = (await IAP.getAvailablePurchases()).filter((p: any) => p.productId === PLUS_ID && p.purchaseState !== 'pending');
    await Promise.all(mine.map(ack));
    if (mine.length > 0 && mine[0].purchaseToken) {
      await savePurchaseToken(mine[0].purchaseToken);
    }
    return mine.length > 0;
  } catch { return null; }
}
/** Precio de Plus en la moneda del usuario, tal como lo pone Play (por ejemplo «3,99 €»). */
export async function plusPrice(): Promise<string> {
  if (!(await iap())) return '';
  try { const [p] = (await IAP.fetchProducts({ skus: [PLUS_ID], type: 'in-app' })) as any[]; return p?.displayPrice || ''; } catch { return ''; }
}
/** Abre la ventana de pago de Google Play. El resultado llega a plusListen. */
export async function plusBuy() {
  if (!(await iap())) throw new Error('Google Play no está disponible en este móvil');
  await IAP.requestPurchase({ request: { google: { skus: [PLUS_ID] } }, type: 'in-app' } as any);
}

/* ---------- PDF (menú y compra): HTML → PDF con las letras y las ilustraciones de la app ---------- */
/**
 * Letras y miniaturas de los platos, en base64 (src/pdf-assets.ts, lo genera tools/pdf-assets.py). No se leen de assets/:
 * en la app instalada esos archivos solo los pinta Android y el código no puede abrirlos (el PDF salía sin ilustraciones).
 */
export async function pdfAssets(dishes: string[]): Promise<PdfAssets> {
  const { PDF_FONTS, PDF_DISHES } = require('./pdf-assets');
  const fonts: PdfAssets['fonts'] = PDF_FONTS, set = new Set(dishes);
  return { fonts, img: (d) => (set.has(d) && PDF_DISHES[d] ? 'data:image/webp;base64,' + PDF_DISHES[d] : '') };
}
/** Convierte el HTML en PDF (A4, vertical o apaisado) y lo comparte o abre el diálogo de impresión. */
export async function htmlPdf(html: string, name: string, share: boolean, land: boolean) {
  const { uri } = await Print.printToFileAsync({ html, width: land ? 842 : 595, height: land ? 595 : 842 });
  if (!share) return Print.printAsync({ uri });
  const to = (FS.cacheDirectory || '') + name;
  await FS.deleteAsync(to, { idempotent: true }); await FS.moveAsync({ from: uri, to });
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(to, { mimeType: 'application/pdf', dialogTitle: name, UTI: 'com.adobe.pdf' });
}
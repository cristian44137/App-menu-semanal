// Sustituto para la vista previa en navegador (no se usa en el APK).
export const loadState = async () => null;
export const saveState = async (_: any) => {};
export const haptic = () => {};
export const buzz = () => {};
export const scheduleAll = async (_: any, __?: any) => {};
export const timerNotify = async (_: number) => {};
export const timerCancel = async () => {};
export const shareFile = async (n: string, d: string, b: boolean, m: string) => { (globalThis as any).__shared = { n, d, b, m }; };
export const pickJson = async (): Promise<string | null> => null;
export type CalResult = { ids: string[]; cal: string; removed: number; updated: number; created: number; stuck: number; err: string };
const none = (old: string[]): CalResult => ({ ids: old, cal: '', removed: 0, updated: 0, created: 0, stuck: 0, err: '' });
export const calendarWrite = async (_w: string, _: any[], old: string[], _ask = false, _e?: string, _alive?: () => boolean) => none(old);
export const calendarAllowed = async (_ask = true) => true;
export const calendarEvent = async (_: any) => {};
export const googleSignIn = async () => ({ email: 'demo@gmail.com' });
export const googleSilent = async () => null;
export const googleOut = async () => {};
export const cloudPull = async (_: string): Promise<any | null> => null;
export const cloudPush = async (_: string, __: string) => {};
export const play = (n: string) => { ((globalThis as any).__sounds ||= []).push(n); };
export const loadFonts = async () => true;
export const rootColor = (_: string) => {};
export const notifAllowed = async (): Promise<boolean | null> => null;
export const askNotifications = async () => true;
export const openNotifSettings = async () => {};
export const openExactAlarm = async () => {};
export const openBattery = async () => {};
export const googleError = (e: any) => String(e?.message || e);
export const hideSplash = async () => {};
export const cloudDelete = async (_n: string) => {};
export const cloudStat = async (_: string) => '';

export const calendarPurge = async (_ids: string[] = []) => ({ n: 0, left: 0, err: '', where: '' });
export const calendarOpen = async (_d: Date) => {};

export const musicStart = () => {};
export const musicStop = (_ms = 1200) => {};
export const keepAwake = (_on: boolean) => {};
// Nevú Plus: en la vista previa no hay Google Play.
export const plusListen = async (_a: () => void, _b: (w: string) => void) => () => {};
export const plusOwned = async (): Promise<boolean | null> => null;
export const plusPrice = async () => '';
export const plusBuy = async () => { throw new Error('Google Play no está disponible en la vista previa'); };
// PDF: en la vista previa se guarda el HTML para poder verlo (no hay impresora).
export const pdfAssets = async (dishes: string[]) => { const { PDF_FONTS, PDF_DISHES } = require('./pdf-assets'); const set = new Set(dishes); return { fonts: PDF_FONTS, img: (d: string) => (set.has(d) && PDF_DISHES[d] ? 'data:image/webp;base64,' + PDF_DISHES[d] : '') }; };
export const htmlPdf = async (html: string, name: string, share: boolean, land: boolean) => { (globalThis as any).__pdf = { html, name, share, land }; };

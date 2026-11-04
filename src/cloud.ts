// Sincronización con la carpeta privada de la app en Google Drive (appDataFolder). Lógica pura: recibe el token y fetch.
import { getPurchaseToken } from './platform';

const API = 'https://www.googleapis.com/drive/v3', UP = 'https://www.googleapis.com/upload/drive/v3';
type F = typeof fetch;
const H = (t: string) => ({ Authorization: `Bearer ${t}` });

/** Error de Drive con su código y el motivo que da Google (para explicarlo en Ajustes). */
const fail = async (r: Response) => { let why = ''; try { const j = await r.json(); why = j?.error?.errors?.[0]?.reason || j?.error?.message || ''; } catch {} return new Error(`Drive ${r.status} ${why}`.trim()); };

async function find(token: string, name: string, f: F) {
  const r = await f(`${API}/files?spaces=appDataFolder&q=${encodeURIComponent(`name='${name}'`)}&fields=files(id,modifiedTime)`, { headers: H(token) });
  if (!r.ok) throw await fail(r);
  return ((await r.json()).files || [])[0] as { id: string; modifiedTime: string } | undefined;
}

export async function pull(token: string, name: string, f: F = fetch): Promise<any | null> {
  const file = await find(token, name, f); if (!file) return null;
  const r = await f(`${API}/files/${file.id}?alt=media`, { headers: H(token) });
  if (!r.ok) throw await fail(r);
  return JSON.parse(await r.text());
}

export async function push(token: string, name: string, jsonString: string, f: F = fetch) {
  // 1. Parseamos el JSON que viene del controlador para inyectarle de forma opcional el purchaseToken si existe
  let data: any = {};
  try {
    data = JSON.parse(jsonString);
  } catch {
    data = { raw: jsonString };
  }

  const purchaseToken = await getPurchaseToken();
  if (purchaseToken) {
    data.purchaseToken = purchaseToken;
  }

  const finalJson = JSON.stringify(data);

  // 2. Buscamos si el archivo ya existe en Google Drive (appDataFolder) usando el token de acceso recibido por parámetro
  const existingFile = await find(token, name, f);
  
  // 3. Realizamos la subida (PATCH si ya existe, POST si es nuevo)
  const r = existingFile
    ? await f(`${UP}/files/${existingFile.id}?uploadType=media`, { method: 'PATCH', headers: { ...H(token), 'Content-Type': 'application/json' }, body: finalJson })
    : await f(`${UP}/files?uploadType=multipart`, { method: 'POST', headers: { ...H(token), 'Content-Type': 'multipart/related; boundary=nevera' },
        body: `--nevera\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({ name, parents: ['appDataFolder'] })}\r\n--nevera\r\nContent-Type: application/json\r\n\r\n${finalJson}\r\n--nevera--` });
  
  if (!r.ok) throw await fail(r);
}

/** Borra el archivo de la nube (para «Borrar todos mis datos»). */
export async function remove(token: string, name: string, f: F = fetch) {
  const file = await find(token, name, f); if (!file) return;
  const r = await f(`${API}/files/${file.id}`, { method: 'DELETE', headers: H(token) });
  if (!r.ok && r.status !== 404) throw await fail(r);
}

/** Fecha de la última modificación del archivo en la nube (para saber, sin descargarlo, si hay cambios). */
export async function stat(token: string, name: string, f: F = fetch) { return (await find(token, name, f))?.modifiedTime || ''; }

/** Gana siempre el cambio más reciente (campo `updated`). */
export const decide = (local: number, remote: number | undefined) => (remote && remote > local ? 'pull' : 'push') as 'pull' | 'push';
# Icono de Nevú pintado en píxeles (no vectorial): formas suaves que se funden, luz difusa y grano fino.
# Una nevera blanca con el menú de la semana sujeto con un imán, sobre el degradado «Océano», con luz y sombras suaves.
import numpy as np
from PIL import Image, ImageFilter
S = 2048                      # se pinta al doble y se reduce (bordes suaves)
yy, xx = np.mgrid[0:S, 0:S].astype(np.float32) / S
rng = np.random.default_rng(3)
hexc = lambda h: np.array([int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)], np.float32)

def blur(a, r):
    im = Image.fromarray((np.clip(a, 0, 1) * 65535).astype(np.uint16).astype(np.int32), 'I') if False else None
    m = Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8)); return np.asarray(m.filter(ImageFilter.GaussianBlur(r * S / 1024)), np.float32) / 255
def soft(sd, f=1.6):          # distancia con signo → máscara con borde suave (f en px de 1024)
    return np.clip(0.5 - sd * 1024 / f, 0, 1)
def grad(c0, c1, ax, ay, bx, by):
    t = np.clip(((xx - ax) * (bx - ax) + (yy - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2), 0, 1)[..., None]
    return hexc(c0) * (1 - t) + hexc(c1) * t
def over(dst, rgb, a):
    a = a[..., None]; dst[..., :3] = rgb * a + dst[..., :3] * (1 - a); dst[..., 3:] = a + dst[..., 3:] * (1 - a)
def screen(dst, rgb, a):
    a = a[..., None]; dst[..., :3] = dst[..., :3] + (1 - dst[..., :3]) * rgb * a

def background():
    img = np.zeros((S, S, 4), np.float32)
    over(img, grad('#2A8EF0', '#082E6B', 0.1, 0.0, 0.9, 1.0), np.ones((S, S), np.float32))
    for cx, cy, r, c, o in [(0.28, 0.18, 0.55, '#7CC4FF', 0.40), (0.85, 0.92, 0.5, '#0FA3BE', 0.35)]:
        d = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2) / r; screen(img, hexc(c), np.clip(1 - d, 0, 1) ** 2 * o)
    return img

def bowl_sd(cx, cy, R):       # medio círculo inferior con el borde de arriba un poco curvado
    d = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2) - R
    top = (cy - 0.018 * (1 - ((xx - cx) / R) ** 2)) - yy
    return np.maximum(d, top)
def leaf_sd(px, py, ang, L, Wd):  # hoja: intersección de dos círculos (vesica), base en (px, py)
    ca, sa = np.cos(ang), np.sin(ang)
    u = (xx - px) * ca + (yy - py) * sa - L / 2; v = -(xx - px) * sa + (yy - py) * ca
    r = (L * L / 4 + Wd * Wd) / (2 * Wd)
    d1 = np.sqrt(u ** 2 + (v - (r - Wd)) ** 2) - r; d2 = np.sqrt(u ** 2 + (v + (r - Wd)) ** 2) - r
    return np.maximum(d1, d2)

def rrect(cx, cy, w, h, r, ang=0.0):      # rectángulo redondeado (distancia con signo), opcionalmente girado
    ca, sa = np.cos(ang), np.sin(ang)
    u = (xx - cx) * ca + (yy - cy) * sa; v = -(xx - cx) * sa + (yy - cy) * ca
    qx, qy = np.abs(u) - w / 2 + r, np.abs(v) - h / 2 + r
    return np.sqrt(np.maximum(qx, 0) ** 2 + np.maximum(qy, 0) ** 2) + np.minimum(np.maximum(qx, qy), 0) - r

def symbol(scale=1.0, oy=0.0, mono=False):
    # Nevera blanca con volumen y, en la puerta, el menú de la semana sujeto con un imán de color.
    img = np.zeros((S, S, 4), np.float32)
    k = scale; cx, cy = 0.5, 0.5 + oy
    W, H = 0.40 * k, 0.68 * k
    body = soft(rrect(cx, cy, W, H, 0.034 * k))
    split = cy - H / 2 + H * 0.33                                              # junta entre congelador y nevera
    gap = soft(np.abs(yy - split) - 0.0045 * k) * body
    h1 = soft(rrect(cx - W / 2 + 0.06 * k, cy - H / 2 + H * 0.19, 0.02 * k, 0.12 * k, 0.006 * k))
    h2 = soft(rrect(cx - W / 2 + 0.06 * k, split + 0.13 * k, 0.02 * k, 0.17 * k, 0.006 * k))
    nx, ny, ang = cx + 0.04 * k, split + 0.21 * k, np.deg2rad(4)
    note = soft(rrect(nx, ny, 0.19 * k, 0.25 * k, 0.012 * k, ang))
    lines = [soft(rrect(nx + np.sin(ang) * -dy - 0.012 * k, ny + np.cos(ang) * dy, ln * k, 0.022 * k, 0.006 * k, ang)) for dy, ln in [(-0.04 * k, 0.115), (0.008 * k, 0.115), (0.056 * k, 0.075)]]
    mag = soft(np.sqrt((xx - (nx + 0.01 * k)) ** 2 + (yy - (ny - 0.125 * k)) ** 2) - 0.028 * k)
    if mono:
        m = np.clip(body - gap - h1 - h2, 0, 1); over(img, np.ones(3, np.float32), m); return img
    sh = np.roll(np.roll(blur(body, 30), int(0.035 * S), axis=0), int(0.012 * S), axis=1); over(img, hexc('#03163A'), sh * 0.6)
    over(img, grad('#FFFFFF', '#D3E2F1', cx - W / 2, cy - H / 2, cx + W / 2, cy + H / 2), body)
    edge = np.clip((xx - (cx + W / 2 - 0.09 * k)) / (0.09 * k), 0, 1) * body             # lado derecho en sombra: volumen
    over(img, hexc('#8FB0D4'), edge ** 1.6 * 0.55)
    top = blur(soft(rrect(cx - 0.02 * k, cy - H / 2 + 0.05 * k, W * 0.8, 0.05 * k, 0.025 * k)), 10) * body  # brillo de arriba
    screen(img, hexc('#FFFFFF'), top * 0.6)
    over(img, hexc('#5E7FA6'), gap * 0.9)
    for h in (h1, h2):
        hs = np.roll(blur(h, 5), int(0.008 * S), axis=0); over(img, hexc('#2C4F7C'), hs * body * 0.45)
        over(img, grad('#3D8FE8', '#0D3F86', 0, cy - H / 2, 0, cy + H / 2), h)
    ns = np.roll(np.roll(blur(note, 10), int(0.014 * S), axis=0), int(0.006 * S), axis=1); over(img, hexc('#2C4F7C'), ns * 0.45)
    over(img, grad('#FFB547', '#F2604A', nx - 0.1 * k, ny - 0.12 * k, nx + 0.1 * k, ny + 0.12 * k), note)
    for ln in lines: over(img, hexc('#FFFFFF'), ln * 0.95)
    ms = np.roll(blur(mag, 6), int(0.008 * S), axis=0); over(img, hexc('#5A1F2E'), ms * 0.4)
    over(img, grad('#7CF0C6', '#13A57E', nx - 0.03 * k, ny - 0.16 * k, nx + 0.04 * k, ny - 0.09 * k), mag)
    screen(img, hexc('#FFFFFF'), blur(mag * (yy < ny - 0.13 * k), 4) * mag * 0.45)
    return img

def grain(img, amt=0.018):
    n = rng.standard_normal((S, S)).astype(np.float32) * amt
    img[..., :3] = np.clip(img[..., :3] + n[..., None] * img[..., 3:], 0, 1); return img
def save(img, name, size=1024, rgb=False):
    a = (np.clip(img, 0, 1) * 255).astype(np.uint8)
    im = Image.fromarray(a, 'RGBA').resize((size, size), Image.LANCZOS)
    (im.convert('RGB') if rgb else im).save(name, optimize=True)
def comp(a, b):
    out = a.copy(); al = b[..., 3:]; out[..., :3] = b[..., :3] * al + a[..., :3] * (1 - al); out[..., 3:] = al + a[..., 3:] * (1 - al); return out

bg = background()
save(grain(comp(bg, symbol(1.0))), 'icon.png', rgb=True)
save(grain(bg.copy(), 0.014), 'adaptive-bg.png', rgb=True)
save(symbol(0.86), 'adaptive-icon.png')                     # zona segura del icono adaptativo
save(symbol(0.86, mono=True), 'adaptive-mono.png')
save(symbol(0.95), 'splash-icon.png')
save(symbol(1.35, mono=True), 'notification-icon.png', 96)

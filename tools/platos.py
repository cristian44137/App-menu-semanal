# Ilustraciones de los platos, pintadas en píxeles (no vectoriales), con el mismo estilo que el icono:
# formas sencillas y suaves, luz desde arriba a la izquierda, sombras difusas y un grano muy fino.
# Lee las recetas de src/data.ts y los colores de src/art.tsx y deja una imagen por plato en assets/platos/
# y el índice en src/platos.ts. Uso:  python3 tools/platos.py
import json, re, os, hashlib, math
import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S, OUT = 512, 384                      # se pinta a 512 px y se guarda a 384 px (nítido hasta ~130 dp en pantallas 3x)
yy, xx = np.mgrid[0:S, 0:S].astype(np.float32) / S

def hexc(h): return np.array([int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)], np.float32)
def mixc(a, b, t): return a * (1 - t) + b * t
def soft(sd, f=1.4): return np.clip(0.5 - sd * S / f, 0, 1)
def blur(a, r):
    m = Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8)); return np.asarray(m.filter(ImageFilter.GaussianBlur(r * S / 512)), np.float32) / 255
def over(img, rgb, a):
    a = a[..., None]; img[..., :3] = rgb * a + img[..., :3] * (1 - a); img[..., 3:] = a + img[..., 3:] * (1 - a)
def screen(img, rgb, a):
    a = a[..., None]; img[..., :3] = img[..., :3] + (1 - img[..., :3]) * rgb * a
def shadeop(img, a, k=0.35):          # oscurece lo que ya hay (sombra propia)
    img[..., :3] *= (1 - a[..., None] * k)
def lin(c0, c1, ax, ay, bx, by):
    t = np.clip(((xx - ax) * (bx - ax) + (yy - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2 + 1e-9), 0, 1)[..., None]
    return hexc(c0) * (1 - t) + hexc(c1) * t if isinstance(c0, str) else c0 * (1 - t) + c1 * t
def circ(cx, cy, r): return np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2) - r
def ell(cx, cy, rx, ry, ang=0.0):
    ca, sa = math.cos(ang), math.sin(ang); u = (xx - cx) * ca + (yy - cy) * sa; v = -(xx - cx) * sa + (yy - cy) * ca
    return (np.sqrt((u / rx) ** 2 + (v / ry) ** 2) - 1) * min(rx, ry)
def rrect(cx, cy, w, h, r, ang=0.0):
    ca, sa = math.cos(ang), math.sin(ang); u = (xx - cx) * ca + (yy - cy) * sa; v = -(xx - cx) * sa + (yy - cy) * ca
    qx, qy = np.abs(u) - w / 2 + r, np.abs(v) - h / 2 + r
    return np.sqrt(np.maximum(qx, 0) ** 2 + np.maximum(qy, 0) ** 2) + np.minimum(np.maximum(qx, qy), 0) - r
def lens(cx, cy, L, W, ang):          # hoja: intersección de dos círculos
    ca, sa = math.cos(ang), math.sin(ang); u = (xx - cx) * ca + (yy - cy) * sa; v = -(xx - cx) * sa + (yy - cy) * ca
    r = (L * L / 4 + W * W) / (2 * W); return np.maximum(np.sqrt(u ** 2 + (v - (r - W)) ** 2) - r, np.sqrt(u ** 2 + (v + (r - W)) ** 2) - r)
def capsule(x1, y1, x2, y2, r):
    px, py = xx - x1, yy - y1; dx, dy = x2 - x1, y2 - y1; h = np.clip((px * dx + py * dy) / (dx * dx + dy * dy + 1e-9), 0, 1)
    return np.sqrt((px - dx * h) ** 2 + (py - dy * h) ** 2) - r

def body(img, m, c, light=0.28, dark=0.30, lx=-0.7, ly=-0.7, cx=0.5, cy=0.5, R=0.2):
    """Pinta una forma con volumen: color base, luz arriba-izquierda y sombra abajo-derecha."""
    col = hexc(c) if isinstance(c, str) else c
    over(img, col, m)
    g = np.clip(((xx - cx) * lx + (yy - cy) * ly) / (R * 1.4) + 0.5, 0, 1)
    screen(img, np.ones(3, np.float32), m * g ** 2 * light)
    shadeop(img, m * (1 - g) ** 2, dark)

def drop_shadow(img, m, dy=0.02, r=10, a=0.30):
    sh = np.roll(blur(m, r), int(dy * S), axis=0); over(img, hexc('#1B2433'), sh * a)

# ---------- ingredientes (pintados dentro de una zona con centro (x, y) y tamaño s) ----------
rng = np.random.default_rng(1)
def r01(k, i): return (int(hashlib.md5(f'{k}-{i}'.encode()).hexdigest()[:6], 16) % 1000) / 1000

def ing(img, gid, col, x, y, s, k=0):
    c = hexc(col)
    t = KIND.get(gid, 'dollop')
    if t == 'leaf':
        for i in range(4):
            a = -2.2 + i * 1.1 + r01(k, i) * 0.4; L = s * (1.1 + 0.3 * r01(k, i + 9))
            m = soft(lens(x + math.cos(a) * s * 0.35, y + math.sin(a) * s * 0.3, L, L * 0.38, a))
            body(img, m, mixc(c, hexc('#1E6B3C'), 0.15 * (i % 2)), 0.25, 0.25, cx=x, cy=y, R=s)
            over(img, mixc(c, np.ones(3, np.float32), 0.35), soft(capsule(x + math.cos(a) * s * 0.0, y, x + math.cos(a) * s * 0.75, y + math.sin(a) * s * 0.6, s * 0.025)) * m * 0.6)
    elif t == 'broc':
        for i, (a, b) in enumerate([(-0.35, -0.1), (0.35, -0.12), (0, -0.4), (0.05, 0.12)]):
            m = soft(circ(x + a * s, y + b * s, s * 0.36)); body(img, m, mixc(c, hexc('#1F5E33'), 0.2 * (i % 2)), 0.3, 0.35, cx=x + a * s, cy=y + b * s, R=s * 0.36)
    elif t == 'egg':
        w = soft(ell(x, y, s * 0.95, s * 0.75, 0.3) + 0.012 * np.sin(xx * 60) * s)
        body(img, w, '#FBFAF6', 0.2, 0.15, cx=x, cy=y, R=s); yk = soft(circ(x + s * 0.12, y - s * 0.05, s * 0.36))
        body(img, yk, '#F6B12C', 0.45, 0.3, cx=x + s * 0.12, cy=y - s * 0.05, R=s * 0.36)
    elif t in ('slice', 'kiwi', 'citrus', 'coins'):
        n = 1 if t != 'coins' else 3
        for i in range(n):
            cx_, cy_ = (x, y) if n == 1 else (x + (i - 1) * s * 0.55, y + (r01(k, i) - 0.5) * s * 0.4)
            R = s * (0.72 if n == 1 else 0.38)
            outer = soft(circ(cx_, cy_, R)); body(img, outer, mixc(c, hexc('#000000'), 0.12), 0.2, 0.3, cx=cx_, cy=cy_, R=R)
            inner = soft(circ(cx_, cy_, R * 0.84)); over(img, mixc(c, np.ones(3, np.float32), 0.12 if t != 'citrus' else 0.35), inner)
            if t == 'kiwi':
                over(img, hexc('#F3EFC9'), soft(circ(cx_, cy_, R * 0.25)))
                for j in range(10):
                    a = j / 10 * 6.283; over(img, hexc('#2A2418'), soft(ell(cx_ + math.cos(a) * R * 0.42, cy_ + math.sin(a) * R * 0.42, R * 0.07, R * 0.035, a)))
            elif t == 'citrus':
                for j in range(8):
                    a = j / 8 * 6.283; over(img, mixc(c, np.ones(3, np.float32), 0.7), soft(capsule(cx_, cy_, cx_ + math.cos(a) * R * 0.78, cy_ + math.sin(a) * R * 0.78, R * 0.035)) * inner)
            elif t == 'slice':
                for j in range(4):
                    a = j / 4 * 6.283 + 0.4; over(img, mixc(c, hexc('#FFFFFF'), 0.55), soft(ell(cx_ + math.cos(a) * R * 0.45, cy_ + math.sin(a) * R * 0.45, R * 0.16, R * 0.1, a)) * 0.85)
            else:
                over(img, mixc(c, np.ones(3, np.float32), 0.3), soft(circ(cx_, cy_, R * 0.45)) * 0.5)
            screen(img, np.ones(3, np.float32), blur(inner * (yy < cy_ - R * 0.2), 4) * inner * 0.25)
    elif t == 'grain':
        m = soft(ell(x, y, s * 1.05, s * 0.78)); body(img, m, c, 0.25, 0.3, cx=x, cy=y, R=s)
        tex = rng.random((S, S)).astype(np.float32); tex = blur(tex, 1.2)
        over(img, mixc(c, np.ones(3, np.float32), 0.45), np.clip((tex - 0.53) * 9, 0, 1) * m * 0.6)
        shadeop(img, np.clip((0.47 - tex) * 9, 0, 1) * m, 0.18)
    elif t == 'pasta':
        for i in range(9):
            a = r01(k, i) * 3.1; px, py = x + (r01(k, i + 20) - 0.5) * s * 1.3, y + (r01(k, i + 40) - 0.5) * s * 0.9
            m = soft(capsule(px - math.cos(a) * s * 0.26, py - math.sin(a) * s * 0.26, px + math.cos(a) * s * 0.26, py + math.sin(a) * s * 0.26, s * 0.16))
            body(img, m, c, 0.35, 0.3, cx=px, cy=py, R=s * 0.25)
    elif t == 'beans':
        for i in range(9):
            px, py = x + (r01(k, i) - 0.5) * s * 1.4, y + (r01(k, i + 30) - 0.5) * s * 0.9
            R = s * (0.19 + 0.05 * r01(k, i + 60)); m = soft(circ(px, py, R)); body(img, m, mixc(c, hexc('#000000'), 0.1 * (i % 3)), 0.4, 0.4, cx=px, cy=py, R=R)
    elif t == 'meat':
        for i, o in enumerate((-0.42, 0, 0.42)):
            m = soft(rrect(x, y + o * s, s * 1.55, s * 0.36, s * 0.16, -0.32 + i * 0.12))
            body(img, m, mixc(c, hexc('#8A4A22'), 0.12 * i), 0.28, 0.35, cx=x, cy=y + o * s, R=s * 0.5)
            for j in (-0.35, 0.05, 0.45):   # marcas de plancha, gruesas y suaves
                over(img, hexc('#7A4423'), soft(capsule(x + j * s - s * 0.08, y + o * s - s * 0.12, x + j * s + s * 0.08, y + o * s + s * 0.12, s * 0.035)) * m * 0.55)
    elif t == 'patty':
        m = soft(ell(x, y, s * 0.85, s * 0.62)); body(img, m, c, 0.25, 0.4, cx=x, cy=y, R=s)
    elif t == 'fish':
        m = soft(rrect(x, y, s * 1.6, s * 0.78, s * 0.36, -0.25)); body(img, m, c, 0.3, 0.32, cx=x, cy=y, R=s)
        for j in (-0.35, 0.05, 0.45):
            over(img, mixc(c, np.ones(3, np.float32), 0.5), soft(capsule(x + j * s, y - s * 0.28, x + j * s - s * 0.12, y + s * 0.28, s * 0.04)) * m * 0.55)
    elif t == 'shrimp':
        for i in range(3):
            px, py = x + (i - 1) * s * 0.55, y + (r01(k, i) - 0.5) * s * 0.4
            m = np.clip(soft(np.abs(circ(px, py, s * 0.28)) - s * 0.1) * (xx > px - s * 0.05), 0, 1); body(img, m, c, 0.35, 0.3, cx=px, cy=py, R=s * 0.3)
    elif t == 'cubes':
        for i, (a, b) in enumerate([(-0.42, -0.22), (0.3, -0.32), (0, 0.28), (0.52, 0.22), (-0.45, 0.38)]):
            m = soft(rrect(x + a * s, y + b * s, s * 0.42, s * 0.42, s * 0.09, r01(k, i) * 0.6)); body(img, m, c, 0.35, 0.35, cx=x + a * s, cy=y + b * s, R=s * 0.25)
    elif t == 'shreds':
        for i in range(9):
            a = r01(k, i) * 3.1; px, py = x + (r01(k, i + 20) - 0.5) * s * 1.4, y + (r01(k, i + 40) - 0.5) * s
            m = soft(capsule(px - math.cos(a) * s * 0.16, py - math.sin(a) * s * 0.16, px + math.cos(a) * s * 0.16, py + math.sin(a) * s * 0.16, s * 0.06)); body(img, m, c, 0.35, 0.25, cx=px, cy=py, R=s * 0.15)
    elif t == 'sauce':
        d = ell(x, y, s * 1.05, s * 0.8) + 0.03 * s * np.sin(np.arctan2(yy - y, xx - x) * 5)
        m = soft(d); body(img, m, c, 0.25, 0.25, cx=x, cy=y, R=s)
        screen(img, np.ones(3, np.float32), blur(soft(ell(x - s * 0.3, y - s * 0.25, s * 0.3, s * 0.12, -0.4)), 3) * m * 0.35)
    elif t == 'toast':
        m = soft(rrect(x, y, s * 1.5, s * 1.3, s * 0.3)); body(img, m, mixc(c, hexc('#8A5A2B'), 0.3), 0.2, 0.3, cx=x, cy=y, R=s)
        crumb = soft(rrect(x, y, s * 1.3, s * 1.1, s * 0.24)); body(img, crumb, mixc(c, hexc('#FFF3D6'), 0.35), 0.15, 0.2, cx=x, cy=y, R=s)
    elif t == 'ham':
        for i in range(2):
            m = soft(ell(x + (i - 0.5) * s * 0.55, y + (i - 0.5) * s * 0.2, s * 0.7, s * 0.45, 0.5 - i))
            body(img, m, mixc(c, hexc('#FFFFFF'), 0.1 * i), 0.3, 0.25, cx=x, cy=y, R=s * 0.7)
    elif t == 'avo':
        o = soft(ell(x, y, s * 0.62, s * 0.85, 0.5)); body(img, o, '#3F6B2A', 0.2, 0.3, cx=x, cy=y, R=s)
        i_ = soft(ell(x, y, s * 0.52, s * 0.75, 0.5)); body(img, i_, '#C9DC7A', 0.25, 0.2, cx=x, cy=y, R=s)
        p = soft(circ(x + s * 0.1, y + s * 0.18, s * 0.24)); body(img, p, '#8A5A33', 0.4, 0.35, cx=x + s * 0.1, cy=y + s * 0.18, R=s * 0.24)
    elif t == 'banana':
        for i, (a, b) in enumerate([(-0.4, -0.2), (0.35, -0.3), (0, 0.35)]):
            m = soft(circ(x + a * s, y + b * s, s * 0.34)); body(img, m, '#F2DC8C', 0.3, 0.25, cx=x + a * s, cy=y + b * s, R=s * 0.34)
            over(img, hexc('#FBF1C8'), soft(circ(x + a * s, y + b * s, s * 0.26)))
    elif t == 'berries':
        cols = ['#6B3FA0', col, '#D3394F', '#4A3A8C', col]
        for i, (a, b) in enumerate([(-0.4, -0.2), (0.3, -0.35), (0, 0.3), (0.5, 0.25), (-0.45, 0.4)]):
            m = soft(circ(x + a * s, y + b * s, s * 0.25)); body(img, m, cols[i], 0.45, 0.4, cx=x + a * s, cy=y + b * s, R=s * 0.25)
    elif t == 'nuts':
        for i, (a, b) in enumerate([(-0.4, -0.15), (0.3, -0.3), (0, 0.3), (0.5, 0.25)]):
            m = soft(ell(x + a * s, y + b * s, s * 0.3, s * 0.2, i * 0.7)); body(img, m, c, 0.3, 0.4, cx=x + a * s, cy=y + b * s, R=s * 0.3)
    elif t == 'choco':
        m = soft(rrect(x, y, s * 1.4, s * 1.0, s * 0.08, -0.15)); body(img, m, c, 0.2, 0.35, cx=x, cy=y, R=s)
        for i in (-0.23, 0.23):
            shadeop(img, soft(np.abs(rrect(x, y, s * 1.4, s * 1.0, 0.0, -0.15)) * 0 + np.abs((xx - x) * math.cos(-0.15) + (yy - y) * math.sin(-0.15) - i * s) - s * 0.02) * m, 0.4)
    elif t == 'seeds':
        for i in range(10):
            px, py = x + (r01(k, i) - 0.5) * s * 1.4, y + (r01(k, i + 30) - 0.5) * s
            over(img, c, soft(circ(px, py, s * 0.05)) * 0.9)
    elif t == 'shroom':
        for i, (a, b) in enumerate([(-0.4, -0.1), (0.35, -0.2), (0, 0.35)]):
            cap = soft(np.maximum(circ(x + a * s, y + b * s, s * 0.36), (yy - (y + b * s)))); body(img, cap, c, 0.3, 0.3, cx=x + a * s, cy=y + b * s - s * 0.1, R=s * 0.36)
            st = soft(rrect(x + a * s, y + b * s + s * 0.12, s * 0.2, s * 0.26, s * 0.06)); body(img, st, mixc(c, np.ones(3, np.float32), 0.3), 0.2, 0.2, cx=x + a * s, cy=y + b * s, R=s * 0.2)
    elif t == 'wedges':
        for i, (a, b, r) in enumerate([(-0.4, -0.15, -0.4), (0.3, -0.3, 0.5), (0.05, 0.35, 1.4)]):
            m = soft(np.maximum(ell(x + a * s, y + b * s, s * 0.5, s * 0.28, r), -((xx - (x + a * s)) * math.sin(r) - (yy - (y + b * s)) * math.cos(r)) - s * 0.05))
            body(img, m, c, 0.35, 0.35, cx=x + a * s, cy=y + b * s, R=s * 0.4)
    elif t == 'dumpling':
        for i, (a, b) in enumerate([(-0.4, -0.1), (0.4, -0.15), (0, 0.4)]):
            m = soft(np.maximum(ell(x + a * s, y + b * s, s * 0.42, s * 0.32), (y + b * s + s * 0.1) - yy - 0.0) * 0 + ell(x + a * s, y + b * s, s * 0.42, s * 0.3))
            body(img, m, c, 0.35, 0.3, cx=x + a * s, cy=y + b * s, R=s * 0.4)
    elif t == 'drizzle':
        for i in range(2):
            m = soft(capsule(x - s * 0.8, y + i * s * 0.25 - s * 0.1, x + s * 0.8, y + i * s * 0.25 + s * 0.05, s * 0.07)); over(img, c, m * 0.85)
    elif t == 'strips':
        for i, o in enumerate((-0.35, 0.05, 0.42)):
            m = soft(np.abs(circ(x, y + o * s + s * 0.9, s * 0.9)) - s * 0.09) * (np.abs(xx - x) < s * 0.7)
            body(img, m, mixc(c, hexc('#000000'), 0.1 * (i % 2)), 0.3, 0.25, cx=x, cy=y, R=s)
    elif t == 'balls':
        for i, (a, b) in enumerate([(-0.35, -0.15), (0.35, -0.2), (0, 0.32)]):
            m = soft(circ(x + a * s, y + b * s, s * 0.32)); body(img, m, c, 0.35, 0.28, cx=x + a * s, cy=y + b * s, R=s * 0.32)
    elif t == 'greenbeans':
        for i in range(5):
            a = -0.6 + i * 0.3; m = soft(capsule(x - s * 0.7, y + (i - 2) * s * 0.18 - s * 0.1 * math.sin(a), x + s * 0.7, y + (i - 2) * s * 0.18 + s * 0.1 * math.sin(a), s * 0.075))
            body(img, m, mixc(c, hexc('#1F4F22'), 0.12 * (i % 2)), 0.35, 0.3, cx=x, cy=y, R=s * 0.6)
    else:   # dollop: una cucharada cremosa con un remolino de luz
        d = ell(x, y, s * 0.95, s * 0.72) + 0.02 * s * np.sin(np.arctan2(yy - y, xx - x) * 4)
        m = soft(d); body(img, m, c, 0.3, 0.25, cx=x, cy=y, R=s)
        screen(img, np.ones(3, np.float32), blur(soft(np.abs(circ(x - s * 0.05, y - s * 0.05, s * 0.4)) - s * 0.06) * (yy < y), 3) * m * 0.35)

KIND = {
    'huevo': 'egg', 'espin': 'leaf', 'ensal': 'leaf', 'brocoli': 'broc', 'mene': 'beans', 'tomf': 'slice', 'tomrall': 'sauce', 'tfrito': 'sauce', 'salmo': 'sauce',
    'arroz': 'grain', 'quinoa': 'grain', 'cuscus': 'grain', 'avena': 'grain', 'pasta': 'pasta', 'noq': 'pasta', 'garb': 'beans', 'lent': 'beans', 'guis': 'beans',
    'edama': 'beans', 'maiz': 'beans', 'alub': 'beans', 'pollo': 'meat', 'ptira': 'meat', 'kebab': 'meat', 'brocht': 'meat', 'hamb': 'patty', 'salmahu': 'fish',
    'merluza': 'fish', 'salmon': 'fish', 'atun': 'fish', 'sardi': 'fish', 'gambas': 'shrimp', 'queso': 'shreds', 'tofu': 'cubes', 'boniato': 'cubes', 'mango': 'cubes',
    'pan': 'toast', 'pcent': 'toast', 'hpro': 'toast', 'pita': 'toast', 'tort': 'toast', 'base': 'toast', 'pavo': 'ham', 'jamon': 'ham', 'aguac': 'avo',
    'platano': 'banana', 'frojos': 'berries', 'kiwi': 'kiwi', 'limon': 'citrus', 'zumo': 'citrus', 'zmanz': 'wedges', 'fruta': 'wedges', 'fsecos': 'nuts',
    'cacah': 'dollop', 'choco': 'choco', 'cacao': 'seeds', 'chia': 'seeds', 'zan': 'coins', 'calab': 'coins', 'beren': 'coins', 'jengi': 'coins', 'pimi': 'strips',
    'ceb': 'strips', 'champ': 'shroom', 'patata': 'wedges', 'pcoc': 'wedges', 'tpat': 'wedges', 'gyoz': 'dumpling', 'miel': 'drizzle', 'mozz': 'balls', 'judv': 'greenbeans',
}
EXTRA_COL = {'alub': '#EFE6D2', 'judv': '#4E9A3C', 'salmon': '#F08A63', 'mozz': '#FAF7EE', 'qbat': '#F8F6F0', 'beren': '#6E3F7A', 'zmanz': '#E9C25A', 'mango': '#F4A93A'}

# ---------- recipientes ----------
def ground_shadow(img, cx, cy, rx, ry, a=0.35):
    over(img, hexc('#1B2433'), blur(soft(ell(cx, cy, rx, ry)), 14) * a)

def plate(img, ids, cols):
    ground_shadow(img, 0.5, 0.56, 0.42, 0.38)
    m = soft(circ(0.5, 0.5, 0.42)); over(img, lin('#FFFFFF', '#E3E8EE', 0.2, 0.2, 0.8, 0.85), m)
    well = soft(circ(0.5, 0.5, 0.31)); shadeop(img, blur(np.clip(m - well, 0, 1), 6) * well, 0.08)
    over(img, lin('#FBFBFA', '#EEF1F4', 0.3, 0.3, 0.7, 0.7), well * 0.9)
    shadeop(img, soft(np.abs(circ(0.5, 0.5, 0.315)) - 0.004) * 0.6, 0.25)
    items = ids[:4] or ['fruta']
    base = next((g for g in items if KIND.get(g, 'dollop') in ('grain', 'pasta', 'beans')), None)
    if base and len(items) > 1:   # la guarnición (arroz, pasta, legumbre) ocupa un lado del plato y lo demás va al otro
        mk = soft(ell(0.4, 0.56, 0.17, 0.15)); fill(img, blur(mk, 3), base, cols[base], 0.4, 0.56, 0.15, 0.13, 2, 0.08)
        items = [g for g in items if g != base]; sp = spots(len(items), 0.6, 0.42, 0.2) if len(items) > 1 else [(0.62, 0.42)]
    else: sp = spots(len(items), 0.5, 0.5, 0.23)
    for i, (gid, (x, y)) in enumerate(zip(items, sp)):
        layer = np.zeros((S, S, 4), np.float32); ing(layer, gid, cols[gid], x, y, 0.15 if len(items) > 1 else 0.2, i)
        drop_shadow(img, layer[..., 3], 0.012, 5, 0.22); comp_into(img, layer)

def spots(n, cx, cy, R):
    if n <= 1: return [(cx, cy)] * n
    return [(cx + math.cos(i / n * 6.283 - 1.2) * R * 0.75, cy + math.sin(i / n * 6.283 - 1.2) * R * 0.62) for i in range(n)]

def comp_into(img, layer):
    a = layer[..., 3:]; img[..., :3] = layer[..., :3] + img[..., :3] * (1 - a); img[..., 3:] = a + img[..., 3:] * (1 - a)

BASES = ('grain', 'beans', 'pasta', 'leaf', 'sauce', 'dollop', 'cubes', 'meat')
def fill(img, mask, gid, col, cx, cy, rx, ry, k=0, s=0.09):
    """Cubre una superficie (cuenco, sartén, plato) con el ingrediente base, en varias tandas solapadas."""
    layer = np.zeros((S, S, 4), np.float32)
    pts = [(0, 0), (-0.55, -0.1), (0.55, -0.1), (-0.3, 0.45), (0.3, 0.45), (-0.25, -0.5), (0.3, -0.45), (-0.8, 0.25), (0.8, 0.25)]
    for i, (a, b) in enumerate(pts): ing(layer, gid, col, cx + a * rx, cy + b * ry, s, k + i)
    layer[..., :3] *= mask[..., None]; layer[..., 3] *= mask; comp_into(img, layer)

def bowl(img, ids, cols, glaze, food=True, liquid=None, steam=False):
    ground_shadow(img, 0.5, 0.82, 0.38, 0.07, 0.4)
    top = 0.47
    outer = soft(np.maximum(ell(0.5, top, 0.42, 0.14), -10) * 0 + np.where(yy < top, ell(0.5, top, 0.42, 0.14), ell(0.5, top, 0.42, 0.37)))
    body(img, outer, glaze, 0.25, 0.35, cx=0.5, cy=0.6, R=0.4)
    # filo claro y boca del cuenco
    rim = soft(ell(0.5, top, 0.42, 0.14)); over(img, mixc(hexc(glaze), np.ones(3, np.float32), 0.5), rim)
    inner = soft(ell(0.5, top + 0.006, 0.385, 0.118))
    if liquid is not None:
        over(img, lin(mixc(liquid, np.ones(3, np.float32), 0.15), mixc(liquid, np.zeros(3, np.float32), 0.12), 0.5, top - 0.1, 0.5, top + 0.1), inner)
        screen(img, np.ones(3, np.float32), blur(soft(ell(0.4, top - 0.03, 0.15, 0.03, -0.1)), 4) * inner * 0.4)
    else:
        over(img, hexc('#F7F3EC'), inner); shadeop(img, inner * np.clip((top + 0.1 - yy) / 0.2, 0, 1), 0.15)
    if food:
        items = [g for g in ids if not (liquid is not None and KIND.get(g, 'dollop') in ('dollop', 'sauce'))]
        if liquid is None:
            base = next((g for g in items if KIND.get(g, 'dollop') in BASES), None)
            if base: fill(img, inner, base, cols[base], 0.5, top + 0.005, 0.32, 0.09, 1, 0.075); items = [g for g in items if g != base]
        items = items[:3]
        for i, gid in enumerate(items):
            x = 0.5 + (i - (len(items) - 1) / 2) * 0.22; y = top - 0.01 + (0.025 if i % 2 else -0.02)
            layer = np.zeros((S, S, 4), np.float32); ing(layer, gid, cols[gid], x, y, 0.115, i)
            layer[..., :3] *= (inner + (1 - inner) * (yy < top + 0.02))[..., None]; layer[..., 3] *= inner + (1 - inner) * (yy < top + 0.02)   # lo que asoma por encima del filo
            drop_shadow(img, layer[..., 3], 0.008, 4, 0.2); comp_into(img, layer)
    # brillo del esmalte
    screen(img, np.ones(3, np.float32), blur(soft(capsule(0.2, top + 0.1, 0.3, top + 0.27, 0.025)), 5) * outer * 0.45)
    if steam: add_steam(img, 0.5, top - 0.12)

def add_steam(img, x, y):
    for i, dx in enumerate((-0.07, 0.0, 0.07)):
        pts = [(x + dx + 0.025 * math.sin(j * 1.3 + i), y - j * 0.035) for j in range(6)]
        m = np.zeros((S, S), np.float32)
        for (a, b), (c, d) in zip(pts, pts[1:]): m = np.maximum(m, soft(capsule(a, b, c, d, 0.012)))
        over(img, np.ones(3, np.float32), blur(m, 4) * 0.55 * np.clip((yy - (y - 0.22)) / 0.12, 0, 1))

def glass(img, ids, cols, liq):
    ground_shadow(img, 0.5, 0.86, 0.2, 0.05, 0.4)
    def shape(top, bot, wt, wb, r=0.02):
        t = np.clip((yy - top) / (bot - top), 0, 1); w = wt + (wb - wt) * t
        return np.maximum(np.abs(xx - 0.5) - w, np.maximum(top - yy, yy - bot))
    g = soft(shape(0.14, 0.86, 0.2, 0.16)); over(img, hexc('#EAF3FA'), g * 0.55)
    lq = soft(shape(0.32, 0.845, 0.188, 0.15)); over(img, lin(mixc(liq, np.ones(3, np.float32), 0.2), mixc(liq, np.zeros(3, np.float32), 0.15), 0.5, 0.3, 0.5, 0.85), lq)
    over(img, mixc(liq, np.ones(3, np.float32), 0.35), soft(ell(0.5, 0.32, 0.188, 0.03)) * lq.max())
    screen(img, np.ones(3, np.float32), blur(soft(capsule(0.37, 0.2, 0.39, 0.8, 0.018)), 3) * 0.55)
    screen(img, np.ones(3, np.float32), blur(soft(capsule(0.62, 0.25, 0.61, 0.6, 0.008)), 2) * 0.35)
    shadeop(img, soft(np.abs(shape(0.14, 0.86, 0.2, 0.16)) - 0.004) * 0.8, 0.12)
    fruit = next((g for g in ids if g in ('limon', 'kiwi', 'zumo', 'frojos', 'platano', 'mango', 'fruta')), None)
    if fruit:
        layer = np.zeros((S, S, 4), np.float32); ing(layer, fruit, cols[fruit], 0.68, 0.17, 0.1, 3); comp_into(img, layer)

def mug(img, ids, cols, glaze, liq):
    ground_shadow(img, 0.47, 0.84, 0.3, 0.06, 0.4)
    h = soft(np.abs(ell(0.78, 0.56, 0.1, 0.13)) - 0.022) * (xx > 0.72); body(img, h, glaze, 0.2, 0.35, cx=0.8, cy=0.56, R=0.12)
    b = soft(rrect(0.47, 0.58, 0.5, 0.5, 0.08)); body(img, b, glaze, 0.3, 0.38, cx=0.47, cy=0.58, R=0.3)
    over(img, mixc(hexc(glaze), np.ones(3, np.float32), 0.45), soft(ell(0.47, 0.34, 0.25, 0.055)))
    over(img, lin(mixc(liq, np.ones(3, np.float32), 0.1), mixc(liq, np.zeros(3, np.float32), 0.15), 0.5, 0.31, 0.5, 0.37), soft(ell(0.47, 0.345, 0.215, 0.04)))
    screen(img, np.ones(3, np.float32), blur(soft(capsule(0.3, 0.42, 0.3, 0.72, 0.022)), 4) * b * 0.45)
    add_steam(img, 0.47, 0.25)

def jar(img, ids, cols):
    ground_shadow(img, 0.5, 0.86, 0.24, 0.05, 0.4)
    base = next((g for g in ids if g in ('yogur', 'gri', 'skyr', 'kefir', 'leche', 'qbat', 'soja', 'cott')), None)
    lay2 = next((g for g in ids if g in ('avena', 'chia', 'frojos', 'mango', 'kiwi', 'fruta', 'cacao')), None)
    g = soft(rrect(0.5, 0.56, 0.44, 0.58, 0.09)); over(img, hexc('#EAF3FA'), g * 0.55)
    c1 = hexc(cols.get(base, '#F6F3EC')); c2 = hexc(cols.get(lay2, '#E3C98F'))
    over(img, mixc(c2, np.ones(3, np.float32), 0.15), soft(rrect(0.5, 0.735, 0.4, 0.19, 0.07)))
    over(img, c1, soft(rrect(0.5, 0.56, 0.4, 0.17, 0.02)))
    tops = [x for x in ids if x not in (base,)][:2]
    for i, gid in enumerate(tops):
        layer = np.zeros((S, S, 4), np.float32); ing(layer, gid, cols[gid], 0.42 + i * 0.16, 0.45, 0.065, i); comp_into(img, layer)
    screen(img, np.ones(3, np.float32), blur(soft(capsule(0.33, 0.35, 0.33, 0.78, 0.018)), 3) * 0.5)
    lid = soft(rrect(0.5, 0.27, 0.48, 0.07, 0.03)); body(img, lid, '#C9D6E3', 0.3, 0.3, cx=0.5, cy=0.27, R=0.24)

def board(img, ids, cols):
    ground_shadow(img, 0.5, 0.78, 0.44, 0.08, 0.38)
    b = soft(rrect(0.5, 0.6, 0.9, 0.42, 0.06)); body(img, b, '#C98D55', 0.22, 0.3, cx=0.5, cy=0.6, R=0.43)
    tex = blur(rng.random((S, S)).astype(np.float32), 1.5); streak = np.clip(np.sin((yy * 60 + tex * 3) ) * 0.5 + 0.5, 0, 1)
    shadeop(img, b * streak * 0.5, 0.12)
    over(img, hexc('#B07440'), soft(circ(0.89, 0.62, 0.025)) * 0.9)
    bread = next((g for g in ids if g in ('pan', 'pcent', 'hpro', 'pita', 'base', 'tort')), 'pan')
    top = [g for g in ids if g != bread][:2]
    for j, bx in enumerate((0.33, 0.66)):
        layer = np.zeros((S, S, 4), np.float32); ing(layer, bread, cols[bread], bx, 0.56, 0.165, j)
        for i, gid in enumerate(top): ing(layer, gid, cols[gid], bx + (i - 0.5) * 0.07, 0.55 + (i - 0.5) * 0.05, 0.1, i + j)
        drop_shadow(img, layer[..., 3], 0.015, 6, 0.3); comp_into(img, layer)

def pan(img, ids, cols):
    ground_shadow(img, 0.47, 0.72, 0.4, 0.12, 0.38)
    h = soft(rrect(0.86, 0.5, 0.24, 0.06, 0.03, -0.25)); body(img, h, '#3A2E28', 0.2, 0.3, cx=0.86, cy=0.5, R=0.12)
    p = soft(ell(0.46, 0.6, 0.38, 0.26)); body(img, p, '#2F3A44', 0.2, 0.3, cx=0.46, cy=0.6, R=0.38)
    inn = soft(ell(0.46, 0.585, 0.33, 0.21)); over(img, lin('#46525E', '#2A333C', 0.3, 0.45, 0.6, 0.75), inn)
    items = ids[:3] or ['huevo']
    for i, gid in enumerate(items):
        x = 0.46 + (i - (len(items) - 1) / 2) * 0.2; y = 0.585 + (0.04 if i % 2 else -0.02)
        layer = np.zeros((S, S, 4), np.float32); ing(layer, gid, cols[gid], x, y, 0.135, i); layer[..., :3] *= inn[..., None]; layer[..., 3] *= inn
        drop_shadow(img, layer[..., 3], 0.01, 5, 0.25); comp_into(img, layer)
    screen(img, np.ones(3, np.float32), blur(soft(np.abs(ell(0.46, 0.6, 0.38, 0.26)) - 0.006) * (yy < 0.55), 3) * 0.35)

def wrap(img, ids, cols):
    ground_shadow(img, 0.5, 0.66, 0.42, 0.22, 0.3)
    pl = soft(ell(0.5, 0.6, 0.44, 0.24)); over(img, lin('#FFFFFF', '#E3E8EE', 0.2, 0.4, 0.8, 0.8), pl)
    ang = -0.35
    w = soft(rrect(0.46, 0.56, 0.56, 0.22, 0.11, ang)); body(img, w, '#E9CF96', 0.25, 0.3, cx=0.46, cy=0.56, R=0.28)
    endc = soft(ell(0.71, 0.47, 0.07, 0.11, ang)); over(img, hexc('#F3E2B8'), endc)
    fill = [g for g in ids if g != 'tort'][:3]
    for i, gid in enumerate(fill):
        layer = np.zeros((S, S, 4), np.float32); ing(layer, gid, cols[gid], 0.71 + (i - 1) * 0.025, 0.47 + (i - 1) * 0.035, 0.06, i); layer[..., :3] *= endc[..., None]; layer[..., 3] *= endc; comp_into(img, layer)
    shadeop(img, soft(np.abs(rrect(0.46, 0.56, 0.56, 0.22, 0.11, ang)) - 0.004) * 0.6, 0.2)

# ---------- qué recipiente (igual que dishKind en src/art.tsx) ----------
def kind(name, ids, slot):
    n = name.lower()
    if re.search(r'infusión|manzanilla|leche con cacao|leche caliente|bebida de soja con cacao', n): return 'mug'
    if slot == 5 or re.match(r'^(zumo|batido|vaso de|agua con|limonada)', n): return 'glass'
    if re.search(r'^wrap|^mini wrap|quesadilla|^tacos|^pita de|^pan de pita', n): return 'wrap'
    if re.search(r'^tostada|^pan de|sándwich|sandwich|bocadillo|pita|pizza', n): return 'board'
    if re.search(r'^sopa|^crema de|caldo|salmorejo|curry|estofad|porridge|^lentejas|guisad', n): return 'soup'
    if re.search(r'overnight|^yogur|skyr|^kéfir con|^kefir con|pudin|^queso batido', n): return 'jar'
    if re.search(r'tortilla|revuelto|shakshuka|huevos revueltos', n): return 'pan'
    if re.search(r'bowl|poke|^ensalada|^bol ', n): return 'bowl'
    return 'plate'

LIQ = ['cacao', 'frojos', 'mango', 'zumo', 'zmanz', 'espin', 'kiwi', 'platano', 'salmo', 'tfrito', 'lent', 'garb', 'alub', 'calab', 'caldo', 'leche', 'soja', 'kefir', 'skyr', 'avena', 'limon', 'manza', 'miel']
def liquid(ids, cols):
    i = next((x for x in LIQ if x in ids), ids[0] if ids else 'leche')
    special = {'cacao': '#7A4B2E', 'manza': '#E9C46A', 'miel': '#E9C46A', 'limon': '#F4E9A8', 'calab': '#9CC46A', 'garb': '#E6A94E', 'espin': '#7DBA5A', 'frojos': '#C24C6E', 'zmanz': '#EBC963'}
    return hexc(special.get(i, cols.get(i, '#E9C46A')))

GLAZE = ['#F2D7A6', '#F4C2AE', '#B9D3EC', '#BFE3D0', '#D9CBF0', '#BCE6EE']   # esmaltes suaves por franja

def paint(name, ids, slot, cols):
    img = np.zeros((S, S, 4), np.float32)
    k = kind(name, ids, slot); items = [g for g in dict.fromkeys(ids) if g in cols]
    glaze = GLAZE[slot if 0 <= slot < 6 else 1]
    hot = bool(re.search(r'sopa|crema|caldo|porridge|curry|estofad|lentejas|guisad', name.lower()))
    if k == 'glass': glass(img, items, cols, liquid(items, cols))
    elif k == 'mug': mug(img, items, cols, glaze, liquid(items, cols))
    elif k == 'soup': bowl(img, items, cols, glaze, True, liquid(items, cols), hot)
    elif k == 'jar': jar(img, items, cols)
    elif k == 'board': board(img, items, cols)
    elif k == 'pan': pan(img, items, cols)
    elif k == 'wrap': wrap(img, items, cols)
    elif k == 'bowl': bowl(img, items, cols, glaze, True)
    else: plate(img, items, cols)
    # grano muy fino para que no parezca vectorial
    n = rng.standard_normal((S, S)).astype(np.float32) * 0.012
    img[..., :3] = np.clip(img[..., :3] + n[..., None] * img[..., 3:], 0, 1)
    rgb = np.where(img[..., 3:] > 1e-4, img[..., :3] / np.maximum(img[..., 3:], 1e-4), 0)   # los colores van premultiplicados
    a = (np.clip(np.concatenate([rgb, img[..., 3:]], -1), 0, 1) * 255).astype(np.uint8)
    return Image.fromarray(a, 'RGBA').resize((OUT, OUT), Image.LANCZOS)

def slug(name): return hashlib.md5(name.encode()).hexdigest()[:10]

if __name__ == '__main__':
    import sys
    data = open(os.path.join(ROOT, 'src/data.ts')).read(); art = open(os.path.join(ROOT, 'src/art.tsx')).read()
    cols = dict(re.findall(r"(\w+): '(#[0-9A-Fa-f]{6})'", art[art.index('export const COL'):art.index('};', art.index('export const COL'))])); cols.update({k: v for k, v in EXTRA_COL.items() if k not in cols})
    dishes = []
    for key, slot in (('D', 0), ('C', 1), ('N', 2), ('M', 3), ('B', 5)):
        a = data.index(f'\n{key}: [\n'); b = data.index('\n],', a)
        for line in data[a:b].split('\n'):
            line = line.strip().rstrip(',')
            if line.startswith('["'):
                m = json.loads(line); dishes.append((m[0], [g for g, _ in m[3]], slot))
    scr = open(os.path.join(ROOT, 'src/screens.ts')).read()
    for ids, n, s in re.findall(r"i: \[([^\]]*)\], n: '([^']*)', s: (\d)", scr): dishes.append((n, re.findall(r"'(\w+)'", ids), int(s)))
    only = [x for x in sys.argv[1:] if not x.startswith('--')]
    # --parte=i/n: pinta solo uno de cada n platos (para repartir el trabajo entre varios procesos); --indice: solo el índice
    part = next((x.split('=')[1] for x in sys.argv[1:] if x.startswith('--parte=')), None)
    solo_indice = '--indice' in sys.argv
    os.makedirs(os.path.join(ROOT, 'assets/platos'), exist_ok=True)
    seen = {}
    for name, ids, slot in dishes:
        if name in seen or (only and not any(o.lower() in name.lower() for o in only)): continue
        seen[name] = slug(name)
        if solo_indice or (part and len(seen) % int(part.split('/')[1]) != int(part.split('/')[0])): continue
        if part and os.path.exists(os.path.join(ROOT, 'assets/platos', seen[name] + '.webp')): continue   # ya pintado
        paint(name, ids, slot, cols).save(os.path.join(ROOT, 'assets/platos', seen[name] + '.webp'), 'WEBP', quality=84, method=6)
    if not only and not part:
        lines = ['// Generado por tools/platos.py: ilustración pintada de cada plato (no lo edites a mano).', 'export const PLATOS: Record<string, any> = {']
        lines += [f'  {json.dumps(n, ensure_ascii=False)}: require(\'../assets/platos/{s}.webp\'),' for n, s in seen.items()]
        open(os.path.join(ROOT, 'src/platos.ts'), 'w').write('\n'.join(lines) + '\n};\n')
    print(len(seen), 'platos pintados')

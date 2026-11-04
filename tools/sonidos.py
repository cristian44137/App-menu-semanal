# Sonidos de Nevú, hechos para la app. Todos suaves y en re mayor pentatónico (re, mi, fa#, la, si), así
# suenan bien juntos, pero cada tipo de acción tiene su propio timbre para que no parezcan el mismo:
#   madera (toques y temporizador) · aire (pestañas y hojas) · gota (interruptores) · kalimba (compra y cambios)
#   cristal (elegir, aviso, compra completa) · cuenco (logros y presentación, como el de la respiración).
# Uso: python3 tools/sonidos.py            → escribe los WAV en assets/sounds (respira.wav no se toca)
# Para cambiar un sonido, cambia su línea al final (notas, duración o volumen en dB) y vuelve a ejecutar.
import numpy as np, os, wave
from scipy.signal import butter, sosfilt, fftconvolve
SR = 44100; rng = np.random.default_rng(5)
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'sounds')
N = lambda m: 440 * 2 ** ((m - 69) / 12)
# Notas (MIDI): D3=50 … D6=86
D3, A3, D4, Fs4, A4, B4, D5, E5, Fs5, A5, B5, D6 = 50, 57, 62, 66, 69, 71, 74, 76, 78, 81, 83, 86

def cuenco(m, dur=0.5, att=0.006, dec=0.2, beat=1.6, metal=0.25):
    """Un cuenco: dos tonos que laten + un armónico (2,71×) que se apaga antes. att y dec en segundos."""
    t = np.arange(int(SR * dur)) / SR; f = N(m)
    x = np.sin(2 * np.pi * f * t) + 0.85 * np.sin(2 * np.pi * (f + beat) * t)
    x += metal * np.sin(2 * np.pi * f * 2.71 * t) * np.exp(-t / (dec * 0.35))
    env = np.minimum(1, t / att) ** 2 * np.exp(-t / dec)
    env[-int(0.01 * SR):] *= np.linspace(1, 0, int(0.01 * SR))
    return sosfilt(butter(2, 3200, 'lowpass', fs=SR, output='sos'), x * env)

def madera(m, dur=0.18, dec=0.035):
    """Golpe de madera blanda («toc»): tono corto + un parcial de 2,6× y un roce muy breve."""
    t = np.arange(int(SR * dur)) / SR; f = N(m)
    x = np.sin(2 * np.pi * f * t) * np.exp(-t / dec) + 0.35 * np.sin(2 * np.pi * f * 2.6 * t) * np.exp(-t / (dec * 0.4))
    x += 0.15 * sosfilt(butter(2, [1500, 4500], 'bandpass', fs=SR, output='sos'), rng.standard_normal(len(t))) * np.exp(-t / 0.004)
    return sosfilt(butter(2, 3500, 'lowpass', fs=SR, output='sos'), x * np.minimum(1, t / 0.0015))

def aire(dur=0.22, lo=500, hi=1800, sube=True):
    """Soplo de aire (ruido filtrado que se mueve hacia arriba o hacia abajo), como pasar una hoja."""
    n = int(SR * dur); noise = rng.standard_normal(n); out = np.zeros(n); seg = 512
    for i in range(0, n, seg):
        p = i / n; p = p if sube else 1 - p; fc = lo * (hi / lo) ** p
        sos = butter(2, [fc * 0.7, min(fc * 1.4, SR / 2 - 100)], 'bandpass', fs=SR, output='sos')
        out[i:i + seg] = sosfilt(sos, noise[max(0, i - 2048):i + seg])[-len(noise[i:i + seg]):]
    t = np.arange(n) / n
    return out * np.sin(np.pi * t) ** 1.6

def gota(f0=700, f1=1300, dur=0.12, dec=0.035):
    """Gota de agua: un tono que sube (o baja, si f1 < f0) muy deprisa."""
    t = np.arange(int(SR * dur)) / SR; f = f1 + (f0 - f1) * np.exp(-t / 0.015)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.minimum(1, t / 0.002) * np.exp(-t / dec)

def kalimba(m, dur=0.6, dec=0.22):
    """Kalimba suave: nota redonda con un brillo metálico corto."""
    t = np.arange(int(SR * dur)) / SR; f = N(m)
    x = np.sin(2 * np.pi * f * t) * np.exp(-t / dec) + 0.22 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t / (dec * 0.1)) + 0.12 * np.sin(4 * np.pi * f * t) * np.exp(-t / (dec * 0.4))
    return sosfilt(butter(2, 4000, 'lowpass', fs=SR, output='sos'), x * np.minimum(1, t / 0.002))

def cristal(m, dur=1.2, dec=0.45, idx=1.2):
    """Campana de cristal suave (FM con poco índice): clara pero sin estridencia."""
    t = np.arange(int(SR * dur)) / SR; f = N(m); I = idx * np.exp(-t / (dec * 0.3))
    x = np.sin(2 * np.pi * f * t + I * np.sin(2 * np.pi * f * 3.5 * t)) * np.exp(-t / dec)
    return sosfilt(butter(2, 5000, 'lowpass', fs=SR, output='sos'), x * np.minimum(1, t / 0.003))

def reverb(x, rt=0.8, wet=0.25):
    n = int(SR * rt); ir = rng.standard_normal(n) * np.exp(-np.arange(n) / (SR * rt / 6.9))
    ir = sosfilt(butter(1, 4000, 'lowpass', fs=SR, output='sos'), ir); ir /= np.sqrt(np.sum(ir ** 2))
    xx = np.concatenate([x, np.zeros(n)]); y = fftconvolve(x, ir)[: len(xx)]
    return (1 - wet) * xx + wet * np.pad(y, (0, len(xx) - len(y)))

def junta(partes, dur):
    """Varios cuencos a la vez o seguidos: [(segundo en que empieza, sonido, volumen relativo)]."""
    out = np.zeros(int(SR * dur))
    for s0, x, g in partes:
        s = int(SR * s0); e = min(len(out), s + len(x)); out[s:e] += g * x[: e - s]
    return out

def guarda(nombre, x, db):
    """Quita el silencio del final, normaliza al pico `db` (dB) y guarda el WAV (44,1 kHz, mono)."""
    x = x - np.mean(x); nz = np.nonzero(np.abs(x) > 2e-3 * np.max(np.abs(x)))[0]; x = x[: nz[-1] + 1]
    f = min(len(x), int(0.02 * SR)); x[-f:] *= np.linspace(1, 0, f)
    x = x / np.max(np.abs(x)) * 10 ** (db / 20)
    with wave.open(os.path.join(OUT, nombre + '.wav'), 'w') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x * 32767).astype('<i2').tobytes())
    print(f'{nombre}.wav  {len(x) / SR:.2f} s  {db} dB')

# ---- Interfaz: cortos y bajitos (casi se sienten más que se oyen), cada uno con su timbre ----
guarda('tap',       reverb(madera(A5, 0.15, 0.025), 0.25, 0.12), -21)                                               # tocar: «toc» de madera
guarda('nav',       reverb(junta([(0, aire(0.16, 700, 1600), .5), (0.05, cuenco(D5, 0.35, 0.006, 0.08), .7)], 0.4), 0.35, 0.18), -20)  # pestaña: soplo + cuenco
guarda('hoja',      reverb(aire(0.26, 400, 2200, True), 0.35, 0.15), -22)                                           # abrir una hoja: soplo que sube
guarda('cierra',    reverb(aire(0.22, 400, 1800, False), 0.3, 0.12), -24)                                           # cerrarla: soplo que baja
guarda('toggle',    reverb(gota(650, 1250), 0.3, 0.18), -19)                                                        # activar: gota que sube
guarda('toggleOff', reverb(gota(1150, 600), 0.3, 0.18), -20)                                                        # desactivar: gota que baja
guarda('candado',   reverb(junta([(0, madera(D4, 0.2, 0.04), .9), (0.07, madera(A3, 0.25, 0.05), 1)], 0.35), 0.35, 0.15), -15)  # fijar: dos golpes graves
guarda('suelta',    reverb(madera(A4, 0.2, 0.035), 0.3, 0.15), -17)                                                 # soltar: un golpe más agudo
guarda('marca',     reverb(junta([(0, gota(900, 1600, 0.08, 0.02), .5), (0.02, kalimba(Fs5, 0.5, 0.18), .9)], 0.55), 0.45, 0.2), -12)  # marcar en la compra
guarda('elige',     reverb(junta([(0, cristal(D5, 0.9, 0.3, 0.8), .7), (0.03, cristal(A5, 0.9, 0.28, 0.8), .5)], 1.0), 0.7, 0.25), -15)  # elegir un plato tú
guarda('cambio',    reverb(junta([(0, kalimba(A4, 0.5, 0.15), .7), (0.07, kalimba(D5, 0.5, 0.15), .7), (0.14, kalimba(Fs5, 0.6, 0.2), .8)], 0.8), 0.6, 0.22), -15)  # la app cambia un plato
guarda('deshacer',  reverb(junta([(0, aire(0.18, 500, 1500, False), .5), (0.06, kalimba(E5, 0.4, 0.13), .7), (0.14, kalimba(B4, 0.5, 0.16), .8)], 0.7), 0.5, 0.2), -15)  # deshacer
guarda('timer',     reverb(junta([(0, madera(A4, 0.18, 0.03), .9), (0.28, madera(D5, 0.22, 0.04), .9)], 0.55), 0.4, 0.18), -13)  # empieza el temporizador: «tic-tac»
# ---- Momentos: más largos, con cola ----
guarda('logro',  reverb(junta([(0, cuenco(D4, 2.2, 0.02, 0.9), .7), (0.12, cuenco(A4, 2.0, 0.02, 0.8), .6), (0.24, cuenco(Fs5, 1.8, 0.02, 0.7), .5)], 2.6), 1.2, 0.3), -9)  # día equilibrado, plato cocinado
guarda('compra', reverb(junta([(0, cristal(D5, 1.2, 0.4), .6), (0.09, cristal(Fs5, 1.2, 0.4), .55), (0.18, cristal(A5, 1.3, 0.45), .55), (0.3, cristal(D6, 1.5, 0.55), .5)], 2.0), 1.0, 0.3), -9)  # compra completa
# Presentación: unos 9 s tranquilos con varios instrumentos. Un colchón de cuencos graves (re → sol → re), un soplo de
# viento muy bajo, una melodía lenta de kalimba que baja hasta re y dos destellos de cristal.
def colchon(m, dur, subida, bajada, lento=0.11):
    """Un «colchón» de sonido: varias ondas casi iguales (ligeramente desafinadas) que entran y salen muy despacio, sin ataque."""
    t = np.arange(int(SR * dur)) / SR; f = N(m); x = np.zeros(len(t))
    for c, ph in [(-6, 0.0), (0, 1.7), (7, 3.1)]:
        g = f * 2 ** (c / 1200)
        x += np.sin(2 * np.pi * g * t + ph) + 0.28 * np.sin(2 * np.pi * 2 * g * t + ph) + 0.08 * np.sin(2 * np.pi * 3 * g * t)
    x *= 1 + 0.12 * np.sin(2 * np.pi * lento * t + m)                         # respira muy suave
    env = np.clip(t / subida, 0, 1) ** 2 * np.clip((dur - t) / bajada, 0, 1) ** 2
    return x * env

def presentacion():
    """Sonido de presentación (≈6 s), suave y fluido: un soplo de aire muy ligero que se abre despacio en un acorde cálido de re mayor
    que florece y se disuelve. Sin golpes ni notas sueltas (no suena a timbre)."""
    D4_, A4_, Fs5_, D5_ = 62, 69, 78, 74
    x = junta([(0.0, aire(4.0, 350, 1800, True), .10),
               (0.6, colchon(D4_, 5.4, 2.4, 3.0, lento=0.25), .6), (0.85, colchon(A4_, 5.2, 2.4, 3.0, lento=0.25), .5),
               (1.1, colchon(D5_, 5.0, 2.4, 3.0, lento=0.25), .38), (1.35, colchon(Fs5_, 4.8, 2.4, 3.0, lento=0.25), .2)], 6.2)
    return reverb(sosfilt(butter(2, 3000, 'lowpass', fs=SR, output='sos'), x), 1.3, 0.25)
guarda('intro', presentacion(), -21)                                                                             # al empezar la presentación
guarda('aviso',  reverb(junta([(0, cristal(A5, 1.3, 0.45, 1.6), .8), (0.16, cristal(D6, 1.5, 0.55, 1.6), .8)], 1.8), 1.0, 0.25), -4)   # avisos del móvil
patron = lambda s: [(s, kalimba(D5, 0.8, 0.25), .8), (s + 0.16, kalimba(Fs5, 0.8, 0.25), .75), (s + 0.32, kalimba(A5, 0.9, 0.3), .8), (s + 0.48, kalimba(D6, 1.0, 0.35), .7)]
guarda('alarma', reverb(junta(patron(0) + patron(1.0) + patron(2.0), 3.4), 0.9, 0.25), -3)          # termina el temporizador
# respira.wav (cada respiración del minuto guiado) es el cuenco original: este script no lo toca.

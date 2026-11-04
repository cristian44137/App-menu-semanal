# Mete en el código (en base64) las letras de la app y una miniatura de cada plato para los PDF.
# Hace falta porque en la app instalada los archivos de assets/ no se pueden leer desde el código JS (solo los pinta Android),
# y sin ellos el PDF salía sin ilustraciones. Uso:  python3 tools/pdf-assets.py   (genera src/pdf-assets.ts)
import base64, io, os, re
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
b64 = lambda b: base64.b64encode(b).decode()
fonts = {'n4': 'Nunito-Regular', 'n6': 'Nunito-SemiBold', 'n7': 'Nunito-Bold', 'n8': 'Nunito-ExtraBold', 'm7': 'Manrope-Bold', 'm8': 'Manrope-ExtraBold'}
out = ['// Generado por tools/pdf-assets.py (no lo edites a mano): letras y miniaturas de platos en base64 para los PDF.', 'export const PDF_FONTS: Record<string, string> = {']
for k, f in fonts.items(): out.append(f"  {k}: '{b64(open(f'{ROOT}/assets/fonts/{f}.ttf', 'rb').read())}',")
out += ['};', 'export const PDF_DISHES: Record<string, string> = {']
for name, file in re.findall(r'"([^"]+)": require\(\'\.\./assets/platos/([0-9a-f]+\.webp)\'\)', open(f'{ROOT}/src/platos.ts').read()):
    im = Image.open(f'{ROOT}/assets/platos/{file}').convert('RGBA').resize((96, 96), Image.LANCZOS)
    buf = io.BytesIO(); im.save(buf, 'WEBP', quality=70, method=6)
    out.append(f'  "{name}": \'{b64(buf.getvalue())}\',')
out.append('};')
open(f'{ROOT}/src/pdf-assets.ts', 'w').write('\n'.join(out) + '\n')
print('listo', os.path.getsize(f'{ROOT}/src/pdf-assets.ts') // 1024, 'KB')

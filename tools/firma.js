// Firma de la versión para Google Play (la usa el workflow de GitHub después de «expo prebuild»).
// Lee la llave de subida de los secretos del repositorio (KEYSTORE_BASE64, KEYSTORE_PASSWORD, KEY_ALIAS, KEY_PASSWORD),
// la guarda en android/app/upload.jks y hace que la compilación «release» se firme con ella en vez de con la de pruebas.
const fs = require('fs');
const b64 = process.env.KEYSTORE_BASE64;
if (!b64) { console.log('Sin llave de subida: se firma con la llave de pruebas (vale para instalar el APK, no para Play).'); process.exit(0); }
fs.writeFileSync('android/app/upload.jks', Buffer.from(b64, 'base64'));
const f = 'android/app/build.gradle';
let g = fs.readFileSync(f, 'utf8');
const release = `
        release {
            storeFile file('upload.jks')
            storePassword System.getenv('KEYSTORE_PASSWORD')
            keyAlias System.getenv('KEY_ALIAS')
            keyPassword System.getenv('KEY_PASSWORD')
        }`;
if (!g.includes("file('upload.jks')")) {
  g = g.replace(/signingConfigs\s*\{/, (m) => m + release);
  // En buildTypes → release, cambia la llave de pruebas por la de subida.
  g = g.replace(/(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig\s+signingConfigs\.debug/, '$1signingConfig signingConfigs.release');
}
if (!g.includes('signingConfig signingConfigs.release')) { console.error('No he podido poner la firma en build.gradle'); process.exit(1); }
fs.writeFileSync(f, g);
console.log('Compilación release firmada con la llave de subida.');

# Publicar Nevú en Google Play

Guía paso a paso. Todo lo que hay en la carpeta `play-store/` está listo para subir.

## 1. Cuenta de desarrollador
- Alta en https://play.google.com/console (pago único de 25 US$ y verificación de identidad).
- Las cuentas **personales** nuevas tienen que hacer una **prueba cerrada con al menos 12 personas durante 14 días** antes de poder publicar en producción. Empieza por ahí (pista «Prueba cerrada»).

## 2. Llave de subida (firma)
Google Play pide el archivo **AAB** firmado con tu llave de subida. Créala una sola vez en el Codespace y guárdala en los secretos del repositorio (el workflow la usa sola):

```bash
keytool -genkeypair -v -keystore upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000
gh secret set KEYSTORE_BASE64 < <(base64 -w0 upload.jks)
gh secret set KEYSTORE_PASSWORD   # escribe la contraseña de la llave
gh secret set KEY_ALIAS --body upload
gh secret set KEY_PASSWORD        # la misma contraseña si no pusiste otra
keytool -list -v -keystore upload.jks -alias upload | grep SHA1   # apunta esta huella
```

**Guarda `upload.jks` y la contraseña fuera del repositorio** (si los pierdes, Google puede cambiarte la llave de subida, pero tarda días). No la subas a GitHub.

Desde ese momento, cada build de GitHub Actions deja dos archivos: `nevu-apk` (para instalar a mano) y `nevu-aab` (para subir a Play). El número de compilación (versionCode) sube solo en cada build.

## 3. Iniciar sesión con Google tras publicar
Google Play vuelve a firmar la app con su propia llave (Play App Signing). Para que «Iniciar sesión con Google» siga funcionando:
1. Play Console → tu app → Configuración → **Integridad de la app** → copia la huella **SHA-1 de la llave de firma de apps**.
2. Google Cloud Console → Credenciales → crea otro **ID de cliente OAuth de Android** con el paquete `com.nevu.menu` y esa SHA-1.
3. Crea otro más con la SHA-1 de tu llave de subida (la del paso 2), para el APK que instalas a mano.

## 4. Ficha de la tienda
- **Nombre**: Nevú: Menú semanal y compra (27 de 30 caracteres; debajo del icono se ve solo «Nevú»)
- **Descripción breve** (80 caracteres): `Tu menú semanal y la compra en Mercadona o Día, con lo que ya tienes en casa.`
- **Descripción completa**:

> Nevú te prepara el menú de la semana en un toque y cuadra calorías, proteína, fibra, vitaminas y minerales sin que tengas que pensar.
>
> • Recetas rápidas (la mayoría en menos de 15 minutos) con los pasos, cómo debe quedar y cómo aliñarlas.
> • Lista de la compra por secciones del súper para Mercadona o Día, con precios y presupuesto semanal.
> • Despensa con caducidades: el menú usa primero lo que tienes y lo que caduca antes.
> • El menú se adapta solo cuando cambias algo, o lo dejas fijo si ya lo has imprimido.
> • Fija los platos que te gustan y veta los que no.
> • Avisos de comidas y temporizador.
> • Nevú Plus (pago único): tus comidas en Google Calendar, sincronización y copia en tu Google Drive, el menú y la compra en PDF y el libro de recetas con tu semana en números.
> • Modo sencillo para días difíciles y un minuto de respiración guiada.
>
> Sin anuncios, sin cuentas y sin servidores propios: tus datos se quedan en tu móvil (y, si quieres, en tu Google Drive).
>
> Nevú no está relacionada con Mercadona ni con Día. Los precios son orientativos. La app ofrece orientación nutricional general y no sustituye el consejo de un profesional sanitario.

- **Icono**: `play-store/icono-512.png`
- **Gráfico de funciones**: `play-store/grafico-1024x500.png`
- **Logotipo**: `play-store/logotipo.svg` (editable) y en PNG transparente `logotipo-blanco.png` (sobre azul) y `logotipo-azul.png` (sobre fondo claro)
- **Capturas de teléfono**: `play-store/captura-1-hoy.png` … `captura-5-oscuro.png` (1080 × 1920)
- **Categoría**: Comer y beber. **Etiquetas**: planificador de comidas, recetas, lista de la compra.

## 4b. Precio y Nevú Plus
- **Precio de la app**: gratis (una app gratis ya no puede pasar a ser de pago).
- **Monetizar → Productos → Productos integrados en la aplicación** → Crear producto:
  - ID del producto: `nevu_plus` (igual que `PLUS_ID` en `src/config.ts`; no se puede cambiar después).
  - Nombre: «Nevú Plus». Descripción: «Calendario, Google Drive y PDF, para siempre».
  - Precio: 3,99 EUR (Google calcula los demás países). Actívalo.
- Para crear productos, Play pide antes subir un AAB que use la facturación (este ya la usa) y tener el **perfil de pagos**.
- **Probar sin pagar**: Configuración → **Pruebas de licencias** → añade tu Gmail. Instala la app desde la pista de prueba interna: al comprar, Google usa una tarjeta de prueba y no cobra.
- Si cambias el precio en Play, la app enseña el nuevo sola (lo pide a Google Play).

## 5. Política de privacidad
Play pide una **URL pública**: usa `https://cristian44137.github.io/privacidad.html` (la web de la app, en el repositorio `cristian44137.github.io`). Si cambias `PRIVACIDAD.md`, copia el cambio a esa página para que digan lo mismo. Dentro de la app está en Ajustes → Ayuda → Privacidad.

## 6. Contenido de la app (formularios de Play Console)
- **Anuncios**: no contiene anuncios.
- **Datos de inicio de sesión** (antes «Acceso a la app»): **Sí**. Da la cuenta de prueba de `REVIEW_EMAILS` (en `src/config.ts`): con ella Nevú Plus está desbloqueado, porque los revisores no pueden pagar.
- **Clasificación de contenido**: cuestionario IARC → categoría «Referencia, noticias o educación» o «Utilidad»; sin violencia, sin contenido sexual, sin apuestas. Saldrá «Para todos» / PEGI 3.
- **Público objetivo**: 18 años o más.
- **Seguridad de los datos** (lo que he visto en el código; revísalo con la ayuda de Google antes de enviar):
  - La app **no envía datos al desarrollador ni a terceros**; no tiene analítica ni anuncios.
  - Lo que se guarda en Google Drive va a **la cuenta del propio usuario** y solo si inicia sesión.
  - Datos cifrados en tránsito: sí (HTTPS con Google).
  - El usuario puede **pedir que se borren sus datos**: sí, desde la propia app (Ajustes → Borrar todos mis datos).
- **App de salud**: declara que da información de nutrición general, no es un dispositivo médico.

## 7. Permisos
- Avisos (`POST_NOTIFICATIONS`), alarmas exactas (`SCHEDULE_EXACT_ALARM`), calendario (`READ/WRITE_CALENDAR`) y arranque (`RECEIVE_BOOT_COMPLETED`, para reprogramar avisos).
- Ya **no** pide `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` (Google Play solo lo permite a apps muy concretas): el botón «Sin ahorro de batería» abre la lista de Android para que elijas «No optimizar».
- Si Play pregunta por las alarmas exactas: son para avisar de cada comida y del temporizador a su hora.

## 8. Cosas a tener en cuenta
- **Marcas y fotos**: la app nombra Mercadona y Día y carga fotos de productos de sus webs. Para uso personal no hay problema; en una tienda pública, Google puede pedir que demuestres que puedes usarlas. Lo más seguro es dejar claro en la ficha que la app no está relacionada con ellos (ya está en la descripción) y, si Google lo pide, quitar las fotos (la app dibuja el ingrediente cuando no hay foto).
- **Móviles antiguos de 32 bits**: para que compile más rápido, la app se construye solo para arm64 (casi todos los móviles desde 2017). Si quieres llegar también a los de 32 bits, añade `,armeabi-v7a` a `-PreactNativeArchitectures` en `.github/workflows/apk.yml` (la compilación tardará más).
- **Versión**: cambia `VERSION` en `src/news.ts`, `version` en `app.json` y `package.json`, y añade los cambios en `NEWS`.

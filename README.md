# Nevú (app nativa Android, móvil y tablet)

App nativa hecha con **React Native (Expo) + TypeScript**. No usa HTML ni CSS: toda la interfaz son componentes nativos y SVG.
Cada pantalla está escrita en **OpenUI Lang** (`src/screens.ts`) y la dibuja un Renderer propio con una librería de componentes
nativos (`src/library.tsx`).

## Qué hace (versión 1.0.0)
- **Menú semanal optimizado**: cuadra calorías, proteína y fibra cada día, y vitaminas y minerales en la semana (magnesio, hierro, zinc, calcio, folato, B12, vitamina D, vitamina C y omega-3), con variedad.
- **Franjas**: desayuno, merienda de mañana, comida, merienda de tarde, cena y **bebida**. La bebida (zumo, batido, kéfir o infusión) es una al día, con aporte nutricional, y va con la comida que elijas en Ajustes (por defecto, la merienda de tarde); en las comidas principales, agua.
- **Novedades**: aviso discreto al actualizar y registro de cambios (Nuevo, Mejorado, Corregido) al final de Ajustes.
- **Recetas**: 233 platos y bebidas (14 batidos sin plátano, varios con zumo de manzana o mango). Cada receta dice **cómo debe quedar** y **con qué aliñarla** (sal, especias y aceite). Los **tiempos se ajustan a la ración**: un porridge doble tarda 7 min en espesar en vez de 4, el horno con más cantidad tarda más y la pasta no (en `src/cook.ts` está cómo se calcula). El tiempo incluye sacar, pesar y recoger. Con más de 20 minutos de tiempo máximo entran recetas al horno, guisos y tortilla casera.
- **Presupuesto**: cuenta lo que pagas de verdad en la compra (envases enteros, menos lo que ya tienes en la despensa). Al subirlo o bajarlo se reajusta la semana sin dejar de cubrir los objetivos (los platos que elijas a mano se respetan). Si no se puede, la lista te dice cuánto es lo mínimo que ha encontrado.
- **Supermercado**: Mercadona, Día o **«Más barato»**, que elige para cada producto la tienda con menor precio por kilo o unidad.
- **No me gusta**: en cualquier receta («No me gusta este plato») o al cambiar un ingrediente («No me gusta: no usar nunca…») lo vetas y no vuelve a salir en el menú, en los consejos ni al elegir. Se quita en Ajustes → Dieta → No me gusta.
- **Dieta**: sin carne, sin embutidos, sin pescado ni marisco (activado por defecto), sin lácteos, sin gluten, sin harinas, sin huevo y sin frutos secos.
- **Bienestar** (pestaña Tú): «Ánimo y estrés» y «Estoy resfriado». La base científica está en `src/nutri.ts` y en la propia pantalla.
- **Despensa**: lo que marcas en el carrito entra solo; editas la cantidad, marcas lo abierto y ves cuándo caduca. El menú puede usar primero lo que caduca antes (ajustable) y la lista de la compra no repite lo que ya tienes.
- **Compra**: por secciones del súper (fruta y verdura, lácteos y huevos, pan y pasta…), fotos que se amplían al tocarlas, «Sustituir» para cambiar un producto por otro parecido (cantidad y precio ajustados; los sustitutos están en `src/subs.ts`), PDF e impresión. En la semana en curso solo se compra para los días que quedan. El presupuesto tiene un margen de 2,50 € (4 % si es mayor) antes de avisar.
- **Sustitutos con nombre**: si cambias un ingrediente («Sustituir» o desde la receta), el nombre del plato y los pasos de la preparación cambian con él en el menú, la receta, los avisos, el calendario y el PDF («Bebida de soja al cacao» con leche → «Leche entera al cacao»).
- **Avisos** con sonido propio y como ventana emergente (opcional); aviso el día antes de que caduque algo de la despensa.
- **Diseño**: en la línea del icono (una nevera con el menú sujeto con un imán): fondo con degradado del color de acento (Océano por defecto) y luces suaves que se mueven despacio, tarjetas blancas «perla» (azul noche en oscuro) con sombra para dar profundidad, esquinas sobrias, botones con degradado, tipografías Manrope (títulos y cifras) y Nunito (texto) y una ilustración distinta para cada plato. Desliza a izquierda o derecha en el menú para cambiar de día. 10 colores de acento, 6 tamaños de texto, 3 espaciados, modo claro y oscuro con contraste AA y una presentación la primera vez.
- **Presentación** tipo «historias»: cada paso es una pequeña demostración animada (la semana que se rellena, «Algo más fácil», la lista que se marca, un aviso, la sincronización y la respiración), avanza sola, se puede deslizar y tiene «Atrás» y «Saltar».
- **Lo cocinado**: «Lo he cocinado» solo hoy o días pasados, con «Deshacer» en el aviso; el reajuste nunca cambia un plato ya cocinado.
- **Rápida**: el menú se reajusta justo después de pintar cada cambio (tocar responde al momento) y el optimizador reutiliza cálculos, unas 2-3 veces más rápido que antes.

## Menú dinámico o fijo
Por defecto el menú es **dinámico**: si eliges otro plato, cocinas, cambias una ración o tocas la despensa, la app adapta el resto de la semana (como si aplicaras tú los consejos de cada día) para que haya variedad, cuadren los nutrientes y se aproveche lo que tienes. No toca los días pasados, lo cocinado, lo que has fijado ni las comidas de hoy que ya tocan o han pasado. Si ya has imprimido la semana, activa **Ajustes → Comidas → Menú fijo** y no cambiará nada por su cuenta.

## «Cambiado»
Cuando la app reajusta el menú sola, los platos que ha cambiado llevan la etiqueta **«Cambiado»** (y su día, un punto naranja), para que veas qué es distinto. Se quita al abrir ese plato o al salir de ese día o del menú.

## Fijar platos (candado)
Cada plato del menú tiene un **candado**. Fijado, la app no cambia el plato (sí puede ajustar la ración). Al elegir un plato a mano o con «Algo más fácil» queda fijado solo; vuelve a tocar el candado para soltarlo.

## Quitar y volver a poner una merienda
En la receta de la merienda de mañana o de tarde, «Quitar este día» la quita y el día se reorganiza. En el menú, «Añadir merienda…» la vuelve a poner: la app elige la que mejor encaja y reajusta el día (con «Menú fijo», solo las raciones de ese día).

## Consejos («Aplicar»)
Con el menú dinámico los consejos se aplican solos (al abrir la app, al volver a ella y al cambiar de día), así que no sale el botón. Con «Menú fijo» sí sale, y el cambio se queda. Solo se proponen para comidas que aún tiene sentido cambiar: nunca para lo cocinado ni para días pasados y, hoy, como mucho una comida por detrás de la que toca (a la hora de la merienda aún vale la comida; casi a la hora de la cena, solo merienda de tarde, bebida y cena).

## Cambiar un producto desde la receta
En cada ingrediente con alternativas hay un botón de flechas: por ejemplo, bebida de soja por leche entera. El cambio vale para todas las recetas de esa semana y la lista de la compra se ajusta sola.

## Después de hacer la compra
Cuando marcas todo en el carrito (o pulsas «Ya lo he comprado todo»), la semana queda como **comprada**: si cambias un plato, pides «Algo más fácil», rehaces la semana o cambias un ajuste, la app usa lo que tienes en casa, sin quitárselo a los platos que aún no has cocinado. Al cambiar un plato salen primero los que puedes hacer (solo se reserva lo que usan los platos fijados; el resto de la semana se reajusta después de elegir); «Ver todos los platos» enseña el resto. Si quieres volver a comprar, pulsa «Volver a hacer la compra» en la lista.

## Letra grande y pantallas con zoom
La app respeta el **tamaño de letra del móvil** (Ajustes de Android → Pantalla → Tamaño de fuente), hasta 1,6 veces, y lo suma al tamaño elegido en la app. Con letra grande o pantalla estrecha (zoom de pantalla), las filas se reorganizan solas: el precio de la compra baja a su propia línea, los nombres usan más líneas en vez de cortarse, el título de cada pantalla va entero con las flechas debajo y los ajustes con − y + ponen el nombre arriba.

## Pensada para días difíciles
- **«Ahora toca»** arriba del plan: tu siguiente comida según la hora, con «Ver receta» y **«Algo más fácil»** (la cambia por la más rápida que puedes hacer, mejor si usa lo que tienes en casa).
- **Modo sencillo** (Tú o Ajustes): solo lo que toca y la lista del día, sin calorías, porcentajes ni avisos.
- Los cambios de ajustes **no tocan los días que ya han pasado**, y la app te dice cuántos platos ha cambiado.
- El **temporizador sigue** aunque cierres la receta (se ve una pastilla abajo; al tocarla vuelves a la receta).
- **«Respira un minuto»** (en el plan y en Tú): respiración guiada de 6 respiraciones lentas (4 s tomando aire, 6 s soltándolo) con un sonido suave en cada respiración.
- **Pantalla encendida** (Ajustes → Sonido, vibración y movimiento): «No», «Al cocinar» (mientras ves una receta o corre el temporizador; es lo normal) o «Siempre».
- **Al abrir la app** desde cero, el icono se acerca despacio y se funde con la app (menos de medio segundo). Al volver desde segundo plano no sale. La **presentación** tiene música tranquila de unos 10 s (cuencos graves, viento, una melodía de kalimba y destellos de cristal) cada vez que la ves, si tienes los sonidos activados.
- Sonidos solo para lo importante; el de cada toque va aparte y viene apagado. Las animaciones van aunque Android las tenga reducidas; se quitan en Ajustes → Animaciones.

## Conseguir el APK (y el AAB para Google Play) sin instalar nada
1. Sube TODO el contenido de esta carpeta a tu repositorio de GitHub (incluida `.github`).
2. Pestaña **Actions → Construir APK y AAB**. La primera vez tarda unos 10-15 minutos; las siguientes, bastante menos (guarda cachés de npm y Gradle y compila solo para arm64).
3. Descarga `nevu-apk` e instala `app-release.apk`, o `nevu-aab` para subirlo a Google Play.
4. Para publicar en Google Play, sigue **PLAY-STORE.md** (llave de subida, ficha, privacidad y formularios). Las imágenes de la ficha están en `play-store/`.

## En tu PC
`npm install` (añade `expo-audio` para los sonidos y `expo-font` para las tipografías) · `npm test` (pruebas de la lógica) · `npm run typecheck` · `npx expo start` (con Expo Go o un emulador).
APK local: `npx expo prebuild --platform android && cd android && ./gradlew assembleRelease` (AAB: `bundleRelease`).
Icono: `python3 tools/icono.py` (pinta el icono en píxeles; copia los PNG a `assets/`). Sonidos: `python3 tools/sonidos.py` (escribe los WAV en `assets/sounds`; `respira.wav` no lo toca).

## Dónde tocar
- `src/data.ts`: ingredientes, precios, etiquetas de dieta, platos, recetas y nutrición. En los pasos, los minutos van entre llaves (`{4}`, `{4s}`, `{8a}`, `{2m}`, `{2b}`, `{4f}`) para que se ajusten a la ración: la leyenda está al principio de `src/cook.ts`.
- `src/cook.ts`: cómo debe quedar cada plato y su aliño, y la regla de tiempos por ración.
- `src/nutri.ts`: vitaminas y minerales de cada ingrediente, objetivos diarios (EFSA) y pesos de «Ánimo» y «Resfriado».
- `src/logic.ts`: cálculos, optimizador semanal, compra, despensa, caducidades y perfil.
- `src/controller.ts`: qué hace cada botón.
- `assets/sounds/`: los sonidos (WAV). Puedes cambiarlos por otros con el mismo nombre.
- `assets/fonts/`: las tipografías. Si cambias alguna, cambia también su nombre en `app.json` (plugin expo-font), en `src/platform.ts` (loadFonts) y en `font()` de `src/library.tsx`.
- `src/art.tsx`: las ilustraciones de platos e ingredientes. `dishKind()` decide el recipiente por el nombre del plato.
- `src/screens.ts`: qué se ve en cada pantalla (OpenUI Lang).
- `src/library.tsx` y `src/theme.ts`: componentes y diseño.

## Iniciar sesión con Google (sincronizar móvil y tablet, copia en la nube)
La app guarda un archivo en la carpeta privada que Google Drive reserva para ella (no aparece en tu Drive y nadie más la ve).
Para activarlo necesitas un proyecto propio de Google Cloud (gratis):
1. En console.cloud.google.com crea un proyecto y activa la **Google Drive API**.
2. Configura la **pantalla de consentimiento** (tipo externo) y añade tu cuenta como usuario de prueba.
3. Crea un **ID de cliente OAuth de tipo Android**: paquete `com.nevu.menu` y la huella SHA-1 `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`. Es la de la clave con la que el workflow de GitHub firma el APK (la `debug.keystore` de la plantilla de Expo SDK 54, comprobada con `keytool`). Si algún día firmas con tu propia clave, añade también su SHA-1.
   En **Acceso a datos** de la pantalla de consentimiento añade el permiso `.../auth/drive.appdata`.
4. Crea también un **ID de cliente OAuth de tipo Web** y pégalo en `src/config.ts` (`GOOGLE_WEB_CLIENT_ID`).
5. Vuelve a compilar. En Ajustes → «Cuenta y copias de seguridad» aparecerá «Iniciar sesión con Google».

Se sincroniza al abrir la app, al volver a ella, unos segundos después de cada cambio y, con la app abierta, cada 30 segundos se mira si el otro dispositivo ha cambiado algo. Si los dos dispositivos tienen cambios distintos, **se juntan por partes**: cada semana del menú, cada producto de la despensa, los ajustes, el perfil y los precios se quedan con su cambio más reciente, así no se pierde nada. El **diseño** (tema, color, tamaño de letra, espaciado, sonidos, animaciones, pantalla encendida y modo sencillo) es de cada dispositivo.
Si falla, Ajustes → «Cuenta» muestra el motivo: código 10 = paquete o SHA-1 mal en el ID de cliente Android; «API no activada» = falta activar la Google Drive API; «falta el permiso de Drive» = cierra sesión y vuelve a entrar aceptando el acceso. «Guardar copia en la nube» crea una copia aparte que puedes restaurar cuando quieras.

## Calendario
**«Sincronizar con Google Calendar»** (Ajustes → Calendario) pone tus comidas **solo en el calendario de la cuenta de Google con la que inicias sesión en la app** (aunque tengas más cuentas en el móvil); sin sesión iniciada no escribe nada. Cada evento lleva en su marca el día y la franja (`[Nevú 2026-11-02 2-1]`): si cambias un plato, una ración o una hora, **solo cambia ese evento**; los que no cambian no se tocan. Los que sobran (repetidos, de otras cuentas o de versiones antiguas) se borran. Solo toca eventos de la app: los que llevan la marca `[Nevú …]` o, de versiones antiguas, título de comida con la lista de ingredientes («2 yogur, 30 avena…»).
**«Borrar los eventos de la app»** primero apaga la sincronización (y para la que estuviera a medias) y luego quita todos esos eventos (de hace un año a dentro de un año). No vuelve a poner nada hasta que actives «Sincronizar» otra vez.
«Abrir mi semana en el calendario» solo abre el calendario en esa semana (no escribe nada). Dentro de una receta, «Abrir en el calendario» abre la pantalla de nuevo evento con el plato ya rellenado. Requiere permiso de calendario.

## Datos de productos y precios
Mira DATOS.md: indica qué productos y precios están contrastados y cuáles son estimaciones.
Cada producto de `src/data.ts` puede llevar la nutrición por 100 g (`k`: kcal, proteína, hidratos, grasa) y una foto (`f`). La nutrición de los platos se calcula con `npx tsx tools/nutricion.ts` (solo informe) o `npx tsx tools/nutricion.ts --aplicar` (reescribe los platos). El script avisa de lo que es estimado: el aceite de cocinar, los pesos por pieza no verificados y los valores genéricos de frutas y verduras sin ficha.

## Privacidad y borrar datos
Todo se guarda en el móvil (y, si inicias sesión, en una carpeta privada de tu Google Drive). En Ajustes → Ayuda → Privacidad está explicado; en Ajustes → Cuenta y copias de seguridad → «Borrar todos mis datos» se borra todo (también los eventos del calendario y, si quieres, la copia de Drive). La política completa está en `PRIVACIDAD.md`.

## Permisos para los avisos
En la presentación y en Ajustes → Avisos están los botones para: permitir avisos, activar el aviso **emergente** (en Android es un ajuste de la notificación: «Emergente» o «Notificaciones flotantes»), los avisos **a la hora exacta** («Alarmas y recordatorios», Android 12+) y quitar el **ahorro de batería**, que en algunos móviles retrasa los avisos.

## Imprimir para la nevera
En Plan, tarjeta **«Para la nevera»**: el botón de la impresora abre el diálogo de impresión de Android (desde ahí también puedes «Guardar como PDF») y el otro comparte el PDF. En Compra, «Imprimir» hace lo mismo con la lista.

## Versión y novedades
Esta es la **versión 1.0.0**, la primera. Al final de Ajustes ves la versión instalada y «Novedades», el registro de cambios (la versión instalada arriba y, debajo, las anteriores). Tras actualizar, el menú enseña un aviso pequeño que se cierra con la x. Formato X.Y.Z: X sube con un cambio enorme, Y con funciones nuevas y Z con arreglos. Para una versión nueva: cambia `VERSION` en `src/news.ts` (y `version` en `app.json` y `package.json`) y añade sus cambios arriba de `NEWS` con la etiqueta Nuevo, Mejorado o Corregido.

## Probar en el móvil (lo que aún no está verificado)
Instala el APK en un Android real y comprueba, en este orden:
1. **Avisos**: acepta el permiso de notificaciones, programa un horario de comida a 2 minutos vista y espera el aviso. Si no llega, revisa el ahorro de batería de la app.
2. **Calendario**: «Abrir mi semana en el calendario» debe crear los eventos y abrir el calendario. Pide permiso la primera vez.
3. **PDF y compartir**: genera el PDF de la nevera y el de la lista de la compra y compártelos.
4. **Tipografías**: los títulos y las cifras deben verse con Manrope (geométrica, gruesa) y el texto con Nunito. Si ves la letra normal del móvil, el plugin de expo-font no se aplicó: vuelve a construir el APK.
5. **Sonidos**: al cambiar de pestaña, al acabar el temporizador y al cumplir el objetivo del día. Se quitan en Ajustes → Sonido.
6. **Aviso emergente y sonido propio**: con «Mostrar como ventana emergente» el aviso aparece encima; si no suena el sonido de la app, revisa en los ajustes de Android → Notificaciones de Nevú que el canal tenga sonido.
7. **Fotos de productos**: necesitan conexión; sin internet se ve el dibujo del ingrediente.
8. **Google y Drive**: sigue los pasos de «Iniciar sesión con Google». Si falla con un código 10 o DEVELOPER_ERROR, el paquete o la huella SHA-1 del ID de cliente Android no coinciden con la firma del APK.
9. **Deslizar entre días**, **sombras** de las tarjetas, **sonidos nuevos**, el **sonido de bienvenida**, la **animación de arranque** y **pantalla encendida**: son lo más nuevo y solo los he visto en la vista previa web.
10. **Borrar todos mis datos**: pruébalo con una copia hecha antes («Copia en un archivo»).
11. Si algo falla, conecta el móvil por USB con la depuración activada y mira el error con `adb logcat`.

## Créditos
- Sonidos: hechos para la app con `tools/sonidos.py` (una línea por sonido), todos suaves y en la misma escala, pero cada tipo de acción con su timbre: madera para tocar y el temporizador, aire para pestañas y hojas, gotas para los interruptores, kalimba para la compra y los cambios de plato, cristal para elegir, avisos y compra completa, y cuencos (como el de la respiración) para los logros y la presentación.
- Tipografías: **Manrope** (Mikhail Sharanda) y **Nunito** (Vernon Adams y otros), de Google Fonts, con licencia SIL Open Font License 1.1 (`assets/fonts/OFL-*.txt`). Están recortadas a los caracteres latinos para que pesen menos.
- Ilustraciones de los platos: pintadas en píxeles para esta app con `tools/platos.py` (mismo estilo que el icono; `assets/platos/`, índice en `src/platos.ts`). Si añades recetas, vuelve a ejecutarlo; mientras tanto se usa el dibujo vectorial de `src/art.tsx`. Icono: pintado en píxeles con `tools/icono.py` (nevera con el menú, degradado Océano, luz y sombras suaves y grano fino); en Android 13 o más, con iconos temáticos, se usa la versión monocroma.

## Notas de la versión 1.0.3 (para quien edite el código)
- `plugins/play-limpio.js`: se ejecuta en `expo prebuild`; quita el servicio en primer plano de expo-audio (aviso de Play sobre Android 15) y activa R8 (ofuscación y reducción de código).
- `tools/pdf-assets.py` → `src/pdf-assets.ts`: letras y miniaturas de platos en base64 para los PDF. Si cambias los platos (`tools/platos.py`), vuelve a ejecutarlo.
- Ajustes: `ajustes()` en `src/screens.ts` dibuja la pantalla corta (`tab: 'aj'`) y «Ajustes más avanzados» (`tab: 'adv'`). Para mover una opción de una a otra, cambia en qué lista se devuelve.
- Sonido de la presentación: `presentacion()` en `tools/sonidos.py` (sonido de presentación de ~6 s). Capturas de la presentación: `assets/intro/`.
- Macros: `calc()` en `src/logic.ts` (comentario con las fuentes y los números que puedes cambiar).
- Consejos de primer uso: tabla `GUIDE` al final de `src/screens.ts`.
- Temas: `SHOWN` (los 6 de serie) y `PALETA` (colores del creador de Plus) en `src/theme.ts`; los temas creados se guardan en `set.themes`.

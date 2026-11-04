//
// Formato X.Y.Z: X sube con un cambio enorme, Y con funciones nuevas y Z con arreglos.
// Al publicar una versión nueva: cambia VERSION (igual que "version" en app.json y package.json) y añade arriba del
// todo de NEWS sus cambios. La primera vez que se abra la app tras actualizar, el menú enseña un aviso pequeño con el
// resumen (s); «Ver novedades» abre el registro entero (también al final de Ajustes).
// Cada cambio es [tipo, texto]: tipo «Nuevo», «Mejorado» o «Corregido». Frases cortas, de una línea si se puede.

export const VERSION = '1.0.4';

export type Change = ['Nuevo' | 'Mejorado' | 'Corregido', string];
export const NEWS: { v: string; d: string; s: string; items: Change[] }[] = [
  {
    v: '1.0.4', d: '6 nov 2026', s: 'Soporte mejorado para escritorio, sesión persistente y mejoras de sincronización.', items: [
      ['Nuevo', 'Lanzamiento de Nevú Desktop con experiencia inmersiva y diseño adaptado a pantalla grande.'],
      ['Mejorado', 'Sesión persistente con Google Drive para mantener tu cuenta conectada automáticamente.'],
      ['Corregido', 'Optimización en la detección de copias de seguridad y manejo de errores de sincronización.'],
    ],
  },
  {
    v: '1.0.3', d: '5 nov 2026', s: 'Ajustes más claros, presentación ligera y macros a tu medida.', items: [
      ['Mejorado', 'Ajustes corto y claro; el resto, en «Ajustes más avanzados».'],
      ['Mejorado', 'Cada interruptor dice «Sí» o «No» y explica si el alimento saldrá o no.'],
      ['Mejorado', 'Presentación más ligera, con capturas reales y tus datos al principio.'],
      ['Mejorado', 'Sonido de inicio más corto y natural.'],
      ['Mejorado', 'Con tu cuenta de Google, la copia en Drive ahora es gratis.'],
      ['Nuevo', 'Un consejo breve la primera vez que abres cada pestaña.'],
      ['Mejorado', 'Calorías y macros cambian con tu edad, peso, altura y actividad.'],
      ['Nuevo', '6 temas de color en Ajustes y, con Nevú Plus, crea y borra los tuyos.'],
      ['Mejorado', 'Cambio de pestañas más fluido y mejor lectura con TalkBack.'],
      ['Corregido', 'Las ilustraciones de los platos salen en el PDF del menú.'],
      ['Corregido', 'Avisos de Google Play sobre Android 15.'],
    ],
  },
  {
    v: '1.0.2', d: '4 nov 2026', s: 'Teclado propio y recetas con más detalle.', items: [
      ['Nuevo', 'Teclado propio para los números: la pantalla ya no se mueve ni se tapa.'],
      ['Mejorado', 'Tus datos se guardan al tocar fuera, sin tener que confirmar.'],
      ['Mejorado', 'Edad, altura y peso seguidos con «Siguiente», también en la presentación.'],
      ['Nuevo', 'Recetas con el nivel de fuego, del 1 al 6.'],
      ['Nuevo', 'Tamaño aproximado de rodajas, dados y tiras.'],
      ['Nuevo', 'Antes de empezar: si hay que pelar la fruta y la verdura.'],
    ],
  },
  {
    v: '1.0.1', d: '4 nov 2026', s: 'PDF nuevos, tu objetivo en «Tú» y presentación para tablet.', items: [
      ['Nuevo', 'PDF del menú con tu semana en números y el libro de recetas.'],
      ['Mejorado', 'PDF del menú y de la compra con el estilo y las letras de la app.'],
      ['Nuevo', 'Tus datos en la presentación (opcional) y aviso si faltan.'],
      ['Mejorado', 'Calorías, proteína y fibra, en «Tú», junto a tus datos.'],
      ['Mejorado', 'Qué significa cada nivel de actividad física.'],
      ['Mejorado', 'Nevú Plus con su propio icono, también en la presentación.'],
      ['Corregido', 'La presentación se ve bien en tablet, en vertical y en horizontal.'],
      ['Corregido', 'Textos del PDF que se salían de su casilla.'],
    ],
  },
  {
    v: '1.0.0', d: '4 nov 2026', s: 'Primera versión de Nevú.', items: [
      ['Nuevo', 'Menú semanal que cuadra calorías, proteína y vitaminas.'],
      ['Nuevo', 'Compra en Mercadona o Día con precios reales.'],
      ['Nuevo', 'Despensa con caducidades y recetas con lo que tienes.'],
      ['Nuevo', 'El menú se adapta solo, o lo dejas fijo en Ajustes.'],
      ['Nuevo', 'Candado para fijar platos y «No me gusta» para vetarlos.'],
      ['Nuevo', 'Desliza para cambiar de día y deshaz «Lo he cocinado».'],
      ['Nuevo', 'Calendario de tu cuenta de Google, siempre al día y sin repetidos.'],
      ['Nuevo', 'Privacidad clara y «Borrar todos mis datos».'],
      ['Nuevo', 'Tema Océano, icono, ilustraciones de cada plato y sonidos suaves.'],
      ['Nuevo', 'Pantalla encendida mientras cocinas.'],
      ['Nuevo', 'Nevú Plus: calendario, Google Drive y PDF con un pago único.'],
    ],
  },
];

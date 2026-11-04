# Origen de los productos y precios

Los nombres, marcas, envases y precios contrastados vienen del MCP "Supermercados": la API de Mercadona y la web de dia.es (consultas del 30 de octubre, 2 y 3 de noviembre de 2026; el 3 de noviembre se revisaron de nuevo unos 30 productos y se corrigieron el cacao, el kiwi y el pollo de Día, el tomate de Mercadona y las brochetas de Día, que ya no están a la venta). Son los precios de esos días; cambian con el tiempo y según el código postal, así que toca el precio en la app para confirmarlo en tu tienda.

- Mercadona: 82 productos; 82 contrastados con el MCP, 0 con nombre contrastado y precio estimado, 0 sin contrastar.
- Día: 81 productos; 81 contrastados con el MCP, 0 con nombre contrastado y precio estimado, 0 sin contrastar.

El origen de cada precio se ve en la lista de la compra si activas Ajustes → Compra → «Mostrar el origen de cada precio». Toca cualquier precio para confirmarlo en tienda: se guarda para ese supermercado.

## Qué significa "contrastado"

Nombre, marca, envase y precio salen de la ficha del supermercado. El número de unidades por envase (`q`) sale de la ficha cuando existe; donde no, está contado en la foto del envase o calculado por peso, y la fuente lo dice.

## Vitaminas y minerales

Las fichas de los supermercados casi nunca traen vitaminas ni minerales. Los de `src/nutri.ts` son valores típicos de tablas de composición (USDA FoodData Central y BEDCA), aproximados. Los objetivos diarios son los valores de referencia de la EFSA para adultos.

## Nutrición de los platos

Macros de la ficha de cada producto (`k`); fibra de la tabla de `src/nutri.ts`. Se recalcula con `npx tsx tools/nutricion.ts --aplicar`. Lo que no es dato de ficha:

- Valores genéricos para frescos sin ficha (plátano, zanahoria, tomate, manzana, aguacate, champiñón, boniato, cebolla, pimiento, calabacín, patata, jengibre).
- Aceite de cocinar: 8 g si los pasos lo citan, 5 g si se usa sartén, se dora o se sofríe.
- Pesos por unidad (`gu` en `src/data.ts`): huevo 58 g, plátano 120 g, manzana 180 g, aguacate 150 g, lonchas y rebanadas aproximadas.
- Las brochetas de pollo no tienen nutrición en la ficha: se queda la estimada.

## Salvedades

- Día, Plátano de Canarias: nº de unidades aproximado (no consta en la ficha)
- Mercadona, Pechuga de pavo en lonchas: nº de unidades aproximado (no consta en la ficha)
- Día, Pechuga de pavo: nº de unidades aproximado (no consta en la ficha)
- Mercadona, Manzana Golden: nº de unidades aproximado (no consta en la ficha)
- Día, Manzana Golden: nº de unidades aproximado (no consta en la ficha)
- Día, Espinacas cortadas: la ficha no indica que sean congeladas
- Mercadona, Jamón cocido en lonchas: el envase no indica el nº de lonchas, contado a ojo en la foto
- Día, Jamón cocido extra: nº de unidades aproximado (no consta en la ficha)
- Día, Pan de pita precocido: nº de unidades aproximado (no consta en la ficha)
- Día, Brócoli: la ficha no indica que sea congelado
- Mercadona, Tortilla de patata con cebolla (media): la etiqueta avisa de posibles trazas de pescado, moluscos y crustáceos
- Día, Hogaza de centeno y avena: nº de unidades aproximado (no consta en la ficha)
- Día, Pan de molde alto en proteínas: nº de unidades aproximado (no consta en la ficha); la foto no muestra el nº de rebanadas
- Mercadona, Gyozas de pollo y verduras congeladas: la ficha avisa de posibles trazas de pescado y crustáceos
- Día, Jengibre molido: bote 50 g (molido: 1 g equivale a ~5 g fresco)
- Mercadona, Kiwis verdes: nº de unidades aproximado (no consta en la ficha)
- Pescado, marisco, gyozas y tortilla de patata: algunas etiquetas avisan de trazas de pescado, crustáceos o moluscos. «Sin pescado ni marisco» quita los platos de pescado, pero no las trazas: revisa la etiqueta si tienes alergia.

## Productos contrastados

| Supermercado | Producto | Envase | Precio |
|---|---|---|---|
| Mercadona | Copos de avena (Brüggen) | bolsa 800 g | 1,30 € |
| Día | Copos de avena (Gran Dia) | paquete 500 g | 0,82 € |
| Mercadona | Leche entera (Hacendado) | brik 1 L | 0,96 € |
| Día | Leche entera (Dia Láctea) | brik 1 L | 0,96 € |
| Mercadona | Plátano de Canarias | unidad ≈160 g (3,00 €/kg) | 0,48 € |
| Día | Plátano de Canarias (DIA) | granel ≈1 kg (6 uds aprox.) | 2,99 € |
| Mercadona | Pan de molde 100% integral sin corteza (Hacendado) | paquete 16 rebanadas (450 g) | 1,10 € |
| Día | Pan de molde integral sin corteza (El Molino de Dia) | paquete 16 rebanadas (450 g) | 1,10 € |
| Mercadona | Tomate rallado | bote 290 g | 1,45 € |
| Día | Tomate rallado natural con aceite de oliva (La gergaleña) | bote 200 g | 1,45 € |
| Mercadona | Pechuga de pavo en lonchas (Hacendado) | paquete 225 g (≈10 lonchas) | 2,30 € |
| Día | Pechuga de pavo (Dia Nuestra Alacena) | 2 sobres de 200 g (≈20 lonchas) | 3,99 € |
| Mercadona | Crema de cacahuete 100 % (Hacendado) | bote 500 g | 2,65 € |
| Día | Crema de cacahuete (Just loading) | bote 500 g | 2,99 € |
| Mercadona | Yogur natural (Hacendado) | pack 6 uds (750 g) | 1,00 € |
| Día | Yogur natural (Dia Láctea) | pack 6 uds (750 g) | 1,00 € |
| Mercadona | Huevos medianos clase M (Hacendado) | docena | 2,85 € |
| Día | Huevos medianos M de gallinas criadas en suelo (Dia) | docena | 2,85 € |
| Mercadona | Nuez natural pelada (Hacendado) | bolsa 200 g | 2,40 € |
| Día | Mix de frutos secos naturales (Dia Naturmundo) | bolsa 200 g | 2,60 € |
| Mercadona | Manzana Golden | bolsa 1,5 kg (≈8 uds) | 2,70 € |
| Día | Manzana Golden (DIA) | bolsa 1 kg (≈5 uds) | 1,89 € |
| Mercadona | Macarrón fino (Hacendado) | paquete 500 g | 0,85 € |
| Día | Macarrones (Dia Al Diante) | paquete 500 g | 0,85 € |
| Mercadona | Tomate frito (Hacendado) | bote 630 g | 0,95 € |
| Día | Tomate frito (Dia Vegecampo) | pack 3 botes de 215 g (645 g) | 0,90 € |
| Mercadona | Queso rallado mozzarella (Hacendado) | bolsa 200 g | 1,60 € |
| Día | Queso mozzarella rallado (Dia Láctea) | bolsa 200 g | 1,60 € |
| Mercadona | Cous cous (Hacendado) | paquete 1 kg | 1,95 € |
| Día | Cous cous (Dia Al Diante) | paquete 500 g | 1,19 € |
| Mercadona | Garbanzo cocido (Hacendado) | bote 570 g (400 g escurrido) | 0,80 € |
| Día | Garbanzos cocidos (Dia Vegecampo) | bote 400 g | 0,80 € |
| Mercadona | Espinacas en porciones ultracongeladas (Hacendado) | bolsa 500 g | 1,25 € |
| Día | Espinacas cortadas (Dia Vegecampo) | bolsa 450 g | 0,95 € |
| Mercadona | Filetes de pechuga de pollo corte fino | bandeja 570 g | 4,67 € |
| Día | Pechugas fileteadas (Selección de Dia) | bandeja ≈650 g | 5,19 € |
| Mercadona | Arroz cocido redondo (Sabroz) | bolsa 250 g (2 raciones de 125 g) | 1,05 € |
| Día | Vasos de arroz (Dia Al Punto) | pack 2 vasos de 125 g | 1,00 € |
| Mercadona | Lentejas cocidas (Hacendado) | bote 570 g (400 g escurrido) | 0,90 € |
| Día | Lentejas cocidas (Dia Vegecampo) | bote 400 g | 0,90 € |
| Mercadona | Zanahorias | bolsa 1 kg | 1,00 € |
| Día | Zanahoria (DIA) | bolsa 1 kg | 1,19 € |
| Mercadona | Tortillas de trigo (Hacendado) | pack 10 uds (360 g) | 1,15 € |
| Día | Tortillas de trigo (Dia Al Punto) | pack 8 uds (320 g) | 1,02 € |
| Mercadona | Brotes tiernos | bolsa 100 g | 1,20 € |
| Día | Brotes tiernos (Dia Vegecampo) | bolsa 70 g | 0,99 € |
| Mercadona | Patatas cocidas (Hacendado) | tarro 660 g (400 g escurrido) | 1,90 € |
| Día | Patatas cocidas enteras (Dia Vegecampo) | paquete 400 g | 1,90 € |
| Mercadona | Jamón cocido en lonchas (Hacendado) | paquete 200 g (≈10 lonchas) | 2,25 € |
| Día | Jamón cocido extra (Dia Nuestra Alacena) | sobre 150 g (≈8 lonchas) | 1,99 € |
| Mercadona | Caldo de pollo (Hacendado) | brik 1 L | 0,75 € |
| Día | Caldo de pollo (Dia Al Punto) | brik 1 L | 0,75 € |
| Mercadona | Pan de pita (Mission) | paquete 300 g (5 uds) | 2,00 € |
| Día | Pan de pita precocido (Star) | paquete 400 g (≈8 uds) | 1,79 € |
| Mercadona | Brócoli ultracongelado (Hacendado) | bolsa 1 kg | 1,80 € |
| Día | Brócoli (Dia Vegecampo) | bolsa 900 g | 1,79 € |
| Mercadona | Menestra de verduras ultracongelada (Hacendado) | bolsa 1 kg | 1,75 € |
| Día | Menestra de verduras (Dia Vegecampo) | bolsa 1 kg | 1,75 € |
| Mercadona | Salmorejo (Hacendado) | brik 1 L | 3,00 € |
| Día | Salmorejo (Dia Al Punto) | brik 1 L | 2,19 € |
| Mercadona | Hummus clásico (Hacendado) | tarrina 240 g | 1,05 € |
| Día | Hummus clásico (Dia Al Punto) | tarrina 220 g | 1,29 € |
| Mercadona | Burger de pollo (Hacendado) | pack 6 uds (540 g) | 3,80 € |
| Día | Burger de pollo (Selección de Dia) | pack 6 uds (540 g) | 3,99 € |
| Mercadona | Queso de untar suave (Hacendado) | tarrina 300 g | 1,40 € |
| Día | Queso de untar natural (Dia Láctea) | tarrina 250 g | 1,17 € |
| Mercadona | Champiñón laminado | bandeja 320 g | 2,11 € |
| Día | Champiñón laminado (DIA) | bandeja 250 g | 1,69 € |
| Mercadona | Tortilla de patata con cebolla (media) (Listo para Comer) | tortilla 650 g | 4,75 € |
| Día | Tortilla de patata (Dia Al Punto) | tortilla 600 g | 2,70 € |
| Mercadona | Bases de pizza extrafinas ultracongeladas (Hacendado) | pack 3 bases (420 g) | 1,80 € |
| Día | Bases de pizza (Dia Al Punto) | pack 3 bases (420 g) | 1,79 € |
| Mercadona | Guisante fino ultracongelado (Hacendado) | bolsa 1 kg | 1,55 € |
| Día | Guisantes finos (Dia Vegecampo) | bolsa 1 kg | 1,55 € |
| Mercadona | Maíz dulce (Hacendado) | pack 3 latas (420 g escurrido) | 1,55 € |
| Día | Maíz dulce (Dia Vegecampo) | pack 3 latas de 140 g (420 g) | 1,55 € |
| Mercadona | Aguacate (Hacendado / Mercadona) | pieza ≈190 g | 1,06 € |
| Día | Aguacate bio (DIA) | bandeja 2 uds (400 g) | 2,99 € |
| Mercadona | Tomate ensalada (Hacendado / Mercadona) | pieza ≈230 g | 0,58 € |
| Día | Tomate ensalada (DIA) | granel ≈1 kg | 2,99 € |
| Mercadona | Yogur griego natural (Hacendado) | pack 6 uds (750 g) | 1,45 € |
| Día | Yogur griego natural (Dia Fidias) | pack 6 uds (750 g) | 1,59 € |
| Mercadona | Miel de flores (Hacendado) | bote 500 g | 3,20 € |
| Día | Miel de flores antigoteo (Dia Mielove) | bote 500 g | 3,19 € |
| Mercadona | Queso fresco cottage semidesnatado (Hacendado) | tarrina 200 g | 1,35 € |
| Día | Queso fresco cottage (Dia Láctea) | tarrina 200 g | 1,35 € |
| Mercadona | Pan de molde con 55% de centeno (Hacendado) | paquete 16 rebanadas (720 g) | 1,35 € |
| Día | Hogaza de centeno y avena (El Molino de Dia) | paquete 500 g (≈8 rebanadas) | 1,94 € |
| Día | Pan de molde alto en proteínas (El Molino de Dia) | paquete 400 g (≈8 rebanadas) | 1,99 € |
| Mercadona | Claras de huevo líquidas pasteurizadas (Hacendado / Mercadona) | botella 300 ml | 1,70 € |
| Día | Claras de huevo pasteurizadas (Ovonatur) | botella 500 ml | 1,95 € |
| Mercadona | Pasta fresca gnocchi (Hacendado) | paquete 500 g | 1,00 € |
| Día | Gnocchi de patata (Dia Selección Mundial) | paquete 500 g | 1,00 € |
| Mercadona | Gyozas de pollo y verduras congeladas (Hacendado) | bolsa 230 g (10 uds) | 1,95 € |
| Día | Gyozas de pollo con verdura (Dia Al Punto) | bolsa 400 g | 3,75 € |
| Mercadona | Relleno de kebab de pollo asado ultracongelado (Hacendado) | bolsa 300 g | 3,15 € |
| Día | Carne de kebab de pollo (Bonchef) | bandeja 250 g | 3,25 € |
| Mercadona | Brochetas de pollo con pimiento (Hacendado / Mercadona) | bandeja 4 uds (370 g) | 3,11 € |
| Mercadona | Tiras de pechuga de pollo al horno (Hacendado) | paquete 140 g | 2,25 € |
| Día | Tiras de pollo (Dia Nuestra Alacena) | bolsa 130 g | 1,99 € |
| Mercadona | Atún claro al natural (Hacendado) | pack 6 latas (60 g escurrido cada una) | 4,20 € |
| Día | Atún claro al natural (Dia Mari Marinera) | pack 6 latas de 60 g | 4,20 € |
| Mercadona | Salmón ahumado (Hacendado) | paquete 100 g | 3,70 € |
| Día | Salmón ahumado noruego (Dia Selección Mundial) | paquete 100 g | 3,69 € |
| Mercadona | Gamba pelada cruda mediana ultracongelada (Hacendado) | bolsa (360 g sin hielo) | 4,90 € |
| Día | Gambas peladas y crudas medianas (Dia Mari Marinera) | bolsa 350 g | 4,76 € |
| Mercadona | Filetes de merluza Argentina sin piel ultracongelados (Hacendado) | bolsa (600 g sin hielo) | 4,90 € |
| Día | Filetes de merluza Argentina sin piel (Dia Mari Marinera) | bolsa 400 g | 3,79 € |
| Mercadona | Tofu firme (Hacendado) | paquete 400 g (275 g sin líquido) | 1,75 € |
| Mercadona | Quinoa cocida blanca y roja (Sabroz) | pack 2 vasitos de 125 g | 1,45 € |
| Día | Vasos de arroz integral con quinoa (Brillante) | pack 2 vasos de 125 g | 1,56 € |
| Mercadona | Postre lácteo natural +Proteínas 12 g (Hacendado) | pack 4 uds de 120 g | 1,40 € |
| Día | Skyr natural alto en proteínas (Danone) | pack 4 uds de 100 g | 2,61 € |
| Mercadona | Batata (Hacendado / Mercadona) | pieza ≈390 g | 0,99 € |
| Día | Batata (DIA) | pieza ≈800 g | 1,20 € |
| Mercadona | Zumo pura naranja exprimido (Hacendado) | brik 1 L | 1,85 € |
| Día | Zumo de naranja 100% exprimido sin pulpa (Dia Saborfera) | brik 1 L | 2,10 € |
| Mercadona | Limones (Hacendado / Mercadona) | malla 1 kg (≈8 uds) | 2,30 € |
| Día | Limones (DIA) | malla 750 g (≈6 uds) | 1,39 € |
| Mercadona | Jengibre fresco (Hacendado / Mercadona) | pieza ≈200 g | 1,65 € |
| Día | Jengibre molido (Dia Vegecampo) | bote 50 g (molido: 1 g equivale a ~5 g fresco) | 1,60 € |
| Mercadona | Kéfir natural sabor suave (Hacendado / Mercadona) | bote 500 g | 1,10 € |
| Día | Kéfir natural desnatado (Dia Láctea) | pack 4 × 180 g (720 g) | 1,89 € |
| Mercadona | Infusión Manzanilla (Hacendado) | caja 20 bolsitas | 0,65 € |
| Día | Manzanilla (Dia Tetería) | caja 25 bolsitas | 0,75 € |
| Mercadona | Cacao puro en polvo 0% azúcares añadidos (La Chocolatera) | bote 265 g | 4,40 € |
| Día | Cacao puro en polvo 0% azúcares añadidos (Valor) | bote 250 g | 7,09 € |
| Mercadona | Sardinas en aceite de oliva (Hacendado) | pack 2 latas (168 g escurrido) | 2,25 € |
| Día | Sardinillas en aceite de oliva (Dia Mari Marinera) | pack 2 latas de 65 g | 2,15 € |
| Mercadona | Mix frutos rojos ultracongelados (Hacendado) | bolsa 300 g | 2,00 € |
| Día | Frutos rojos congelados (Dia Fruticampo) | bolsa 300 g | 1,89 € |
| Mercadona | Semillas de chía (Hacendado) | bolsa 250 g | 2,05 € |
| Día | Semillas de chía (Ecocesta) | bolsa 160 g | 2,30 € |
| Mercadona | Chocolate negro 85% cacao (Hacendado) | tableta 100 g | 1,75 € |
| Día | Chocolate negro 85% cacao sin azúcares añadidos (Dia Temptation) | tableta 100 g | 2,29 € |
| Mercadona | Cebollas (Hacendado / Mercadona) | malla 1 kg | 1,50 € |
| Día | Cebolla (DIA) | malla 1 kg | 1,50 € |
| Mercadona | Pimiento rojo (Hacendado / Mercadona) | pieza ≈320 g | 0,93 € |
| Día | Pimiento rojo (DIA) | pieza ≈350 g | 1,22 € |
| Mercadona | Calabacín verde (Hacendado / Mercadona) | pieza ≈420 g | 0,59 € |
| Día | Calabacín (DIA) | pieza ≈650 g | 1,10 € |
| Mercadona | Patatas (Hacendado / Mercadona) | malla 3 kg | 4,65 € |
| Día | Patatas (DIA) | malla 4 kg | 2,99 € |
| Mercadona | Preparado de coco (leche de coco) (Hacendado) | bote 400 ml | 1,30 € |
| Día | Jugo de coco light (Tiger Khan) | lata 400 g | 2,39 € |
| Mercadona | Edamame soja verde ultracongelada (Hacendado) | bolsa 500 g | 1,75 € |
| Día | Edamame (Bonduelle) | pack 2 × 80 g | 2,59 € |
| Mercadona | Bebida de soja con calcio y vitaminas sin azúcares añadidos (Hacendado) | brik 1 L | 0,65 € |
| Día | Bebida de soja con calcio (Dia Vegedia) | brik 1 L | 0,65 € |
| Mercadona | Kiwis verdes (Hacendado / Mercadona) | bandeja ≈1,1 kg (≈11 uds) | 5,01 € |
| Día | Kiwi (DIA) | bandeja 700 g (≈7 uds) | 2,99 € |
| Mercadona | Judía verde redonda ultracongelada (Hacendado) | bolsa 1 kg | 1,30 € |
| Día | Judías verdes redondas (Dia Vegecampo) | bolsa 1 kg | 1,30 € |
| Mercadona | Lomos de salmón sin piel congelados (Hacendado) | paquete 2 lomos (250 g) | 5,95 € |
| Día | Lomos de salmón (Dia Selección Mundial) | paquete 250 g | 5,89 € |
| Mercadona | Mozzarella fresca de vaca (Hacendado) | bolsa 125 g escurrido | 0,90 € |
| Día | Mozzarella fior di latte (Dia Selección Mundial) | bolsa 125 g | 0,90 € |
| Mercadona | Alubia cocida blanca (Hacendado) | bote 570 g (400 g escurrido) | 0,75 € |
| Día | Alubias blancas cocidas (Dia Vegecampo) | bote 400 g | 0,75 € |
| Mercadona | Queso fresco batido desnatado 0% MG (Hacendado) | tarrina 500 g | 1,10 € |
| Día | Queso fresco batido rico en proteínas (Granja Rinya) | pack 4 × 100 g | 1,89 € |
| Mercadona | Berenjena (Hacendado / Mercadona) | pieza ≈400 g | 0,88 € |
| Día | Berenjena (DIA) | pieza ≈300 g (2,63 €/kg) | 0,79 € |
| Mercadona | Zumo de manzana (Hacendado) | pack 6 mini briks de 200 ml | 1,30 € |
| Día | Bebida de zumo de manzana sin azúcares añadidos (Dia Saborfera) | brik 1 L | 0,80 € |
| Mercadona | Mango (Hacendado / Mercadona) | pieza ≈560 g (2,90 €/kg) | 1,62 € |
| Día | Mango congelado en dados (Dia Fruticampo) | bolsa 300 g | 1,79 € |

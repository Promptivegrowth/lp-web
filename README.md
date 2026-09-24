# Laboratorios Pacheco — sitio web

Sitio corporativo de **Laboratorios Pacheco S.A.C.** (Callao, Perú): servicio de
acondicionado, reacondicionado y fraccionamiento de productos farmacéuticos,
dispositivos médicos, productos sanitarios y cosméticos.

Sitio estático multipágina construido con **Vite**. Sin framework ni dependencias
en tiempo de ejecución: el resultado del build es HTML, CSS y un único archivo JS
de ~9 kB. Está pensado para desplegarse igual de bien en **Vercel** (vía GitHub)
que en un **cPanel de Namecheap** subiendo la carpeta `dist/` por FTP.

---

## Puesta en marcha

```bash
npm install        # dependencias (vite + sharp)
npm run dev        # servidor de desarrollo en http://localhost:5173
npm run build      # genera dist/
npm run preview    # sirve dist/ para revisarlo antes de publicar
npm run images     # regenera public/img/ a partir de las fotos originales
npm run documentos # regenera public/documentos/ (PDF de respaldo); requiere Python + PyMuPDF
```

---

## Estructura

```
.
├── index.html            Portada
├── nosotros.html         Quiénes somos, compromisos y galería de planta
├── servicios.html        Los 11 servicios con detalle (anclas por servicio)
├── equipo.html           Equipo y organigrama
├── certificacion.html    Certificación BPM
├── contacto.html         Datos, formulario y mapa
├── 404.html
│
├── src/
│   ├── partials/         Cabecera, pie, preloader, lightbox e iconos
│   ├── styles/main.css   Sistema de diseño completo
│   └── js/main.js        Interacciones (sin dependencias)
│
├── public/               Se copia tal cual a dist/
│   ├── img/              Imágenes ya optimizadas (generadas, ver más abajo)
│   ├── .htaccess         Configuración de Apache para cPanel
│   ├── robots.txt, sitemap.xml, site.webmanifest
│   └── favicon-32.png, icon-192.png, icon-512.png, apple-touch-icon.png
│
├── fuentes/clientes/     Logotipos de clientes (fuente del pipeline)
├── fotos/                Fotografías originales — NO se versiona (ver abajo)
├── PROCESOS/             Retoques del cliente (PNG) — NO se versiona
├── documentos/           PDF originales del cliente — NO se versiona
├── tools/images.mjs      Pipeline de optimización de imágenes
├── tools/documentos.py   Preparación de los PDF de respaldo
├── vite.config.js
└── vercel.json
```

### Partials

Las páginas comparten cabecera, pie y preloader mediante un plugin propio de Vite
(`vite.config.js`). Dentro del HTML se escribe:

```html
<!--@include partials/header.html-->
```

y se resuelve **en tiempo de build**, no en el navegador. El plugin también marca
con `aria-current="page"` el enlace de navegación cuyo `data-p` coincide con el
nombre del archivo, de modo que el estado activo del menú no necesita JavaScript.

Las páginas internas llevan `class="pagina-interna"` en el `<body>`: eso hace que
la cabecera sea sólida desde el inicio en lugar de transparente sobre el hero.

### Iconos

`src/partials/iconos.html` es un sprite SVG con los once iconos de servicio más
dos auxiliares, definidos como `<symbol>` sobre una rejilla de 24 con trazo de
1,6. Se incluye una vez por página y cada icono se referencia con `<use>`, de
modo que el marcado repetido pesa unos pocos bytes y el color se hereda del
contexto con `currentColor`.

### Aparición en cortina

Las tarjetas de «Por qué elegirnos» usan `revelar--cortina`: se descubren de
abajo hacia arriba con un `clip-path` animado mientras la fotografía hace un
contra-zoom y el texto sube un instante después. El contra-zoom se aplica con la
propiedad `scale` —independiente de `transform`— para no pisar el zoom del
`:hover`, que sigue usando `transform`.

Las dos primeras tarjetas van en una fila y la tercera ocupa todo el ancho: su
fotografía es apaisada y como banner se aprovecha mucho mejor que recortada en
vertical.

### Flujograma del proceso

La sección «Cómo trabajamos» es un flujograma que se enciende etapa por etapa
cuando entra en pantalla: el conector se rellena, un destello lo recorre, el
nodo se activa, el icono se traza y el texto sube. Cada etapa hereda su turno de
la variable `--i` que lleva en el marcado, de modo que la secuencia es pura CSS.

Los iconos se dibujan con `stroke-dasharray`/`stroke-dashoffset` y llevan
`pathLength="1"`, lo que normaliza la longitud de cada trazo y evita tener que
medirla. Al señalar una etapa el icono se vuelve a trazar.

En pantallas de menos de 1040 px el flujo pasa a vertical: los conectores giran
de `scaleX` a `scaleY` y el recorrido se lee de arriba abajo.

### Carrusel de clientes

Los logotipos originales son cuadrados de 300×300 con mucho margen blanco
alrededor: al escalarlos, la marca quedaba diminuta y apenas se distinguía. El
pipeline los recorta con `trim()` y los vuelve a encajar en un lienzo común, de
modo que todos pesan lo mismo visualmente. En pantalla van en tarjeta blanca —
comparten fondo con la imagen, así que se leen como una pared de logos— sobre
dos pistas que avanzan en sentidos opuestos y a distinta velocidad. Al señalar
una tarjeta el carrusel se detiene, el logotipo recupera todo su color y una
línea verde se abre bajo él.

### La hoja de estilos va enlazada, no importada

`main.css` se enlaza con `<link rel="stylesheet">` desde el `<head>` de cada
página en lugar de importarse desde `main.js`. Importándola, en desarrollo Vite
la inyecta por JavaScript y el navegador llegaba a pintar la página sin estilar:
durante un instante el documento medía 57.000px y todas las imágenes se dibujaban
a tamaño natural. Enlazada es render-blocking y eso no ocurre ni en desarrollo ni
en producción.

### Cabeceras de página

Todas las páginas internas comparten `.cabecera-pagina`. Dos modificadores:

- `--alta` sube la banda a ~660px (Nosotros y Equipo).
- `--panoramica` hace que la banda siga la proporción de la fotografía,
  acotada por el alto de la ventana, de modo que apenas haya que recortarla
  (Certificación y Contacto: del 34–81% visible se pasó al 87–97%). Va después
  de `--alta` y con doble clase, porque con la misma especificidad la altura de
  aquélla la pisaría.

En vertical una fotografía panorámica no cabe, así que esas dos páginas sirven
además un recorte cuadrado mediante `<source media="(max-width: 700px)">`.

Todas llevan un zoom cinematográfico lento y alternante.

### Página Contacto

El formulario y los datos son dos piezas enmarcadas —blanca y oscura— y el mapa
va debajo con su propio marco de inspección y una chapa con la dirección. El
botón «Cotizar servicio» de la cabecera apunta a `contacto.html#cotizar`, que es
el ancla de esa sección.

### Página Equipo

- La cabecera usa una versión apaisada propia y la variante alta, igual que
  Nosotros.
- **Liderazgo** ordena por jerarquía: Gerencia General abre en una tarjeta ancha
  con la fotografía al lado del texto, y las tres jefaturas siguen en fila. Los
  retratos se recortan a 3:4 —el encuadre que menos pierde de estos originales
  verticales— y el texto va debajo de la imagen, nunca encima: no hay velos
  oscuros sobre las caras. Al señalar aparecen las esquinas del visor.
- Se retiraron los bloques de «Dirección y gestión regulatoria», «Operaciones y
  logística» y «Áreas estratégicas», que repetían el organigrama sin aportar al
  visitante.

### Página Nosotros

Tres bloques propios de esta página:

- **Quiénes somos** usa una fotografía vertical (`secciones/quienes-somos`,
  recortada de un original 3:4), de modo que el marco no corta nada. La
  anterior era apaisada y perdía a media plantilla.
- **Misión y visión** son dos paneles unidos por un eje punteado, cada uno con
  su icono marcado al agua, un trazado que se dibuja y una tira de código de
  barras que se rellena. Sólo existe aquí; la prueba lo verifica en las demás
  páginas.
- **Lo que nos define** son tres filas editoriales —índice grande, icono que se
  traza y una barra verde que crece al señalar— en lugar de tres cajas iguales.

Los iconos de estos dos últimos bloques van **en línea** y no en el sprite: el
`<use>` del sprite crea un shadow DOM cuyos trazos no se pueden animar desde
CSS, y aquí hacía falta dibujarlos uno a uno.

### Megamenú

El desplegable de Servicios agrupa los once servicios en tres columnas
temáticas. Al abrirse, el panel se despliega hacia abajo mediante un recorte
progresivo (`clip-path`), un haz verde lo recorre una sola vez —el mismo guiño
al escáner que usa el preloader— y las tarjetas entran escalonadas en diagonal
según la variable `--i` que fija cada una en el marcado. Funciona sin
JavaScript: todo se resuelve con `:hover` y `:focus-within`, así que también
responde a la navegación por teclado.

Detalle importante: el panel **no** usa `pointer-events` para activarse. Esa
propiedad no admite transición, así que en cuanto el cursor salía del enlace el
panel dejaba de ser alcanzable y el menú se cerraba antes de que la mano llegara
a él. Se apoya en `visibility`, que sí acepta retardo: durante el margen de
gracia el panel sigue siendo «hoverable» y el recorrido en diagonal funciona.
El `.nav__item` además ocupa toda la altura de la cabecera para que no quede una
franja muerta entre el enlace y el panel.

---

## Imágenes

Las fotos originales pesan **≈148 MB** (70 archivos de hasta 2,7 MB). El pipeline
las reduce a **≈11 MB** en WebP + JPG de respaldo, en varios anchos:

```bash
npm run images
```

`tools/images.mjs` lee de `fotos/` y `fuentes/clientes/`, y escribe en
`public/img/`. **Borra y regenera `public/img/` por completo**, así que no
conviene añadir archivos a mano dentro de esa carpeta: hay que declararlos en el
pipeline.

Para cambiar qué foto se usa en cada sección basta con editar la lista `JOBS` del
mismo archivo. Los retratos del equipo se recortan a 4:5 usando la estrategia
`attention` de sharp, que centra el encuadre en la zona de interés.

En el HTML cada imagen se sirve con `<picture>`: WebP con `srcset` por ancho y un
`<img>` JPG de respaldo, siempre con `width`/`height` para evitar saltos de
maquetación.

> **Las fotos originales no están versionadas.** Meter 148 MB en el repositorio
> haría lenta cada clonación y cada build de Vercel. Se conservan fuera del
> repositorio (carpeta `fotos/`, excluida en `.gitignore`); lo que sí se versiona
> es `public/img/` ya optimizado, de modo que el sitio compila y despliega sin
> necesidad de los originales. Para volver a ejecutar `npm run images` hay que
> recuperar `fotos/` en la raíz del proyecto.

## Documentos de respaldo

La página Certificación ofrece para descarga el certificado BPM, las resoluciones
directorales de DIGEMID y la licencia municipal. Los PDF originales del cliente
(escaneos) van en `documentos/`, que no se versiona; la copia publicada se genera
con:

```bash
npm run documentos
```

`tools/documentos.py` baja los escaneos a 200 ppp, recomprime a JPEG, limpia los
metadatos y guarda el PDF ligero en `public/documentos/` (no en `public/img/`,
porque `npm run images` borra esa carpeta entera). No altera el contenido de los
documentos. La página solo ofrece la descarga, sin vista previa. Requiere Python
con PyMuPDF y Pillow (`pip install pymupdf pillow`).

Si se añade o renueva un documento, hay que declararlo en la lista `DOCUMENTOS`
del script y actualizar su tarjeta en `certificacion.html` (título, fechas,
páginas y peso).

---

## Despliegue

### Vercel (vía GitHub)

El repositorio ya incluye `vercel.json`. Al importar el proyecto en Vercel, se
detecta solo:

- **Build command:** `npm run build`
- **Output directory:** `dist`

`cleanUrls` está activado, así que las páginas quedan accesibles tanto en
`/servicios` como en `/servicios.html`. Cada `push` a la rama principal publica
una nueva versión.

### cPanel de Namecheap (subida manual)

```bash
npm run build
```

Subir **todo el contenido de `dist/`** (no la carpeta en sí) a `public_html/`.
Debe incluirse el archivo oculto **`.htaccess`**, que ya viaja dentro de `dist/`
— conviene activar «Mostrar archivos ocultos» en el Administrador de archivos de
cPanel para comprobar que subió.

El `.htaccess` se encarga de forzar HTTPS, redirigir de `www` a dominio sin `www`,
permitir URLs sin `.html`, servir la página 404, activar compresión y fijar
cabeceras de caché y de seguridad. Si se prefiere conservar el `www`, basta con
comentar ese bloque de reglas.

El sitio funciona también dentro de un subdirectorio (por ejemplo
`public_html/web/`) porque el build usa rutas relativas (`base: './'`).

---

## Formulario de contacto

Al ser un sitio estático no hay backend. El formulario funciona en dos modos:

1. **Sin configurar (comportamiento actual):** al enviar se abre el gestor de
   correo del visitante con todos los campos ya redactados hacia
   `gestioncomercial@laboratoriospacheco.com`.
2. **Con endpoint:** si se añade el atributo `data-endpoint` al formulario, los
   datos se envían por `fetch` en JSON y el visitante no sale de la página.

```html
<form class="formulario" id="form-contacto" data-endpoint="https://formspree.io/f/XXXX" novalidate>
```

Sirve cualquier servicio que acepte JSON por POST (Formspree, Web3Forms, una
función serverless de Vercel…). El formulario incluye un campo trampa
(`empresa_web`) oculto para descartar envíos automatizados.

---

## Responsive

Verificado en trece anchos, de 320px a 2560px: sin desbordamiento horizontal,
sin elementos que se salgan de la pantalla y sin textos que rebosen su caja en
ninguno.

Dos ajustes que salieron de esa revisión:

- En móvil el contenido del hero no cabía en una pantalla (994px sobre 844) y la
  barra con las cifras y los puntos del carrusel quedaban por debajo del
  pliegue. Se aprieta el ritmo vertical en dos escalones —720px y 380px— y desde
  320×720 entra todo.
- Las áreas táctiles pequeñas se ampliaron: enlaces de listas, migas y enlaces
  de flecha reciben relleno vertical, y los puntos del carrusel pasan de 3px a
  29px de alto mediante relleno propio (un pseudoelemento no servía, porque el
  `overflow: hidden` del botón lo recortaba).

## Comprobaciones

En `scratchpad` (fuera del repositorio) viven dos guiones de verificación que se
usaron durante el desarrollo y conviene repetir tras cada cambio grande:

- Una batería que recorre las siete páginas en escritorio y móvil buscando
  errores de consola, recursos rotos, desbordamiento horizontal, elementos sin
  revelar y regresiones de estilo, más las interacciones (megamenú, carrusel,
  lightbox, flujograma, vídeo, formulario, cabecera y menú móvil).
- Una auditoría responsive sobre trece anchos, de 320px a 2560px.

Los iframes de Google Maps y de YouTube generan ruido propio en consola —
peticiones internas bloqueadas por CORS, permisos que el navegador deniega— que
se descarta explícitamente para que no tape fallos del sitio.

## Notas de implementación

- **Preloader:** el código de barras del logotipo se ilumina de izquierda a
  derecha siguiendo el progreso real de descarga de las imágenes, recorrido por
  el haz de un escáner. Tiene un límite de seguridad de 6 s para no bloquear
  nunca la página, y se salta por completo si el visitante tiene activado
  «reducir movimiento».
  Aparece **sólo en la portada**: navegar entre secciones internas no vuelve a
  mostrarlo. La portada lleva además unas pocas reglas críticas en línea en el
  `<head>` que pintan el telón negro antes de que llegue la hoja de estilos, de
  forma que no se vea un destello del contenido sin estilar.
- **Anclas profundas:** el desplazamiento bajo la cabecera lo aporta el
  `scroll-padding-top` de `:root`. No debe declararse además `scroll-margin-top`
  en las secciones destino, porque ambos valores se suman y el destino queda
  hundido. Como las imágenes que aún se descargan pueden desplazar la
  maquetación después del salto inicial, `anclaInicial()` recoloca el destino
  hasta que el visitante toca el scroll.
- **Revelado al hacer scroll:** se usa un barrido propio sincronizado con
  `requestAnimationFrame` en lugar de `IntersectionObserver`. Con un scroll muy
  rápido el observador puede no llegar a notificar elementos que atraviesan la
  pantalla entre dos fotogramas, y esos elementos quedaban invisibles de forma
  permanente.
- **Barrido de luz del sello BPM:** el destello vive en un `::after` del
  contenedor `.sello-luz`, que recorta en círculo (`border-radius: 50%` más
  `overflow: hidden`). Así el brillo sigue la forma del sello y no la caja
  rectangular que lo envuelve. El `isolation: isolate` mantiene el
  `mix-blend-mode: screen` dentro del contenedor.
- **Logotipo:** se usa siempre la versión a color, también sobre fondos oscuros.
  La «L» y la «P» van caladas en blanco sobre el verde, así que una versión
  monocroma blanca haría desaparecer esas dos letras.
- **Accesibilidad:** navegación por teclado en el lightbox y el menú, enlace de
  salto al contenido, foco visible, textos alternativos descriptivos y respeto
  por `prefers-reduced-motion`.
- **Idioma del código:** clases CSS y funciones en español, para que coincidan
  con el idioma del contenido y de quien mantenga el sitio.

---

## Contenido

Los textos de servicios, misión, visión, certificación y equipo provienen del
sitio anterior (`laboratoriospacheco.com`) y se han conservado literalmente.
Los datos de contacto, teléfonos, correos y redes sociales son los publicados por
la empresa.

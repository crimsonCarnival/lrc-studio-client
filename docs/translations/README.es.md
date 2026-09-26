# LRC Studio

Una aplicación web profesional para sincronizar letras de canciones con audio, con soporte para sincronización por palabras estilo karaoke, contenido multilingüe, proyectos en la nube y una plataforma social para compartirlos.

**[lrc-studio.vercel.app](https://lrc-studio.vercel.app)** · [GitHub](https://github.com/crimsonCarnival/lrc-studio) · [README del servidor](../../../server/README.md) · [Documentación (DeepWiki)](https://deepwiki.com/crimsonCarnival/lrc-studio)

> Idiomas: [English (Inglés)](../../README.md)

## Tabla de Contenidos

- [Características](#características)
  - [Fuentes de Audio](#-fuentes-de-audio)
  - [Modos del Editor](#modos-del-editor)
  - [Tiempos y Sincronización](#tiempos-y-sincronización)
  - [Estampado Automático con IA](#-estampado-automático-con-ia)
  - [Búsqueda e Importación de Letras](#-búsqueda-e-importación-de-letras)
  - [Secciones e Intérpretes](#secciones-e-intérpretes)
  - [Contenido de la Letra](#contenido-de-la-letra)
  - [Importación](#importación)
  - [Exportación](#exportación)
  - [Vista Previa en Vivo](#vista-previa-en-vivo)
  - [Gestión de Proyectos](#gestión-de-proyectos)
  - [Plataforma Social](#-plataforma-social)
  - [Gamificación](#-gamificación)
  - [Compartir](#compartir)
  - [Atajos de Teclado](#️-atajos-de-teclado)
  - [Interfaz y Temas](#interfaz-y-temas)
  - [Paneles de Configuración](#paneles-de-configuración)
  - [Autenticación](#autenticación)
  - [Moderación y Administración](#moderación-y-administración)
- [Pila Tecnológica](#pila-tecnológica)
- [Empezando](#empezando)
- [Referencia de la API](#referencia-de-la-api)
  - [`/health`](#health)
  - [`/auth`](#auth)
  - [`/projects`](#projects)
  - [`/lyrics` y `/editor`](#lyrics-y-editor--análisis-y-operaciones-del-editor)
  - [`/lyrics` búsqueda e importación](#lyrics--búsqueda-e-importación)
  - [`/asr`](#asr--estampado-automático)
  - [`/uploads`](#uploads)
  - [`/settings`](#settings)
  - [`/notifications`](#notifications)
  - [Otros endpoints](#song-metadata-youtube-google-og)
  - [`/admin`](#admin)
  - [GraphQL](#graphql--post-graphql)
  - [Socket.IO](#socketio)
- [Consideraciones de Despliegue con Docker](#consideraciones-de-despliegue-con-docker)
- [Referencia del Formato LRC](#referencia-del-formato-lrc)
- [Licencia](#licencia)

## Características

### 🎵 Fuentes de Audio

- **Archivos locales** — Arrastra y suelta o navega para cargar MP3, WAV, FLAC, OGG y otros formatos comunes. Forma de onda completa con controles de búsqueda y bucle.
- **YouTube** — Pega cualquier URL de YouTube para reproducir el audio directamente en el editor. Incluye indicador visual de progreso con soporte para bucle A-B.
- **Cloudinary / URL directa** — Pega una URL de audio directa y se carga mediante el elemento de audio HTML; las subidas autenticadas de menos de 50 MB se almacenan en Cloudinary y se restauran automáticamente al abrir el proyecto.

### Modos del Editor

- **Modo LRC** — Sincronización línea por línea con marcas de tiempo precisas al milisegundo. Pulsa una tecla configurable (por defecto: `Space`) para estampar la posición actual de reproducción en la línea activa.
- **Modo SRT** — Formato de subtítulos con tiempos de inicio y fin por línea, para una colocación precisa.
- **Modo Palabras** — Sincronización karaoke por palabra. Cada palabra recibe su propia marca de tiempo, lo que permite la animación de relleno karaoke en la vista previa.

El selector de modo está en la barra flotante del editor, junto a Estampado Automático. El Modo Palabras requiere al menos una línea sincronizada para poder anclar los tiempos por palabra.

### Tiempos y Sincronización

- **Estampado con teclado** — Atajos totalmente configurables para marcar, ajustar y navegar entre líneas durante la sincronización.
- **Ajuste fino** — Desplaza marcas de tiempo hacia delante o atrás en incrementos configurables (por defecto: 0.1 s / 0.01 s fino).
- **Desplazamiento masivo** — Selecciona varias líneas y desplaza sus marcas de tiempo a la vez.
- **Desfase global** — Desplaza todas las marcas de tiempo de una sola vez.
- **Bucle A-B** — Define puntos de inicio y fin en la forma de onda o la barra de progreso para practicar una sección repetidamente.
- **Pausa automática al marcar** — Pausa la reproducción automáticamente después de estampar una línea.
- **Detección de marcas superpuestas** — Una insignia advierte cuando dos líneas comparten la misma marca de tiempo.

### 🤖 Estampado Automático con IA

- **Transcripción con un clic** — Carga un archivo de audio local, una subida de Cloudinary **o una URL de YouTube**, y pulsa Estampado Automático para transcribir el audio y alinear cada línea automáticamente. El audio de YouTube se extrae en el servidor; esta función no se limita a archivos locales.
- **Estampado por palabra** — En Modo Palabras, las marcas de tiempo se distribuyen por palabra y no solo por línea, produciendo una pista de karaoke lista para usar.
- **Alineación monótona** — Las letras se emparejan con la transcripción mediante alineación global Needleman-Wunsch, que preserva el orden por construcción. Los estribillos repetidos mantienen su orden en lugar de colapsar sobre la primera aparición.
- **Progreso en tiempo real** — Una barra de progreso sigue cada fase (obtener audio → extraer → transcribir → alinear → aplicar).
- **Vista previa línea por línea** — Los resultados se preparan, no se escriben directamente. Revisa cada línea emparejada y su tiempo asignado antes de confirmar.
- **Puntuación de confianza** — Cada línea recibe un estado: emparejada, parcial, baja o ninguna. Las líneas de baja confianza se resaltan para revisión, y editar una marca manualmente borra su insignia.
- **Modos de aplicación** — «Solo vacías» (por defecto: rellena solo líneas sin tiempo) o «Todas» (sobrescribe las existentes, con confirmación).
- **Emparejamiento difuso** — Una tolerancia configurable controla cuán flexible es el emparejamiento, absorbiendo discrepancias menores en la letra y errores de transcripción.
- **Reejecutable** — Vuelve a ejecutarlo para recuperar las líneas que la primera pasada no encontró. Con el modo por defecto, la operación es idempotente.
- **Trabajo en segundo plano y cancelación** — Los trabajos corren en el servidor y pueden cancelarse en cualquier momento; el modal sigue accesible aunque se cierre a mitad.
- **Integración con la clasificación** — Las líneas estampadas por IA se registran por separado y se ponderan a 0.3× para preservar el valor de la sincronización manual.

> Requiere una clave de API de Groq en el servidor. Las fuentes de YouTube necesitan además `yt-dlp` y, en producción, un proveedor de PO-token. Límites: vídeos de 20 minutos, 25 MB de audio.

### 🔍 Búsqueda e Importación de Letras

Busca una canción e importa su letra sin salir de la aplicación — disponible tanto en el asistente de configuración como en la barra del editor.

- **Letras ya sincronizadas** — El proveedor principal, [LRCLIB](https://lrclib.net), devuelve LRC *ya sincronizado*. Cuando se encuentra una canción ahí, puedes saltarte tanto la sincronización manual como la transcripción.
- **Los resultados sincronizados se indican de antemano** — Los resultados muestran una insignia «Sincronizada» y la duración *antes* de elegir, para que puedas escoger deliberadamente la versión con tiempos.
- **Valores por defecto sensatos** — Cuando un resultado trae marcas de tiempo, «Conservar marcas de tiempo» viene marcado y la importación se convierte directamente en líneas con tiempo. Desmárcalo para importar solo el texto.
- **Cadena de proveedores** — LRCLIB → LyricFind (si está licenciado) → lyrics.ovh, cada uno aislado para que un proveedor caído no haga fallar la búsqueda. La atribución del proveedor se muestra en la vista previa.
- **Funciona sin ninguna clave de API** — No se requieren credenciales para buscar ni importar.
- **Reemplazo seguro** — Importar desde el editor reemplaza la letra actual, por lo que pide confirmación siempre que haya trabajo que perder. En cualquier caso, se puede deshacer.

### Secciones e Intérpretes

- **Marcadores de sección** — Agrupa líneas en secciones (Intro, Verso, Estribillo…) en la lista de letras o con sintaxis de texto plano.
- **Colores por intérprete** — Asigna intérpretes a una sección o a líneas individuales. Cada intérprete recibe un color estable de una paleta compartida, de modo que el editor y la vista previa siempre resuelven el mismo intérprete al mismo color.
- **Sintaxis en texto plano** — Edita la estructura como texto: `[Chorus | Mira, Theo]` declara una sección con intérpretes, y `Mira: línea` asigna un intérprete a una línea. Los prefijos solo se aplican si el nombre está en la lista de intérpretes del proyecto, así que una letra normal como `Baby: come on` sigue siendo letra.
- **Secciones plegables** — Pliega y despliega secciones al editar canciones largas.

### Contenido de la Letra

- **Letra secundaria** — Añade una pista de texto secundaria por línea (por ejemplo, romaji o pronunciación en otro idioma).
- **Capa de traducción** — Un campo de traducción independiente por línea.
- **Furigana / marcado Ruby** — Anota caracteres CJK con sus lecturas usando la sintaxis `{字|じ}`. El editor muestra el marcado ruby sobre el carácter.
- **Tokenización consciente de CJK** — El texto japonés, chino y coreano se divide carácter por carácter para el tiempo por carácter; las secuencias latinas se mantienen como palabras completas.
- **Formato de lectura** — Alterna entre Hiragana y Katakana para las lecturas fonéticas.
- **Visualización de dos líneas** — Muestra opcionalmente la línea siguiente bajo la activa durante la sincronización.

### Importación

- **Pegar / escribir** — Introduce la letra directamente en el editor.
- **Importar archivo** — Carga archivos `.lrc`, `.srt` o `.txt` existentes. El LRC por palabras (Enhanced LRC) es compatible y conserva las marcas por palabra.
- **Importar desde URL** — Importa una letra desde una URL remota.
- **Detección al pegar** — Pegar un bloque LRC o SRT se detecta y analiza automáticamente.
- **Búsqueda de letras** — Ver [Búsqueda e Importación de Letras](#-búsqueda-e-importación-de-letras).

### Exportación

- **Descarga LRC** — Formato estándar `[MM:SS.xx]` con marcas por palabra opcionales (`<MM:SS.xx>`).
- **Descarga SRT** — Formato `HH:MM:SS,ms --> HH:MM:SS,ms` con contenido secundario opcional en la segunda línea.
- **Copiar al portapapeles** — Copia al instante la salida LRC o SRT compilada.
- **Etiquetas de metadatos LRC** — Incluye opcionalmente `[ti:]`, `[ar:]`, `[al:]`, `[lg:]`.
- **Precisión configurable** — Centésimas (`[01:23.45]`) o milésimas (`[01:23.456]`) para marcas de línea y de palabra.
- **Fin de línea** — LF o CRLF para compatibilidad con distintos reproductores.
- **Omitir líneas vacías** — Excluye automáticamente las líneas sin sincronizar o en blanco.
- **Normalizar marcas de tiempo** — Ordena y elimina duplicados al exportar.
- **Patrón de nombre de archivo** — `lyrics.lrc` fijo o derivado del título del proyecto.
- **Interruptores de traducción y secundaria** — Elige qué pistas incluir en la salida.
- **Compilación en servidor con reserva local** — Compila en el servidor para formatos avanzados y recurre automáticamente al compilador local si el servidor no está disponible.

### Vista Previa en Vivo

- **Vista karaoke en tiempo real** — Resalta la línea en reproducción y rellena las palabras carácter por carácter (en Modo Palabras).
- **Suavizado del relleno karaoke** — Lineal (preciso) o ease-in/out (suave).
- **Selección de pista de relleno** — Aplica la animación al texto principal, al secundario o a ambos.
- **Mostrar traducción** — Muestra opcionalmente la traducción bajo cada línea.
- **Mostrar furigana** — Alterna las anotaciones ruby.
- **Tamaño de fuente** — Pequeño, Normal, Grande, Extra grande.
- **Espaciado de línea** — Compacto, Normal o Amplio.
- **Alineación** — Izquierda, centro o derecha.
- **Desplazamiento automático** — Desplaza la línea activa a la vista; alineación (centro, arriba, más cercana, desactivado) y comportamiento (suave / instantáneo) configurables.

### Gestión de Proyectos

- **Biblioteca de proyectos** — Explora, busca y gestiona todos tus proyectos. Cada uno guarda letras, marcas de tiempo, referencias de medios y estado del editor.
- **Sincronización en la nube** — Los proyectos autenticados se guardan en el servidor automáticamente. Se crean en el primer guardado y luego se parchean de forma incremental: un cambio de una sola línea envía un parche posicional quirúrgico en lugar del documento completo.
- **Modo invitado y reclamación de proyectos** — Usa el editor por completo sin cuenta. Tu borrador vive en `localStorage` y migra a tu cuenta al iniciar sesión, con cualquier método de autenticación.
- **Autoguardado** — Se activa tras un intervalo configurable o tras un número de ediciones, lo que ocurra primero.
- **Guardado manual** — Botón de guardar con indicador de estado.
- **Reserva en almacenamiento local** — Los datos se replican localmente para que el trabajo sobreviva a una desconexión.
- **Sincronización entre pestañas** — Los guardados se emiten por WebSocket, así otra pestaña abierta en el mismo proyecto se actualiza en vivo.
- **Biblioteca de subidas** — Consulta todos los archivos de audio y pistas de YouTube asociados previamente a proyectos.
- **Metadatos del proyecto** — Nombre, descripción, etiquetas, título/artista/álbum/año/género/idioma de la canción, números de pista, portada y lista de intérpretes.

### 🌐 Plataforma Social

- **Proyectos públicos** — Publica un proyecto y obtén una vista pública con su propio estilo e imagen de previsualización Open Graph.
- **Estrellas y bifurcaciones** — Marca proyectos con estrella; bifurca uno para construir sobre él (el propietario puede desactivar la bifurcación).
- **Impulsos** — Impulsa un proyecto para subirlo en tendencias.
- **Reacciones** — Reacciones con emoji en proyectos y comentarios.
- **Comentarios** — Comenta los proyectos.
- **Seguimiento y feed** — Sigue a otros usuarios y obtén una cronología de su actividad.
- **Explorar** — Proyectos y listas en tendencia y populares, con búsqueda.
- **Listas de reproducción** — Agrupa proyectos en listas públicas o privadas, ordenadas manualmente o por fecha, estrellas u orden alfabético.
- **Perfiles** — Perfil público con estadísticas, insignias y un mapa de calor de actividad opcional. Un modo «ver como otros» muestra exactamente lo que ven los visitantes.
- **Notificaciones** — Entrega en tiempo real para estrellas, bifurcaciones, seguidores, reacciones, insignias y eventos de moderación.
- **Bloqueo de usuarios** — Bloquea a otro usuario.
- **Controles de privacidad** — Visibilidad en línea, preferencias de notificación, insignias del mini-perfil y si tu mapa de calor es público.

### 🏆 Gamificación

- **XP y niveles** — Gana XP y sube de nivel; el nivel determina cuántas ranuras de insignias destacadas tienes.
- **Insignias** — Se otorgan por orden de registro, minutos sincronizados, número de proyectos, verificación y más.
- **Niveles de adicción** — Rangos definidos por administración según líneas sincronizadas, líneas karaoke, minutos sincronizados, proyectos públicos, estrellas recibidas y palabras marcadas.
- **Rachas de actividad** — Seguimiento diario con aviso antes de que una racha se pierda. Las rachas se reinician en los límites de día **UTC**, algo que la interfaz indica explícitamente.
- **Mapa de calor de actividad** — Calendario de los días en que creaste o editaste un proyecto. Cuenta proyectos distintos por día, así que autoguardar un mismo proyecto todo el día cuenta una vez.
- **Clasificación** — Ranking global. Las líneas estampadas por IA se ponderan a 0.3× para que la sincronización manual valga más.

### Compartir

- **Compartir público/privado** — Genera una URL para cualquier proyecto y alterna su visibilidad.
- **Enlace profundo con marca de tiempo** — Incluye `?s=N` para iniciar la reproducción en un segundo concreto.
- **Atajo de posición actual** — Sincroniza con un clic la marca compartida con la posición de reproducción actual.
- **Visor de solo lectura** — Los enlaces compartidos abren una vista de solo lectura con el medio incrustado y la letra sincronizada.

### ⌨️ Atajos de Teclado

Todos los atajos son configurables en **Configuración → Atajos**, con detección de conflictos.

| Acción | Atajo por defecto |
|---|---|
| **Atajos del Editor** | |
| Estampar / Marcar | `Space` |
| Ajustar a la izquierda (restar tiempo) | `Alt+ArrowLeft` |
| Ajustar a la derecha (sumar tiempo) | `Alt+ArrowRight` |
| Añadir línea | `Ctrl+Enter` |
| Eliminar línea | `Delete` |
| Borrar marca de tiempo | `Backspace` |
| Cambiar modo (LRC/SRT) | `Ctrl+M` |
| Deseleccionar / cerrar | `Escape` |
| Mostrar ayuda de atajos | `?` |
| Seleccionar un rango | `Shift + Clic` |
| Elegir líneas individuales | `Ctrl + Clic` |
| **Atajos del Reproductor** | |
| Reproducir / pausar | `Enter` |
| Retroceder | `ArrowLeft` |
| Avanzar | `ArrowRight` |
| Silenciar / activar sonido | `m` |
| Aumentar velocidad | `+` |
| Reducir velocidad | `-` |
| **Atajos de la Vista Previa** | |
| Alternar traducciones | `t` |
| Añadir letra secundaria | `Shift+H` |
| Añadir traducciones | `Shift+T` |

### Interfaz y Temas

- **Temas** — Obsidian (oscuro), Pure (claro), Cobalt, Velvet, Sage y Sistema (sigue la preferencia del SO).
- **Estilos de resaltado de línea activa** — Brillo, Zoom, Color o Atenuado.
- **Disposición de traducción** — Apilada o en paralelo.
- **Modo enfoque** — Oculta el panel del editor para una vista previa sin obstrucciones.
- **Paneles redimensionables y reordenables** — Arrastra el divisor para redimensionar, o reordena los paneles de editor y vista previa.
- **Bloquear disposición** — Evita redimensionados accidentales.
- **Diseño móvil** — Navegación por pestañas entre sincronización, letra y vista previa.
- **Internacionalización** — Interfaz completa en **inglés** y **español** (se pueden añadir más en `src/locales/`).

### Paneles de Configuración

**Editor** — Modo por defecto, visibilidad de marcas por palabra, avance automático, modo de resaltado, bucle de selección, pausa al marcar, cantidades de desplazamiento y ajuste, velocidad de búsqueda de letras, conservar líneas vacías.

**Reproducción** — Incremento de búsqueda, velocidad por defecto, volumen y silencio persistentes.

**Interfaz** — Tema, idioma, resaltado de línea activa, comportamiento y alineación del desplazamiento, alineación de la vista previa, tipografía, disposición de traducción, objetivo y suavizado del relleno karaoke, formato de lectura, bloquear disposición.

**Exportación** — Formatos por defecto, precisión de marcas, patrón de nombre, fin de línea, omitir líneas vacías, normalizar marcas, etiquetas de metadatos.

**Estampado Automático** — Umbral de confianza, tolerancia difusa y modo de aplicación (solo vacías o todas).

**Atajos** — Todas las combinaciones y modificadores de ratón en los ámbitos de Editor, Reproductor y Vista Previa.

**Avanzado** — Activar autoguardado y su intervalo, zona horaria.

**Perfil y Cuenta** — Nombre visible, nombre de cuenta, correo, avatar, contraseña, llaves de acceso, sesiones activas y preferencias de privacidad.

### Autenticación

- **Correo / contraseña** — Registro e inicio de sesión estándar, con verificación de correo y restablecimiento de contraseña.
- **Llaves de acceso (WebAuthn)** — Regístrate e inicia sesión con una llave de acceso de plataforma; gestiónalas desde la configuración.
- **Google OAuth** — Inicio de sesión mediante ventana emergente.
- **Modo invitado** — Acceso completo al editor sin cuenta; tu borrador migra intacto al iniciar sesión.
- **Gestión de sesiones** — Consulta todas las sesiones activas y revócalas individualmente o todas a la vez.
- **Cuentas recordadas** — Cambio rápido de cuenta en la pantalla de inicio de sesión.

### Moderación y Administración

Solo para personal, con permisos granulares en lugar de un nombre de rol.

- **Gestión de usuarios** — Busca, inspecciona, banea/desbanea, aplica baneo en la sombra y resuelve apelaciones.
- **Bloqueo de red** — Bloquea IPs y huellas de dispositivo.
- **Insignias y niveles** — Crea y edita definiciones de insignias y rangos de nivel, otorga/revoca insignias, ejecuta análisis retroactivos.
- **Gestionar permisos** — Los superadministradores pueden ver todos los permisos, editar los conjuntos predefinidos de los roles `mod` y `admin`, y ajustar permisos individuales del personal.
- **Flujo de propuestas** — El personal sin un permiso concreto puede proponer una acción para que alguien con ese permiso la apruebe.
- **Registro de auditoría** — Toda acción privilegiada queda registrada.

## Pila Tecnológica

| Capa | Tecnología |
|---|---|
| Framework | [React 19](https://react.dev/) |
| Herramienta de compilación | [Vite 8](https://vitejs.dev/) |
| Lenguaje | [TypeScript](https://www.typescriptlang.org/) |
| Estilos | [Tailwind CSS v4](https://tailwindcss.com/) |
| Animaciones | [Framer Motion](https://www.framer.com/motion/) |
| Forma de onda | [WaveSurfer.js](https://wavesurfer-js.org/) |
| Primitivas de UI | [Radix UI](https://www.radix-ui.com/) |
| Internacionalización | [i18next](https://www.i18next.com/) |
| Enrutado | [React Router v7](https://reactrouter.com/) |
| Virtualización | [TanStack Virtual](https://tanstack.com/virtual) |
| Tiempo real | [Socket.IO](https://socket.io/) |
| Pruebas | [Vitest](https://vitest.dev/) + [Testing Library](https://testing-library.com/) |

El estado se mantiene deliberadamente sin un almacén global — sin Redux ni Zustand. Vive en React Context, el hook raíz `useAppState`, una pila de deshacer/rehacer y `localStorage`.

## Empezando

### Con Docker (recomendado para empezar rápido)

> [!IMPORTANT]
> **Asegúrate de que Docker Desktop esté en ejecución** antes de estos comandos. En Windows, comprueba que el motor de Docker se haya inicializado por completo.

Desde la raíz del repositorio:

```bash
docker-compose up -d --build
```

Esto compila el cliente (Nginx + archivos estáticos) y el servidor (Node.js), inicia MongoDB y los conecta. La aplicación estará disponible en [http://localhost](http://localhost).

### Instalación Manual

#### Prerrequisitos

- **Node.js ≥ 20.3.0** (requerido por el servidor)
- **pnpm** — ambos paquetes usan `pnpm-lock.yaml`
- Una instancia de MongoDB (local o Atlas)

#### Instalación

1. Clona el repositorio:

   ```bash
   git clone https://github.com/crimsonCarnival/lrc-studio.git
   cd lrc-studio
   ```

2. Instala las dependencias de ambos paquetes:

   ```bash
   cd client && pnpm install
   cd ../server && pnpm install
   ```

3. Configura el entorno:

   **Cliente (`client/.env`):**

   ```bash
   cp .env.example .env
   # VITE_SERVER_ORIGIN debe apuntar a http://localhost:3000 en desarrollo local
   ```

   **Servidor (`server/.env`):**

   ```bash
   cp .env.example .env
   # Define al menos MONGODB_URI, JWT_SECRET y COOKIE_SECRET
   ```

4. Arranca ambos servidores de desarrollo, en terminales separadas:

   ```bash
   cd server && pnpm dev    # http://localhost:3000
   cd client && pnpm dev    # http://127.0.0.1:5173
   ```

5. Abre [http://127.0.0.1:5173](http://127.0.0.1:5173).

Consulta el [README del servidor](../../../server/README.md) para la referencia completa de variables de entorno y la arquitectura del backend.

### Scripts Disponibles

| Comando | Descripción |
|---|---|
| `pnpm dev` | Inicia el servidor de desarrollo de Vite |
| `pnpm build` | Compila el paquete de producción |
| `pnpm preview` | Previsualiza la compilación de producción |
| `pnpm lint` | Ejecuta ESLint |
| `pnpm type-check` | Ejecuta el compilador de TypeScript |
| `pnpm test` | Ejecuta Vitest |

## Referencia de la API

Todos los endpoints que consume este cliente, con su guarda y la estructura de petición/respuesta. El backend es la fuente autoritativa — consulta el [README del servidor](../../../server/README.md) para los detalles de implementación.

**Convenciones.** JSON salvo indicación contraria. Toda petición lleva `X-Device-Id`; las rutas de `/auth` lo **exigen**. La autenticación viaja en cookies `httpOnly` (`credentials: 'include'`), nunca en el cuerpo. `lines[]` es el array compartido de líneas de letra (`text`, `timestamp`, `endTime`, `secondary`, `translations[]`, `words[]`, `type`, `label`, `singers[]`). Los errores son `{ error: string }` con un código estable, más `{ retryAfter }` en un 429. REST pasa por `app/api.client.ts`; GraphQL por `gqlRequest` en `app/graphql.client.ts`.

**Guardas:**

| Guarda | Significado |
|---|---|
| — | Pública |
| `optionalAuth` | Define `userId` si hay un token válido; nunca rechaza |
| `requireAuth` | 401 sin token válido; 403 si está baneado |
| `requireActiveUser` | `requireAuth` + comprobación de baneo de dispositivo/IP |
| `requireAuthForAppeal` | `requireAuth` sin la comprobación de baneo |
| `requireStaff` | Debe tener al menos un permiso |
| `perm(x)` | Debe tener el permiso `x` |
| `sudo` | Cookie `adminSudo` válida (TTL de 5 minutos) |
| `requireSuperadmin` | Literalmente `role === 'superadmin'` |

### `/health`

| Método | Ruta | Guarda | Petición | Respuesta |
|---|---|---|---|---|
| GET | `/health/live` | — | — | `{ status: 'ok' }` |
| GET | `/health/ready` | — | — | `{ status, checks: { database } }` — 503 si la BD falla |
| GET | `/health` | — | — | Informe de estado completo — 503 si hay error |

### `/auth`

Los límites de tasa se basan **solo en la IP**, nunca en la cabecera de dispositivo que envía el cliente.

| Método | Ruta | Guarda | Límite | Petición | Respuesta |
|---|---|---|---|---|---|
| POST | `/register` | — | 3/h | `{ accountName?, email?, password, recaptchaToken? }` (se exige accountName o email; contraseña ≥8) | Define cookies → `{ user }` |
| POST | `/login` | — | 10/min | `{ identifier, password, recaptchaToken? }` | Define cookies → `{ user }` |
| POST | `/check-identifier` | — | 10/min | `{ identifier }` | `{ exists, methods }` |
| POST | `/refresh` | — | — | Cuerpo ignorado; lee la **cookie** `refreshToken` | Rota ambas cookies → `{ user }` |
| POST | `/logout` | `optionalAuth` | — | — | Borra las cookies |
| GET | `/me` | `requireAuth` | — | — | `{ user }` |
| PATCH | `/profile` | `requireAuth` | — | `{ avatarUrl?, avatarPublicId?, accountName?, email?, bio? }` (bio ≤160) | `{ user }` |
| POST | `/appeal` | `requireAuthForAppeal` | — | `{ message }` | `{ ok }` |
| POST | `/forgot-password` | — | 10/min | `{ email }` | `{ ok }` (nunca revela si existe) |
| GET | `/reset-password/validate` | — | 10/min | `?token` | `{ valid }` |
| POST | `/reset-password` | — | 10/min | `{ token, password }` | `{ ok }` |
| POST | `/change-password` | `requireAuth` | — | `{ currentPassword, newPassword }` | `{ ok }` |
| POST | `/set-password` | `requireAuth` | — | `{ password }` — para cuentas solo OAuth | `{ ok }` |
| POST | `/verify-email` | — | 10/min | `{ token }` | `{ ok }` |
| GET | `/sessions` | `requireAuth` | — | — | `[{ id, deviceId, ip, userAgent, createdAt, expiresAt, current }]` |
| DELETE | `/sessions/:id` | `requireAuth` | — | — | `{ ok }` |
| POST | `/logout-all` | `requireAuth` | — | — | Revoca todas las sesiones |
| GET | `/passkey/register/options` | `requireAuth` | — | — | `PublicKeyCredentialCreationOptions` de WebAuthn |
| POST | `/passkey/register/verify` | `requireAuth` | — | Respuesta de atestación WebAuthn | `{ verified }` |
| POST | `/passkey/login/options` | — | 10/min | `{ identifier? }` | `PublicKeyCredentialRequestOptions` de WebAuthn |
| POST | `/passkey/login/verify` | — | 10/min | Respuesta de aserción WebAuthn | Define cookies → `{ user }` |
| GET | `/passkeys` | `requireAuth` | — | — | `[{ id, name, createdAt, transports }]` |
| DELETE | `/passkeys/:id` | `requireAuth` | — | — | `{ ok }` |
| POST | `/deactivate` | `requireAuth` | — | — | Borrado lógico de la cuenta |
| POST | `/exchange-ott` | — | 20/min | `{ ott }` — el token de un solo uso de Google | Define cookies → `{ user }` |

> Cada una de estas rutas que establece una sesión debe además disparar la migración del proyecto de invitado desde `localStorage`.

### `/projects`

| Método | Ruta | Guarda | Petición | Respuesta |
|---|---|---|---|---|
| POST | `/projects` | `requireActiveUser` | `{ title?, uploadId?, lyrics?, state?, metadata?, readOnly?, public?, ytUrl?, uploadUrl?, uploadPublicId?, fileName?, duration?, recaptchaToken? }` | `{ project }` con un `publicId` nanoid(10) |
| GET | `/projects` | `requireActiveUser` | — | `{ projects }` |
| GET | `/projects/:id` | `optionalAuth` | `:id` = `publicId` | `{ project, lyrics, upload }` |
| PUT | `/projects/:id` | `requireActiveUser` | Cuerpo completo (como POST) | `{ project }` |
| PATCH | `/projects/:id` | `requireActiveUser` | Cualquier subconjunto, más `version` y `saveKind: 'manual'\|'auto'` | `{ project, version }`; emite `project:updated` + `autosave:ack` |
| DELETE | `/projects/:id` | `requireActiveUser` | — | `{ ok }` |
| GET | `/projects/share/:id` | — | — | Proyecto de solo lectura para enlaces compartidos |

`lyrics` en un PATCH es un reemplazo completo o un parche posicional quirúrgico — lo decide `buildProjectPatch`:

```jsonc
// reemplazo completo
{ "lyrics": { "editorMode": "lrc", "language": "en", "sections": [ { "label": "Verse", "singers": [], "lines": [] } ] } }

// una línea    → sections.<sectionIdx>.lines.<lineIdx>
{ "lyrics": { "sectionIdx": 0, "lineIdx": 4, "line": { "text": "…", "timestamp": 63.42 } } }

// una palabra  → …lines.<lineIdx>.words.<wordIndex>
{ "lyrics": { "sectionIdx": 0, "lineIdx": 4, "wordIndex": 2, "word": { "word": "close", "time": 11.4 } } }
```

Límites: `sectionIdx ≤ 2000`, `lineIdx ≤ 10000`, `wordIndex ≤ 2000`. Envía siempre `sections` anidadas, nunca el array plano `lines` del cliente — conviértelo con `flatToSections`.

### `/lyrics` y `/editor` — análisis y operaciones del editor

El mismo router está montado bajo **ambos** prefijos, así que cada ruta responde en `/lyrics/…` *y* en `/editor/…`. Todas públicas y sin estado: transforman `lines[]` y lo devuelven.

| Método | Ruta | Petición | Respuesta |
|---|---|---|---|
| POST | `/parse` | `{ content, filename? }` (≤5 MB; la extensión elige LRC/SRT/TXT) | `{ lines }` |
| POST | `/compile/lrc` | `{ lines, includeTranslations?, includeSecondary?, precision?: 'hundredths'\|'thousandths', wordPrecision?, metadata?, lineEndings?: 'lf'\|'crlf', exportTranslationIndex? }` | `{ content }` |
| POST | `/compile/srt` | `{ lines, duration?, includeTranslations?, includeSecondary?, lineEndings?, srtConfig? }` | `{ content }` |
| POST | `/infer-end-times` | `{ lines, duration?, srtConfig? }` | `{ lines }` |
| POST | `/mark` | `{ lines, activeLineIndex, time, editorMode, settings, activeWordIndex?, stampTarget?: 'main'\|'secondary', awaitingEndMark?, lastAction? }` | `{ lines, activeLineIndex, awaitingEndMark }` |
| POST | `/bulk-shift` | `{ lines, selectedIndices, delta }` | `{ lines }` |
| POST | `/global-offset` | `{ lines, delta }` | `{ lines }` |
| POST | `/clear-all` | `{ lines, isSrt?, isWords? }` | `{ lines }` |
| POST | `/clear-line` | `{ lines, index, isSrt?, isWords? }` | `{ lines }` |
| POST | `/detect-duplicates` | `{ lines, threshold? }` | `{ duplicates }` |

### `/lyrics` — búsqueda e importación

`optionalAuth`, 20 peticiones/minuto. Respaldado por la cadena LRCLIB → LyricFind → lyrics.ovh.

| Método | Ruta | Petición | Respuesta |
|---|---|---|---|
| GET | `/lyrics/search` | `?q` (obligatorio) | `{ results: [{ id, title, artist, album?, duration?, synced?, thumbnail, url, provider }] }` — `id` va con espacio de nombres (`lrclib:123`) cuando es resoluble |
| GET | `/lyrics/extract` | `?track` (obligatorio), `?artist`, `?album`, `?duration`, `?id` | `{ lyrics, synced, provider }` · `422 lyrics_unavailable` si ningún proveedor la tiene |

Envía `duration` e `id` siempre que los tengas: permiten al servidor resolver la grabación exacta en lugar de repetir un emparejamiento difuso.

### `/asr` — Estampado Automático

Todas las rutas con `requireAuth`, 10 peticiones/hora. El progreso también llega por Socket.IO como `asr:progress`, que es lo que escucha `useAutoStamp`.

| Método | Ruta | Petición | Respuesta |
|---|---|---|---|
| POST | `/asr/stamp` | `{ lines: [{ index, text, wordTokens? }], fuzzyTolerance?: 0.5–1 }` más **exactamente uno** de `uploadId` o `youtubeUrl` (ambos o ninguno → 400) | `{ jobId }` |
| POST | `/asr/stamp/upload` | `multipart/form-data`: el campo `payload` (`{ lines, fuzzyTolerance? }` como JSON) **debe ir antes** de la parte `file`; ≤50 MB, 1 archivo | `{ jobId }` |
| GET | `/asr/jobs/:id` | — | `{ jobId, phase, result?, errorCode? }` · **404** si no es tuyo |
| GET | `/asr/jobs/:id/audio` | — | Bytes del audio extraído (para la forma de onda) · 404 si no es tuyo |
| POST | `/asr/jobs/:id/cancel` | — | `{ cancelled }` |

`phase` ∈ `starting, fetching_audio, extracting_audio, transcribing, aligning, applying, completed, failed, cancelled`. Cada entrada de `result[]` es `{ index, timestamp, endTime, confidence, status, words }` con `status` ∈ `matched, partial, low, none`.

Códigos de error: `asr_invalid_key`, `asr_no_audio`, `asr_unsupported_audio`, `asr_empty_transcript`, `asr_rate_limited`, `asr_timeout`, `asr_network`, `asr_cancelled`, `asr_malformed_response`, `asr_youtube_blocked`, `asr_youtube_unavailable`, `asr_ytdlp_not_configured`, `asr_job_not_found`.

### `/uploads`

| Método | Ruta | Guarda | Límite | Petición | Respuesta |
|---|---|---|---|---|---|
| POST | `/signature` | `optionalAuth` | — | `{ fileName, fileSize }` (≤50 MB), `recaptchaToken?` | `{ signature, timestamp, apiKey, cloudName, folder }` |
| POST | `/avatar-signature` | `requireAuth` | 5/h | — | Parámetros firmados de Cloudinary |
| POST | `/cover-signature` | `requireAuth` | 20/h | — | Parámetros firmados de Cloudinary |
| GET | `/media` | `requireActiveUser` | — | `?limit` (≤100, por defecto 50), `?offset` | `{ uploads }` |
| GET | `/media/:id` | `requireActiveUser` | — | — | `{ upload }` |
| POST | `/media` | `requireActiveUser` | — | `{ source: 'cloudinary'\|'youtube', uploadUrl?, publicId?, fileName?, title?, duration? }` | `{ upload }` |
| PATCH | `/media/:id` | `requireActiveUser` | — | `{ title?, fileName?, duration? }` | `{ upload }` |
| DELETE | `/media/:id` | `requireActiveUser` | — | — | `{ ok }` |

El binario va directo del navegador a Cloudinary usando la firma — nunca pasa por la API. Regístralo después con `POST /media`.

### `/settings`

Todas con `requireAuth`. Los cuerpos se validan contra el árbol completo de ajustes (`playback`, `editor`, `export`, `interface`, `shortcuts`, `import`, `advanced`, `autoStamp`).

| Método | Ruta | Petición | Respuesta |
|---|---|---|---|
| GET | `/settings` | — | `{ settings }` |
| PUT | `/settings` | Objeto de ajustes completo | `{ settings }` |
| PATCH | `/settings` | Ajustes parciales (fusión profunda) — lo que envía la sincronización diferencial por ruta | `{ settings }` |
| DELETE | `/settings` | — | Restablece los valores por defecto |

### `/notifications`

Todas con `requireAuth`. También se entregan en vivo por Socket.IO.

| Método | Ruta | Petición | Respuesta |
|---|---|---|---|
| GET | `/notifications` | — | `{ notifications, unreadCount }` |
| POST | `/notifications/read` | `{ ids }` | `{ ok }` |
| POST | `/notifications/read-all` | — | `{ ok }` |
| DELETE | `/notifications/:id` | — | `{ ok }` |

### `/song-metadata`, `/youtube`, `/google`, `/og`

| Método | Ruta | Guarda | Límite | Petición | Respuesta |
|---|---|---|---|---|---|
| GET | `/song-metadata/lookup` | — | 20/min | `?songName` (obligatorio), `?artistName` | Metadatos de la pista (título, artista, álbum, año, portada…) |
| GET | `/youtube/search` | `optionalAuth` | 30/min | `?q` | Resultados de búsqueda |
| GET | `/youtube/availability` | `optionalAuth` | 30/min | `?videoId` (11 caracteres) | Disponibilidad más un motivo de fallo concreto |
| GET | `/youtube/check-embed` | `optionalAuth` | 30/min | `?videoId` | Alias **obsoleto** que devuelve la forma antigua `{ embeddable }` |
| GET | `/google/auth/url` | `requireAuth` | — | — | `{ url }` — para vincular Google a una cuenta existente |
| GET | `/google/login/url` | — | — | — | `{ url }` — para iniciar sesión |
| GET | `/google/auth/callback` | — | — | `?code&state` | HTML que envía por `postMessage` un token de un solo uso a la ventana que lo abrió, que luego intercambias con `POST /auth/exchange-ott` |
| POST | `/google/disconnect` | `requireAuth` | — | — | `{ disconnected }` · 409 `last_auth_method` si es el único método de acceso |
| GET | `/og/project/:publicId` | — | — | — | **HTML** (no JSON) con etiquetas Open Graph/Twitter y redirección, bajo un nonce CSP por respuesta · 404 si es privado o no existe |

### `/admin`

Un hook `onRequest` aplica `requireStaff` a **todas** las rutas siguientes. Las acciones destructivas necesitan además un permiso *y* una concesión `sudo` reciente. El personal solo puede actuar sobre rangos estrictamente inferiores. Las comprobaciones de permisos del cliente solo sirven para mostrar u ocultar interfaz — el servidor lo vuelve a comprobar todo.

| Método | Ruta | Guarda | Petición | Respuesta |
|---|---|---|---|---|
| GET | `/sudo/factors` | personal | — | `{ factors }` — métodos de reautenticación disponibles |
| POST | `/sudo` | personal | `{ password? }` | Define la cookie `adminSudo` (5 min) |
| POST | `/sudo/passkey/options` | personal | — | Opciones de solicitud WebAuthn |
| POST | `/sudo/passkey/verify` | personal | Aserción WebAuthn | Define la cookie `adminSudo` |
| GET | `/users` | `perm('users.view')` | `?cursor`, `?limit` (≤100), `?search`, `?role`, `?status` ∈ `all\|active\|banned\|pending\|deleted\|verified\|premium` | `{ users, nextCursor }` |
| GET | `/stats` | `perm('stats.view')` | — | Agregados del panel |
| GET | `/audit-logs` | `perm('audit.view')` | `?page`, `?limit` (≤100) | `{ logs, total }` |
| GET | `/banned-ips` | `perm('network.block')` | — | `{ ips }` |
| GET | `/banned-devices` | `perm('network.block')` | — | `{ devices }` |
| POST | `/users/:id/ban` | `perm('users.ban')` + sudo | `{ reason?, bannedUntil?, banIp?, banDevice? }` | `{ user }` |
| POST | `/users/:id/unban` | `perm('users.ban')` + sudo | — | `{ user }` |
| POST | `/users/:id/reject-appeal` | `perm('users.ban')` + sudo | — | `{ user }` |
| POST | `/users/:id/shadowban` | `perm('users.shadowban')` + sudo | `{ feed, search, reason? }` | `{ user }` |
| POST | `/users/:id/unshadowban` | `perm('users.shadowban')` + sudo | — | `{ user }` |
| POST | `/users/:id/role` | `perm('users.role')` + sudo | `{ role: 'user'\|'mod'\|'admin'\|'superadmin' }` | `{ user }` |
| DELETE | `/users/:id` | `perm('users.delete')` + sudo | — | `{ ok }` |
| POST | `/users/:id/reactivate` | `perm('users.delete')` + sudo | — | `{ user }` |
| POST | `/banned-ips` | `perm('network.block')` + sudo | `{ ip, reason? }` | `{ entry }` |
| DELETE | `/banned-ips/:id` | `perm('network.block')` + sudo | — | `{ ok }` |
| POST | `/banned-devices` | `perm('network.block')` + sudo | `{ deviceId, reason? }` | `{ entry }` |
| DELETE | `/banned-devices/:id` | `perm('network.block')` + sudo | — | `{ ok }` |
| POST | `/xp` | `perm('xp.adjust')` + sudo | `{ userId, delta, reason? }` | `{ user }` |
| GET | `/permissions` | `requireSuperadmin` | — | `{ permissions, rolePresets, editableRoles }` |
| PUT | `/permissions/roles/:role` | `requireSuperadmin` + sudo | `:role` ∈ solo `mod\|admin`; `{ permissions: [] }` | `{ rolePresets }` |
| PUT | `/permissions/users/:id` | `requireSuperadmin` + sudo | `{ permissions: [] }` | `{ user }` |

### GraphQL — `POST /graphql`

Límite de profundidad 12; introspección desactivada en producción. `gqlRequest` devuelve `json.data` directamente y lanza `ApiError` ante errores HTTP o de GraphQL; un 401 emite `authEvents('token:expired')` para disparar un refresco. **No hay caché de GraphQL en el cliente**, así que cada consulta vuelve a pedir los datos.

**Consultas**

| Consulta | Argumentos | Devuelve |
|---|---|---|
| `health` | — | `HealthStatus!` |
| `me` | — | `User` |
| `project` | `id: ID!` | `Project` |
| `projects` | `limit, offset` | `[Project!]!` |
| `publicProject` | `publicId: String!` | `Project` |
| `getShare` | `id: ID!` | `Project` |
| `upload` / `uploads` | `id: ID!` / `limit, offset` | `Upload` / `[Upload!]!` |
| `settings` | — | `Settings` |
| `publicProfile` | `accountName: String!, asVisitor: Boolean` | `PublicUser` |
| `followList` | `accountName: String!, type: FollowListType!, offset` | `FollowListResult!` |
| `blockedUsers` | — | `[BlockedUser!]!` |
| `playlist` / `playlists` | `id: ID!` / `accountName: String!` | `Playlist` / `[Playlist!]!` |
| `savedPlaylists` | — | `[Playlist!]!` |
| `feed` | `offset, limit` | `FeedResult!` |
| `userActivity` | `offset, limit` | `FeedResult!` |
| `userActivityHeatmap` | — | `[ActivityHeatmapDay!]!` |
| `searchProjects` | `query: String!, sortBy: SearchSort, offset, limit` | `SearchResult!` |
| `searchUsers` | `query: String!, limit` | `[FollowUser!]!` |
| `trendingProjects` | `offset, limit` | `ProjectPage!` |
| `popularPlaylists` | `offset, limit` | `PlaylistPage!` |
| `suggestedUsers` | `limit` | `[FollowUser!]!` |
| `exploreStats` | — | `ExploreStats!` |
| `projectReactions` | `publicId: String!` | `ProjectReactions!` |
| `leaderboard` | `limit, offset` | `LeaderboardResult!` |
| `badgeDefinitions` | — | `[BadgeDef!]!` |
| `publicBadgeDefinitions` | — | `[PublicBadgeDef!]!` |
| `userShowcase` | `accountName: String!` | `[ShowcasedBadge!]!` |
| `myMusicLibrary` | — | `[MusicLibraryEntry!]!` |
| `userContentStats` | — | `ContentStats!` |
| `adminAddictionLevels` | — | `[AddictionLevel!]!` |
| `myPreferences` | — | `UserPreferences!` |
| `myRequests` / `pendingRequests` / `reviewedRequests` | — | `[StaffRequest!]!` |
| `requestCapabilities` / `requestCounts` | — | `RequestCapabilities!` / `RequestCounts!` |

**Mutaciones**

| Mutación | Argumentos | Devuelve |
|---|---|---|
| `createProject` | `input: CreateProjectInput!` | `Project!` |
| `updateProject` | `id: ID!, input: UpdateProjectInput!` | `Project!` |
| `deleteProject` | `id: ID!` | `Boolean!` |
| `updateLyrics` | `publicId: String!, input: UpdateLyricsInput!` | `Lyrics!` |
| `cloneProject` | `id: ID!` | `Project!` — bifurcación |
| `starProject` / `unstarProject` | `id: ID!` | `Project!` |
| `boostProject` | `publicId: ID!` | `Boolean!` |
| `setForksEnabled` | `publicId: ID!, enabled: Boolean!` | `Project!` |
| `reactToProject` | `publicId: String!, emoji: String!` | `ProjectReactions!` |
| `incrementProjectView` / `incrementProjectShare` | `id: ID!` | `Boolean!` |
| `incrementPlaylistView` / `incrementPlaylistShare` | `id: ID!` | `Boolean!` |
| `updateProfile` | `input: UpdateProfileInput!` (`accountName`, `displayName`, `email`, `bio`, `avatarUrl`) | `User!` |
| `updateSettings` / `resetSettings` | `input: UpdateSettingsInput!` / — | `Settings!` / `Boolean!` |
| `updatePreferences` | `input: UpdatePreferencesInput!` (visibilidad, notificaciones, `showActivityHeatmap`, insignias del mini-perfil) | `UserPreferences!` |
| `saveMedia` / `deleteMedia` | `input: SaveMediaInput!` / `id: ID!` | `Upload!` / `Boolean!` |
| `sendVerificationEmail` | — | `Boolean!` |
| `follow` / `unfollow` | `accountName: String!` | `Boolean!` |
| `blockUser` / `unblockUser` | `accountName: String!` | `Boolean!` |
| `createPlaylist` | `input: CreatePlaylistInput!` | `Playlist!` |
| `updatePlaylist` | `id: ID!, input: UpdatePlaylistInput!` | `Playlist!` |
| `deletePlaylist` | `id: ID!` | `Boolean!` |
| `addProjectToPlaylist` / `removeProjectFromPlaylist` | `playlistId: ID!, publicId: ID!` | `Playlist!` |
| `reorderPlaylist` | `playlistId: ID!, publicIds: [ID!]!` | `Playlist!` |
| `savePlaylist` / `unsavePlaylist` | `playlistId: ID!` | `Boolean!` |
| `updateShowcase` | `badgeIds: [String!]!, showcasePublic: Boolean` | `UpdateShowcaseResult!` |
| `adminGrantBadge` | `userIdentifier: String!, badgeId: String!` | `Boolean!` |
| `adminRevokeBadge` | `userId: ID!, badgeId: String!` | `Boolean!` |
| `adminCreateBadge` / `adminUpdateBadge` | `input: BadgeDefInput!` / `id: String!, input` | `BadgeDef!` |
| `adminDeleteBadge` | `id: String!` | `Boolean!` |
| `adminRetroactiveScan` | `badgeId: String!` | `RetroactiveResult!` |
| `adminCreateAddictionLevel` / `adminUpdateAddictionLevel` | `input` / `id: String!, input` | `AddictionLevel!` |
| `adminDeleteAddictionLevel` | `id: String!` | `Boolean!` |
| `adminShadowBan` | `userId: ID!, feed: Boolean!, search: Boolean!, reason: String` | `Boolean!` |
| `adminUnshadowBan` | `userId: ID!` | `Boolean!` |
| `submitRequest` | `type: String!, payload: String!` (cadena JSON, en lista blanca en el servidor) | `StaffRequest!` |
| `reviewRequest` | `id: ID!, decision: String!, note: String` | `StaffRequest!` — reclamación atómica; se rechaza la autorrevisión |

### Socket.IO

`socket.client.ts` conecta de forma idempotente y reconecta al cambiar la visibilidad o la red. Los clientes se unen a las salas `user:{userId}` y `project:{publicId}`.

| Evento | Dirección | Carga |
|---|---|---|
| `project:updated` | → cliente | Difundido a la sala del proyecto tras un parche correcto (otra pestaña guardó) |
| `autosave:ack` | → cliente | Solo al socket que originó la petición |
| `asr:progress` | → cliente | `{ jobId, phase, result?, errorCode? }` |
| `notification` | → cliente | Nueva notificación |
| `session:invalidated` | → cliente | Fuerza el cierre de sesión en el cliente |

## Consideraciones de Despliegue con Docker

### Con Docker Compose (valores por defecto)

Ejecutar `docker-compose up` sin variables personalizadas te da una aplicación funcional de inmediato.

✅ **Funciona con los valores por defecto:**

- Autenticación de usuarios (registro, inicio y cierre de sesión, llaves de acceso)
- Gestión de perfil y proyectos, CRUD completo
- Edición de letras en los tres modos, todos los atajos, ajustes y temas
- Subida de audio desde archivos locales
- **Búsqueda e importación de letras** — no necesita ninguna clave de API y sigue devolviendo letras ya sincronizadas mediante LRCLIB

⚠️ **Limitado con los valores por defecto (claves ficticias):**

- **Correos de restablecimiento y verificación** — el flujo funciona, pero no se envía nada (credenciales SMTP ficticias)
- **Subidas a Cloudinary** — cuenta de demostración con límites de almacenamiento y ancho de banda
- **Metadatos de YouTube** — no obtendrá títulos con una clave ficticia
- **Estampado Automático con IA** — necesita una clave real de Groq; las fuentes de YouTube requieren además `yt-dlp` y, en producción, un proveedor de PO-token
- **Resultados de Genius** — recurre a LRCLIB, que funciona pero sin portadas
- **reCAPTCHA** — usa la clave pública de prueba de Google (siempre válida)

### Habilitar todas las funciones

1. Crea un `.env.local` basado en `.env.docker`:

   ```bash
   cp .env.docker .env.local
   ```

2. Añade credenciales reales:

   ```bash
   # Correo (verificación + restablecimiento de contraseña)
   EMAIL_SMTP_HOST=smtp.gmail.com
   EMAIL_SMTP_USER=tu-correo@gmail.com
   EMAIL_SMTP_PASS=tu-contraseña-de-aplicación

   # Cloudinary (subida de archivos)
   CLOUDINARY_CLOUD_NAME=tu-cloud-name
   CLOUDINARY_API_KEY=tu-api-key
   CLOUDINARY_API_SECRET=tu-api-secret

   # YouTube (metadatos de vídeo)
   YOUTUBE_API_KEY=tu-clave-de-youtube

   # Groq (transcripción para Estampado Automático)
   GROQ_API_KEY=tu-clave-de-groq

   # Opcional: resultados de búsqueda más ricos
   GENIUS_CLIENT_ACCESS_TOKEN=tu-token-de-genius

   # Arranque de superadministrador (lista separada por comas)
   SUPERADMIN_EMAIL=tu@ejemplo.com

   # reCAPTCHA (protección antibots)
   RECAPTCHA_SECRET_KEY=tu-clave-secreta
   VITE_RECAPTCHA_KEY=tu-clave-pública
   ```

3. Ejecuta con tu configuración:

   ```bash
   docker-compose --env-file .env.local up -d --build
   ```

## Referencia del Formato LRC

### LRC estándar

```lrc
[ti:Título de la canción]
[ar:Nombre del artista]
[al:Nombre del álbum]
[00:10.50]Primera línea de la letra
[00:15.20]Segunda línea de la letra
```

### LRC mejorado (por palabra)

```lrc
[00:10.50]<00:10.50>Hold <00:11.00>me <00:11.40>close
[00:15.20]<00:15.20>Don't <00:15.80>let <00:16.10>go
```

### Con secundaria / furigana

Varias líneas que comparten una marca de tiempo se apilan verticalmente en reproductores compatibles:

```lrc
[00:10.50]持ち上げて
[00:10.50]mochiagete
[00:10.50]Lift me up
```

## Licencia

Este proyecto es de código abierto y está disponible bajo la Licencia MIT.

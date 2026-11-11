export default {
  title: "Guía de uso",
  subtitle: "Todo lo necesario para sincronizar, publicar y compartir letras en LRC Studio.",
  backToEditor: "Volver al editor",
  replayTour: "Repetir el recorrido del editor",
  groups: {
    basics: {
      title: "Lo básico",
      hint: "Léelo en orden: te lleva de un proyecto vacío a uno compartido.",
    },
    features: {
      title: "Funciones",
      hint: "Referencia del resto del editor. Salta a lo que necesites.",
    },
  },
  demo: {
    play: "Reproducir",
    pause: "Pausar",
    reset: "Reiniciar",
    mark: "Marcar",
  },
  sample: {
    lines: {
      1: "Las estrellas se alinean sobre las luces de la ciudad",
      2: "Ecos de medianoche cruzan los pasillos vacíos",
      3: "Ella cantó una melodía que rompió la noche",
      4: "Y cada ventana respondió con un resplandor",
      5: "Perseguimos el sonido hasta que llegó la mañana",
      6: "Ahora el eco tararea un adiós tranquilo",
    },
  },
  nav: {
    start: "Primeros pasos",
    sync: "Sincronización",
    player: "Reproductor y tiempos",
    saveUndo: "Guardar y deshacer",
    preview: "Vista previa y exportar",
    words: "Modo palabras",
    counterparts: "Contrapartes",
    srt: "Tiempos de subtítulos",
    sections: "Secciones y cantantes",
    furigana: "Furigana y traducciones",
    autoStamp: "Auto Stamp",
    lyricsSearch: "Búsqueda de letras",
    subtitles: "Proyectos de subtítulos",
    sessions: "Sesiones",
    share: "Compartir y social",
    look: "Temas y visualizadores",
  },
  sections: {
    start: {
      title: "Empieza un proyecto",
      body1: "Elige tu audio (un archivo local o un enlace de YouTube) y añade la letra: pega texto sin formato, búscala por título y artista, o suelta un archivo .lrc, .srt o .txt existente. Las marcas de tiempo y etiquetas de sección que ya tenga el archivo se conservan.",
    },
    sync: {
      title: "Sincroniza tu letra",
      body1: "Pega o importa tu letra, carga el audio y presiona \"Empezar a sincronizar\". Cada línea se activa por turnos — reproduce el audio y presiona Enter (o tu tecla de marca configurada) para marcar el tiempo actual en ella.",
      body2: "Tras cada marca, la siguiente línea se selecciona automáticamente para seguir sincronizando sin tocar el ratón (desactiva el avance automático en Ajustes para quedarte en la misma línea).",
    },
    player: {
      title: "Reproductor y herramientas de tiempo",
      body1: "Reproduce, pausa, avanza y ajusta la velocidad desde la barra de transporte. Los botones de ajuste fino (±0,1 s y ±5 s por defecto) te permiten afinar la posición sin salir del teclado.",
      body2: "El icono de repetir activa un bucle A-B sobre la línea activa — de su marca de inicio a su tiempo final (o al inicio de la siguiente línea), para repetir una frase difícil mientras afinas el tiempo. Haz clic de nuevo para quitar el bucle, o arrastra sus dos tiradores en la barra de búsqueda para ajustar la región.",
    },
    saveUndo: {
      title: "Guardar, deshacer y rehacer",
      body1: "Tu trabajo se guarda automáticamente cada cierto tiempo mientras sincronizas. Presiona Ctrl+S (o el icono de guardar junto a Deshacer/Rehacer) para guardar al instante.",
      body2: "¿Una marca equivocada? Deshacer (Ctrl+Z) y Rehacer (Ctrl+Y) recorren tus cambios recientes — ambos están junto a Guardar en la barra del editor.",
    },
    preview: {
      title: "Vista previa, exportar y publicar",
      body1: "El panel de vista previa reproduce tu letra sincronizada estilo karaoke en tiempo real mientras suena el audio — una forma rápida de revisar los tiempos sin exportar nada.",
      body2: "Desde el encabezado de la vista previa puedes mostrar traducciones, ajustar la alineación del texto y — para letras en japonés — mostrar u ocultar las lecturas furigana sobre los kanji. Usa Exportar para descargar tu trabajo como archivo .lrc, .srt o .txt estándar.",
    },
    words: {
      title: "Modo palabras",
      body1: "El modo palabras es una segunda pasada: sincroniza primero tus líneas y luego afínalas palabra por palabra para un tiempo estilo karaoke.",
    },
    counterparts: {
      title: "Contrapartes",
      body1: "Una contraparte es una voz de fondo que canta sobre una línea ya sincronizada. Necesita una línea sincronizada y tiempos por palabra para que LRC Studio sepa cuánto dura.",
    },
    srt: {
      title: "Tiempos de subtítulos",
      body1: "En modo SRT, una segunda marca en la misma línea fija su tiempo final, así cada línea se convierte en un bloque de subtítulo con inicio y fin.",
    },
    sections: {
      title: "Secciones y cantantes",
      body1: "Selecciona una o más líneas y usa la barra de etiquetas que aparece para marcarlas como sección — Estrofa, Coro, Puente, etc. Las secciones se tratan de forma distinta en las exportaciones y en la vista previa en vivo.",
      body2: "Para dúos, asigna un cantante a una línea o a palabras individuales para colorear las partes. Los atajos 1–4 asignan la línea activa al cantante 1–4; 0 lo quita.",
    },
    furigana: {
      title: "Furigana, texto secundario y traducciones",
      body1: "Pega o escribe letras en japonés y LRC Studio genera automáticamente lecturas por palabra (furigana) para los kanji, mostradas como texto pequeño sobre cada palabra en el editor y la vista previa.",
      body2: "Las lecturas no siempre son correctas para kanji que dependen del contexto — haz doble clic en una palabra para abrir su editor de lectura y corregirla manualmente.",
      body3: "Cambia cómo se muestran las lecturas — hiragana o katakana — desde el menú \"⋯\" (Más acciones) de la barra del editor. En la vista previa, usa el icono de libro para mostrar u ocultar el furigana por completo.",
    },
    autoStamp: {
      title: "Auto Stamp",
      body1: "Auto Stamp transcribe tu audio y lo alinea con tu letra, así toda la canción se marca sin hacerlo a mano. Por defecto solo rellena las líneas que aún no tienen marca de tiempo.",
    },
    lyricsSearch: {
      title: "Búsqueda de letras e importación sincronizada",
      body1: "Busca una canción por título y artista. Los resultados marcados como \"Sincronizada\" ya traen marcas de tiempo, y puedes conservarlas al importar.",
    },
    subtitles: {
      title: "Proyectos de subtítulos y estudio",
      body1: "Cambia un proyecto de canción a subtítulos para temporizar subtítulos de vídeo y expórtalos como SRT, VTT o SBV.",
    },
    sessions: {
      title: "Sesiones",
      body1: "Una sesión es la edición en vivo y en conjunto de uno de tus proyectos guardados: la gente se une por enlace, edita las mismas líneas en tiempo real y todo se guarda en ese proyecto.",
    },
    share: {
      title: "Compartir y social",
      body1: "Usa Compartir para generar un enlace en vivo a tu proyecto — cualquiera con el enlace puede verlo y, si sigues editando, verá las actualizaciones en tiempo real.",
      body2: "Los proyectos publicados pueden recibir estrellas, bifurcarse, recibir reacciones y agruparse en listas.",
    },
    look: {
      title: "Temas y visualizadores",
      body1: "Elige un tema claro u oscuro y un visualizador para la vista previa desde Ajustes.",
    },
  },
};

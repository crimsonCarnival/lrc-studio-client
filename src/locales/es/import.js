export default {
  success: [
    "Se importaron {{count}} líneas correctamente.",
    "{{count}} líneas listas para sincronizar.",
    "Se cargaron {{count}} líneas sin problemas.",
    "Importación completa. Se agregaron {{count}} líneas."
  ],
  failed: "Error al analizar el archivo de letras",
  noLines: "No se encontraron letras en el archivo",
  tooLarge: "Archivo demasiado grande (máx 5 MB)",
  unsupportedFormat: "Tipo de archivo no soportado. Usa archivos .lrc, .srt o .txt.",
  fromUrl: "Importar desde URL",
  urlPlaceholder: "https://ejemplo.com/letras.lrc",
  fetchError: "Error al obtener el archivo. El servidor puede no permitir solicitudes externas.",
  invalidUrl: "URL inválida. Usa http:// o https://"
};

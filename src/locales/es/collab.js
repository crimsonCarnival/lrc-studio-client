export default {
  // Se muestra en /session/:publicId cuando la conexión se detiene definitivamente.
  session: {
    endedTitle: 'Esta sesión ha terminado',
    endedBody: 'El propietario cerró la sesión en vivo. Todo lo editado en ella se guardó en el proyecto.',
    goHome: 'Ir al inicio',
    // La primera conexión nunca se completó (servidor inaccesible o no se pudo cargar el código de la sesión).
    offlineTitle: 'No se puede conectar con la sesión',
    offlineBody: 'Revisa tu conexión. Se sigue intentando en segundo plano, o puedes reintentarlo ahora.',
    retry: 'Reintentar',
  },
};

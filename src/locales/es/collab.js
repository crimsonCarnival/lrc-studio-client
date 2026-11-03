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
  // Bloqueos de línea: solo un participante edita o sincroniza una línea a la vez.
  locks: {
    denied: '{{name}} está trabajando en esta línea',
    deniedGeneric: 'No puedes editar esta línea ahora mismo',
    badge: 'Editando: {{name}}',
    deleteLocked: '{{name}} está editando esta línea',
  },
};

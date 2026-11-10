export default {
  title: 'Feed',
  loadMore: 'Cargar más',
  error: 'No se pudo cargar el feed. Intenta más tarde.',
  empty: {
    title: [
      'Nada aquí todavía.',
      'Todo tranquilo por aquí.',
      'Tu feed está vacío.',
      'No hay actividad que mostrar.',
    ],
    cta: [
      'Sigue a algunos usuarios para ver su actividad.',
      'Sigue a creadores para llenar tu feed.',
      'Encuentra a alguien a quien seguir y mira lo que están haciendo.',
      'Sigue usuarios y sus proyectos aparecerán aquí.',
    ],
  },
  untitled: 'Proyecto sin título',
  you: 'Tú',
  target: {
    mine: 'tu proyecto',
    ownMine: 'tu propio proyecto',
    own: 'su propio proyecto',
    ofPrefix: 'el proyecto de ',
    ofSuffix: '',
  },
  action: {
    project_published: [
      'publicó un nuevo proyecto',
      'acaba de lanzar un proyecto',
      'publicó una nueva sincronización',
      'publicó',
    ],
    project_starred: [
      'marcó con estrella',
      'le gustó',
      'dio una estrella a',
    ],
    project_forked: [
      'bifurcó',
      'hizo una copia de',
      'tomó como base',
    ],
    project_shared: [
      'compartió',
      'recomendó',
      'pasó',
    ],
    playlist_created: [
      'creó una lista',
      'publicó una lista',
      'armó una lista',
    ],
    user_followed: [
      'ahora sigue a',
      'comenzó a seguir a',
      'siguió a',
    ],
  },
  // El lector lo hizo él mismo.
  selfAction: {
    project_published: ['publicaste un nuevo proyecto', 'acabas de lanzar un proyecto', 'publicaste una nueva sincronización', 'publicaste'],
    project_starred: ['marcaste con estrella', 'te gustó', 'diste una estrella a'],
    project_forked: ['bifurcaste', 'hiciste una copia de', 'tomaste como base'],
    project_shared: ['compartiste', 'recomendaste', 'pasaste'],
    playlist_created: ['creaste una lista', 'publicaste una lista', 'armaste una lista'],
    user_followed: ['ahora sigues a', 'comenzaste a seguir a', 'seguiste a'],
  },
  // Se lo hicieron al lector: la persona seguida es "tú", así que el verbo lo lleva.
  toYouAction: {
    user_followed: ['ahora te sigue', 'comenzó a seguirte', 'te siguió'],
  },
};

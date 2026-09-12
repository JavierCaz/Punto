/**
 * Spanish (es) — canonical resource.
 *
 * Spanish is authored first (AGENTS.md §9.2: "Spanish first (es), English (en)")
 * and is the single source of truth for the key shape: `en.ts` is typed
 * `typeof es` so any key added/removed here breaks the English build until the
 * files are back in sync.
 *
 * Conventions:
 * - Group keys by feature/screen under a top-level namespace.
 * - Use i18next interpolation `{{var}}` for values and `$t()` for nesting.
 * - Keep user-facing strings here; never hard-code UI copy in components.
 */
export default {
  common: {
    appName: 'Punto',
    actions: {
      save: 'Guardar',
      cancel: 'Cancelar',
      delete: 'Eliminar',
      edit: 'Editar',
      add: 'Agregar',
      back: 'Volver',
      close: 'Cerrar',
      confirm: 'Confirmar',
      retry: 'Reintentar',
      more: 'Más opciones',
      continue: 'Continuar',
      signOut: 'Cerrar sesión',
    },
    status: {
      loading: 'Cargando…',
      error: 'Algo salió mal',
      empty: 'Sin resultados',
    },
  },

  currencies: {
    MXN: 'Peso mexicano (MXN)',
    USD: 'Dólar estadounidense (USD)',
  },

  accents: {
    royal: 'Azul',
    emerald: 'Esmeralda',
    indigo: 'Índigo',
    amber: 'Ámbar',
    slate: 'Pizarra',
    rose: 'Rosa',
  },

  business: {
    nameLabel: 'Nombre del negocio',
    namePlaceholder: 'Ej. Café La Esquina',
    nameRequired: 'Escribe el nombre del negocio.',
    logoLabel: 'Logo',
    logoHint: 'Opcional. Aparecerá en tu punto de venta y en tus recibos.',
    logoAdd: 'Agregar logo',
    logoChange: 'Cambiar logo',
    logoRemove: 'Quitar',
    logoPermissionDenied: 'Necesitamos permiso para acceder a tus fotos.',
    logoFailed: 'No pudimos cargar la imagen. Inténtalo de nuevo.',
    accentLabel: 'Color de acento',
    currencyLabel: 'Moneda',
    localeLabel: 'Idioma',
    loading: 'Cargando…',
    save: 'Guardar cambios',
    savePending: 'Guardando…',
    saved: 'Cambios guardados',
    saveFailed: 'No pudimos guardar los cambios. Inténtalo de nuevo.',
  },

  tabs: {
    pos: 'POS',
    sales: 'Ventas',
    inventory: 'Inventario',
    more: 'Más',
  },

  pos: {
    title: 'Punto de venta',
    searchPlaceholder: 'Buscar producto por nombre…',
    empty: {
      title: 'Tu catálogo aún está vacío',
      message: 'Agrega tus productos y categorías para empezar a cobrar desde el punto de venta.',
      action: 'Agregar producto',
    },
  },

  sales: {
    title: 'Ventas',
    empty: {
      title: 'Aún no hay ventas',
      message: 'Cuando cobres una venta desde el punto de venta, aquí verás su historial.',
    },
  },

  inventory: {
    title: 'Inventario',
    empty: {
      title: 'Sin productos en inventario',
      message: 'Agrega productos con control de existencias para ver aquí tu stock y sus movimientos.',
    },
  },

  more: {
    account: 'Cuenta',
    signedInAs: 'Sesión iniciada como {{name}}',
    team: 'Equipo',
    teamSubtitle: 'Empleados y usuarios',
    settingsSubtitle: 'Apariencia, idioma y preferencias',
    about: 'Acerca de Punto',
    signOut: 'Cerrar sesión',
  },

  settings: {
    title: 'Configuración',
    entry: 'Configuración',
    appearance: 'Apariencia',
    theme: {
      light: 'Claro',
      dark: 'Oscuro',
      system: 'Sistema',
    },
    languageOptions: {
      es: 'Español',
      en: 'English',
    },
    business: 'Negocio',
    aboutLine: 'Hecho para negocios locales · Tus datos viven solo en este dispositivo.',
  },

  roles: {
    admin: 'Administrador',
    employee: 'Empleado',
  },

  onboarding: {
    stepBusiness: '1 · Tu negocio',
    stepAccount: '2 · Tu cuenta de administrador',
    businessNameLabel: 'Nombre del negocio',
    businessNamePlaceholder: 'Ej. Café La Esquina',
    businessNameHint: 'Este nombre aparecerá en tu punto de venta y en los recibos.',
    accountHint: 'Crea la cuenta del dueño: con ella administrarás Punto y podrás agregar empleados.',
    firstNameLabel: 'Tu nombre',
    firstNamePlaceholder: 'Ej. Ana',
    usernameLabel: 'Usuario',
    usernamePlaceholder: 'Ej. ana.duena',
    usernameHint: '3–32 caracteres: minúsculas, números, . _ -',
    passwordLabel: 'Contraseña',
    passwordPlaceholder: 'Mínimo 8 caracteres',
    confirmPasswordLabel: 'Repite la contraseña',
    submit: 'Crear mi negocio',
    submitPending: 'Creando…',
    errors: {
      businessNameRequired: 'Escribe el nombre de tu negocio.',
      firstNameRequired: 'Escribe tu nombre.',
      usernameInvalid: 'Usa entre 3 y 32 caracteres: minúsculas, números, . _ -',
      passwordTooShort: 'La contraseña debe tener al menos 8 caracteres.',
      passwordMismatch: 'Las contraseñas no coinciden.',
      usernameTaken: 'Ese usuario ya está en uso. Elige otro.',
      failed: 'No pudimos crear tu negocio. Inténtalo de nuevo.',
    },
  },

  login: {
    title: 'Iniciar sesión',
    welcomeBack: 'Bienvenido de nuevo',
    usernameLabel: 'Usuario',
    usernamePlaceholder: 'Tu usuario',
    continueButton: 'Continuar',
    backToUsername: 'Cambiar de usuario',
    passwordLabel: 'Contraseña',
    pinLabel: 'PIN de 4 a 6 dígitos',
    submitButton: 'Entrar',
    errors: {
      usernameRequired: 'Escribe tu usuario.',
      userNotFound: 'No encontramos ese usuario.',
      invalidCredentials: 'Usuario o contraseña incorrectos.',
      invalidPin: 'PIN incorrecto.',
      inactive: 'Esta cuenta no está activa.',
      locked: 'Demasiados intentos. Espera {{seconds}} s e inténtalo de nuevo.',
      failed: 'No pudimos iniciar sesión. Inténtalo de nuevo.',
    },
  },

  team: {
    title: 'Equipo',
    subtitle: 'Las personas que usan tu Punto',
    add: 'Agregar empleado',
    emptyTitle: 'Aún no hay empleados',
    emptyMessage: 'Agrega a las personas de tu equipo para que inicien sesión con su PIN.',
    currentUserSuffix: '(tú)',
    form: {
      title: 'Nuevo empleado',
      firstNameLabel: 'Nombre',
      firstNamePlaceholder: 'Ej. Luis',
      lastNameLabel: 'Apellido (opcional)',
      lastNamePlaceholder: 'Ej. García',
      usernameLabel: 'Usuario',
      usernamePlaceholder: 'Ej. luis.garcia',
      usernameHint: '3–32 caracteres: minúsculas, números, . _ -',
      pinLabel: 'PIN',
      pinPlaceholder: '4 a 6 dígitos',
      pinHint: 'Lo usarán para iniciar sesión rápido en la caja.',
      submit: 'Agregar al equipo',
      errors: {
        firstNameRequired: 'Escribe el nombre.',
        usernameInvalid: 'Usa entre 3 y 32 caracteres: minúsculas, números, . _ -',
        pinInvalid: 'El PIN debe tener de 4 a 6 dígitos.',
        usernameTaken: 'Ese usuario ya está en uso. Elige otro.',
        failed: 'No pudimos guardar. Inténtalo de nuevo.',
      },
    },
  },

  auth: {
    confirmSignOutTitle: '¿Cerrar sesión?',
    confirmSignOutMessage: 'En este dispositivo quedarás fuera hasta que inicies sesión de nuevo.',
    archiveConfirmTitle: '¿Quitar a {{name}}?',
    archiveConfirmMessage: '{{name}} ya no podrá iniciar sesión. Su historial de ventas se conserva.',
    archiveBlockedLastAdmin: 'No puedes quitar al último administrador.',
    archiveBlockedSelf: 'No puedes quitarte a ti mismo.',
  },
};

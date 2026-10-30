// ============================================================
// js/config.js — CONFIGURACIÓN DEL NEGOCIO
// ============================================================
// Este es el único archivo que cambias cuando adaptas la app
// a un nuevo negocio. No toques ningún otro archivo JS.
// ============================================================

const CONFIG = {
    // ========================================================
    // IDENTIDAD VISUAL
    // Cambia esta sección para personalizar una instalación.
    // ========================================================
    appBrand: "Gestión & Co.",
    appTitle: "Sistema de Gestión",
    loginTitle: "Acceso",
    loginSubtitle: "Ingresa tus credenciales para continuar",

    // Modo de autenticación:
    // - "legacy": compatible con el backend actual, que devuelve únicamente el rol.
    // - "token": exige token y validación de sesión en Google Apps Script.
    // El rol almacenado por el frontend es SOLO para adaptar la interfaz.
    AUTH_MODE: "token",

    // Tiempo máximo para esperar una respuesta de las APIs externas.
    requestTimeoutMs: 15000,

    // Reutiliza durante unos segundos las lecturas de Google Sheets para
    // evitar solicitudes repetidas al cambiar de pantalla.
    dataCacheTtlMs: 45000,

    // Control remoto de activación. Cada instalación debe usar un companyId
    // único que exista en la hoja central Empresas.
    hostingCheckEnabled: true,

    // URL del backend (Google Apps Script u otro)
    apiUrl: "https://script.google.com/macros/s/AKfycbyF2utGWEKAh5akyeq2be3duJt_oEr1LuJZGZULY2U8qe2j4U4Z0PGFgeR6QBlyRYBj/exec",

    // URL de control de hosting central (Apps Script de la hoja personal)
    // Reemplaza con la URL desplegada de tu Web App para la hoja de hosting
    hostingApiUrl: "https://script.google.com/macros/s/AKfycbz2TeGBFm4D9K-bmDjpyx25-441okJ_UUXS9Qpkmp15oHwNVyGQvZROIBMMqp66T2I/exec",

    // ID de la empresa en la hoja de control de hosting
    companyId: "123",

    // Nombre del negocio (aparece en el inicio)
    clientName: "Elizabeth Creaciones",

    // Subtítulo descriptivo del negocio
    clientSubtitle: "Clientes, operaciones y pagos en un solo lugar",

    // Textos generales de la experiencia. Permiten adaptar la misma interfaz
    // a comercio, restaurante, servicios, salud, suplementos u otros rubros.
    interface: {
        workspaceLabel: "Centro de gestión",
        dashboardTitle: "Resumen del negocio",
        dashboardSubtitle: "Actividad operativa y financiera en un solo vistazo",
        quickActionsTitle: "Acciones rápidas",
        scheduleTitle: "Agenda",
        scheduleNav: "Agenda",
        dateLabel: "Fecha programada",
        customerNameLabel: "Nombre o razón social",
        customerNamePlaceholder: "Persona, empresa o referencia",
        customerPhoneLabel: "Teléfono o contacto",
        customerPhonePlaceholder: "Número con código de país",
        customerNotesLabel: "Notas del cliente"
    },

    // Colores de marca. Se aplican sobre las variables CSS sin modificar
    // archivos de estilos. Usa cualquier color CSS válido.
    theme: {
        background: "#0e0a14",
        surface: "#160f22",
        surfaceAlt: "#1e1530",
        primary: "#d4607a",
        primarySoft: "#e8909f",
        accent: "#c8963c",
        accentSoft: "#e0b86a",
        success: "#4eaa7e",
        successSoft: "#7dcca6"
    },

    // Prefijo de WhatsApp para el botón de contacto rápido
    // Ecuador: "593" | Colombia: "57" | México: "52"
    whatsappPrefix: "593",

    // Formato telefónico de esta instalación. Para otro país se cambian
    // únicamente estos valores; los datos internos siguen siendo texto.
    phone: {
        countryCode: "593",
        localPrefix: "0",
        mobilePrefix: "09",
        localLength: 10,
        pattern: "^09\\d{8}$",
        example: "09XXXXXXXX",
        validationMessage: "Ingresa un celular ecuatoriano de 10 dígitos con formato 09XXXXXXXX."
    },

    // Símbolo de moneda para los montos
    currencySymbol: "$",

    // ========================================================
    // TERMINOLOGÍA DEL NEGOCIO
    // Los nombres internos de la API siguen siendo clientes,
    // pedidos y pagos. Estos valores cambian únicamente la UI.
    // Ejemplos para order: pedido/pedidos, trabajo/trabajos,
    // reserva/reservas, servicio/servicios, venta/ventas.
    // ========================================================
    entities: {
        customer: {
            singular: "cliente",
            plural: "clientes",
            icon: "👤",
            notesPlaceholder: "Preferencias, referencias o información útil..."
        },
        order: {
            singular: "operación",
            plural: "operaciones",
            icon: "📋",
            descriptionLabel: "Detalle de la operación",
            descriptionPlaceholder: "Producto, servicio, reserva, cantidades o indicaciones...",
            notesPlaceholder: "Información adicional para gestionar la operación..."
        },
        payment: {
            singular: "pago",
            plural: "pagos",
            icon: "💳"
        },
        installment: {
            singular: "abono",
            plural: "abonos",
            icon: "💵"
        },
        delivery: {
            singular: "compromiso",
            plural: "compromisos",
            icon: "📅"
        }
    },

    // Textos de los estados. Las claves NO deben modificarse porque son las
    // que utiliza Google Sheets; sólo cambia el texto visible.
    statusLabels: {
        pendiente: "Pendiente",
        en_proceso: "En proceso",
        listo: "Listo",
        entregado: "Finalizado",
        cancelado: "Cancelado"
    },

    dashboard: {
        totalLabel: "Valor total",
        activeLabel: "Operaciones en curso",
        outstandingLabel: "Saldo pendiente",
        paymentsChartLabel: "Distribución de cobros",
        generatedLabel: "Total registrado"
    },

    // Alias conservados para instalaciones o extensiones anteriores.
    productIcon: "📋",
    productLabel: "operación",
    productLabelPlural: "operaciones"
};


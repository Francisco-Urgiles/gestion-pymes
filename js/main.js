// ============================================================
// js/main.js — PUNTO DE ENTRADA DE LA APLICACIÓN
// ============================================================
// Este es el único archivo que "sabe" de todos los módulos.
// Su único trabajo es conectarlos y arrancar la app.
// NO contiene lógica de negocio. Si necesitas agregar un
// módulo nuevo, solo debes registrarlo aquí.
// ============================================================

// Exponemos la API pública de la app al HTML
// El HTML llama a app.xyz() desde los atributos onclick
window.app = {
    goTo:     (screen) => Router.goTo(screen),
    ui:       UI,
    pedidos:  Pedidos,
    clientes: Clientes,
    pagos:    Pagos,
    search:   Search,
    reportes: Reportes,
    auth:     Auth,
    usuarios: Usuarios,
    subscription: Subscription,
    reminders: Reminders
};

// Inicialización cuando el DOM está completamente listo
window.addEventListener('load', async () => {
    // Limpiar residuos de la antigua sesión basada en localStorage.
    Session.initialize();
    Icons.init();

    // La autorización y el estado se consultan autenticados en el backend.
    const initialLoader=document.getElementById('hosting-loader');
    if(initialLoader)initialLoader.hidden=true;
    // 3. Inicializar modales (clic fuera para cerrar)
    UI.initModals();
    Search.init();

    // 4. Inyectar marca, terminología y nombre del negocio.
    UI.applyBusinessConfig(CONFIG.clientName);

    // 5. Verificar sesión y navegar a la pantalla correcta
    if (await Auth.check()) {
        Router.goTo('home');
    }
});


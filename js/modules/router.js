// ============================================================
// js/modules/router.js — ENRUTADOR DE PANTALLAS
// ============================================================
// Este módulo controla TODA la navegación entre pantallas.
// Sabe a qué módulo llamar cuando se activa cada pantalla.
// Depende de: utils.js, store.js, y todos los módulos.
// ============================================================

const Router = {

    // Mapa de títulos para el topbar
    titles: {
        login:     '',
        suspended: '',
        home:      '',
        pedidos:   'Pedidos',
        clientes:  'Clientes',
        pagos:     'Pagos',
        entregas:  'Calendario',
        usuarios:  'Usuarios',
        reportes:  'Informes y pronóstico'
    },

    // Mapa de qué módulo cargar al entrar a cada pantalla
    loaders: {
        home:     () => Home.cargar(),
        pedidos:  () => Pedidos.cargar(),
        clientes: () => Clientes.cargar(),
        pagos:    () => Pagos.cargar(),
        entregas: () => Entregas.cargar(),
        usuarios: () => Usuarios.cargar(),
        reportes: () => Reportes.cargar()
    },

    goTo: (screen) => {
        // Alias: 'agenda' redirige a 'entregas'
        if (screen === 'agenda') screen = 'entregas';

        // CONTROL VISUAL ÚNICAMENTE. La autorización real debe validarse
        // en Google Apps Script para cada endpoint protegido.
        if (['pagos', 'usuarios', 'reportes'].includes(screen) && Session.getRole() !== 'admin') {
            Utils.toast('No tienes permisos para ver esta sección.', 'error');
            screen = Session.isAuthenticated() ? 'home' : 'login';
        }

        const required={home:'can_view_dashboard',pedidos:'can_manage_orders',clientes:'can_manage_customers',entregas:'can_view_dashboard',pagos:'can_manage_payments',reportes:'can_view_financial_reports',usuarios:'can_manage_users'};
        if(required[screen] && screen!=='home' && !Subscription.can(required[screen])){Utils.toast('Tu plan o estado no permite esta sección.','warn');screen='home';}
        // 1. Desactivar todas las pantallas y botones del nav
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

        // 2. Activar pantalla y botón del nav objetivo
        const targetScreen = document.getElementById('screen-' + screen);
        const targetNav    = document.getElementById('nav-' + screen);
        if (targetScreen) targetScreen.classList.add('active');
        if (targetNav)    targetNav.classList.add('active');

        // 3. Gestionar el topbar
        const back      = document.getElementById('btn-back');
        const title     = document.getElementById('page-title');
        const bottomNav = document.getElementById('bottom-nav');
        const topSearch = document.getElementById('topbar-search');
        if (topSearch) topSearch.style.display = ['login','suspended'].includes(screen) ? 'none' : 'flex';

        if (screen === 'login' || screen === 'suspended') {
            if (bottomNav) bottomNav.style.display = 'none';
            if (back)      back.style.display  = 'none';
            if (title)     title.textContent   = '';
        } else if (screen === 'home') {
            if (bottomNav) bottomNav.style.display = 'flex';
            if (back)      back.style.display  = 'none';
            if (title)     title.textContent   = '';
        } else {
            if (bottomNav) bottomNav.style.display = 'flex';
            if (back)      back.style.display  = 'block';
            if (title)     title.textContent   = Router.titles[screen] || '';
        }

        // 4. Disparar la carga de datos del módulo correspondiente
        if (Router.loaders[screen]) Router.loaders[screen]();

        Subscription.render();
        window.scrollTo(0, 0);
    }
};


// ============================================================
// js/session.js — SESIÓN TEMPORAL DEL NAVEGADOR
// ============================================================
// Centraliza todo acceso al almacenamiento de sesión.
// En modo legacy conserva la persistencia histórica en localStorage para no
// bloquear instalaciones cuyo backend todavía no soporta tokens.
// IMPORTANTE: el rol guardado aquí controla solamente la interfaz.
// La autorización real debe validarse en Google Apps Script.
// ============================================================

const Session = {
    keys: {
        token: 'session_token',
        role:  'session_role',
        user:  'session_user'
    },

    initialize: () => {
        if (CONFIG.AUTH_MODE === 'legacy') {
            // Recuperar la sesión que utilizaba la versión anterior.
            const legacyRole = localStorage.getItem('role') || localStorage.getItem('rol') || '';
            if (['admin', 'employee'].includes(legacyRole)) {
                sessionStorage.setItem(Session.keys.role, legacyRole);
                localStorage.setItem('role', legacyRole);
            }
            localStorage.removeItem('rol');
            return;
        }

        // Al activar tokens ya no se acepta la sesión legacy persistente.
        localStorage.removeItem('role');
        localStorage.removeItem('rol');
    },

    getToken: () => sessionStorage.getItem(Session.keys.token) || '',
    getRole:  () => sessionStorage.getItem(Session.keys.role)
        || (CONFIG.AUTH_MODE === 'legacy' ? localStorage.getItem('role') : '')
        || '',
    getUser:  () => sessionStorage.getItem(Session.keys.user)  || '',

    setSession: ({ token = '', role = '', user = '' } = {}) => {
        const normalizedRole = String(role || '').trim().toLowerCase();
        if (!['admin', 'employee'].includes(normalizedRole)) {
            throw new Error('El servidor devolvió un rol de usuario inválido.');
        }

        Session.clear();
        sessionStorage.setItem('session_cache_scope', crypto.randomUUID());
        sessionStorage.setItem(Session.keys.role, normalizedRole);
        if (CONFIG.AUTH_MODE === 'legacy') {
            // Compatibilidad temporal con el comportamiento original.
            localStorage.setItem('role', normalizedRole);
        }
        if (token) sessionStorage.setItem(Session.keys.token, String(token));
        if (user)  sessionStorage.setItem(Session.keys.user, String(user));
    },

    isAuthenticated: () => {
        if (CONFIG.AUTH_MODE === 'token') return Boolean(Session.getToken());
        return Boolean(Session.getRole());
    },

    clear: () => {
        sessionStorage.removeItem('session_cache_scope');
        Object.values(Session.keys).forEach(key => sessionStorage.removeItem(key));
        localStorage.removeItem('role');
        localStorage.removeItem('rol');
    }
};


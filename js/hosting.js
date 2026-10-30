// ============================================================
// js/hosting.js — MÓDULO DE VERIFICACIÓN DE HOSTING / ESTADO
// ============================================================
// Consulta la hoja de cálculo central para verificar si el estado
// del cliente/empresa está "activo" o "inactivo".
// Depende de: config.js (CONFIG.hostingApiUrl, CONFIG.companyId)
// ============================================================

const Hosting = {
    verificarEstado: async () => {
        // Permite trabajar con el backend original mientras se corrige la
        // inscripción de la empresa en la hoja central de activaciones.
        if (CONFIG.hostingCheckEnabled === false) {
            return {
                activo: true,
                nombre: CONFIG.clientName,
                message: 'Control de activación deshabilitado temporalmente'
            };
        }

        // Si no está configurada la URL de hosting o es un placeholder, permitimos el acceso local con advertencia
        if (!CONFIG.hostingApiUrl || CONFIG.hostingApiUrl.includes('123')) {
            console.warn('https://script.google.com/macros/s/AKfycbxXvnKurHRMBIUEiBWU8ZYJoKat8XjCcBb0XTHSb-ygFZ719kywT5qvZH_GJyP8zWTo/exec');
            return { activo: true, message: 'URL de hosting no configurada' };
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), CONFIG.requestTimeoutMs || 15000);
        try {
            const url = `${CONFIG.hostingApiUrl}?id=${encodeURIComponent(CONFIG.companyId)}`;
            const res = await fetch(url, { signal: controller.signal });
            if (!res.ok) throw new Error('HTTP_ERROR');
            const text = await res.text();
            if (!text.trim()) throw new Error('EMPTY_RESPONSE');

            let data;
            try {
                data = JSON.parse(text);
            } catch {
                throw new Error('INVALID_RESPONSE');
            }

            if (data && data.estado && data.estado.toLowerCase() === 'activo') {
                return {
                    activo: true,
                    nombre: data.nombre || CONFIG.clientName
                };
            } else {
                return {
                    activo: false,
                    nombre: data.nombre || CONFIG.clientName,
                    message: data.message || 'La página ha sido suspendida temporalmente.'
                };
            }
        } catch (e) {
            return {
                activo: false,
                nombre: CONFIG.clientName,
                message: 'No se pudo verificar el estado del servicio. Revisa tu conexión a internet.'
            };
        } finally {
            clearTimeout(timeout);
        }
    }
};


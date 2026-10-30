// ============================================================
// js/api.js — CAPA DE COMUNICACIÓN CON GOOGLE APPS SCRIPT
// ============================================================
// Mantiene Content-Type text/plain para evitar romper la compatibilidad
// existente con Google Apps Script. Nunca coloca tokens en URLs.
// ============================================================

class ApiError extends Error {
    constructor(message, code = 0, kind = 'logical') {
        super(message);
        this.name = 'ApiError';
        this.code = Number(code) || 0;
        this.kind = kind;
    }
}

const API = {
    _cachePrefix: 'business_app_api_cache:',
    _memoryCache: new Map(),
    _pendingReads: new Map(),

    _clone: value => {
        try {
            return JSON.parse(JSON.stringify(value));
        } catch {
            return value;
        }
    },

    _cacheKey: (path, params = {}) => `${API._cachePrefix}${CONFIG.companyId}:${CONFIG.apiUrl}:${sessionStorage.getItem('session_cache_scope')}:${Session.getRole()}:${path}:${JSON.stringify(params)}`,

    _readCache: key => {
        let entry = API._memoryCache.get(key);
        if (!entry) {
            try {
                const raw = sessionStorage.getItem(key);
                if (raw) entry = JSON.parse(raw);
            } catch {
                entry = null;
            }
        }

        if (!entry || entry.expiresAt <= Date.now()) {
            API._memoryCache.delete(key);
            try { sessionStorage.removeItem(key); } catch { /* almacenamiento no disponible */ }
            return null;
        }

        API._memoryCache.set(key, entry);
        return API._clone(entry.value);
    },

    _writeCache: (key, value) => {
        const entry = {
            expiresAt: Date.now() + (CONFIG.dataCacheTtlMs || 45000),
            value: API._clone(value)
        };
        API._memoryCache.set(key, entry);
        try { sessionStorage.setItem(key, JSON.stringify(entry)); } catch { /* usar sólo memoria */ }
    },

    clearCache: () => {
        API._memoryCache.clear();
        API._pendingReads.clear();
        try {
            for (let index = sessionStorage.length - 1; index >= 0; index--) {
                const key = sessionStorage.key(index);
                if (key && key.startsWith(API._cachePrefix)) sessionStorage.removeItem(key);
            }
        } catch { /* almacenamiento no disponible */ }
    },

    _url: (path, params = {}) => {
        const query = new URLSearchParams({ path: String(path) });
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                query.set(key, String(value));
            }
        });
        return `${CONFIG.apiUrl}?${query.toString()}`;
    },

    _fetch: async (url, options = {}) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), CONFIG.requestTimeoutMs || 15000);

        try {
            const response = await fetch(url, { ...options, signal: controller.signal });
            const text = await response.text();

            if (!text.trim()) {
                const code = response.ok ? 0 : response.status;
                throw new ApiError('El servicio devolvió una respuesta vacía.', code, 'empty');
            }

            let data;
            try {
                data = JSON.parse(text);
            } catch {
                throw new ApiError('El servicio devolvió una respuesta inválida.', 0, 'invalid_json');
            }

            if (!response.ok) {
                if (!data || typeof data !== 'object') {
                    throw new ApiError('El servicio respondió con un error.', response.status, 'http');
                }
                if (data.success === undefined) data.success = false;
                if (!data.error) data.error = 'HTTP_ERROR';
                if (!data.code) data.code = response.status;
            }

            return data;
        } catch (error) {
            if (error && error.name === 'AbortError') {
                throw new ApiError('La conexión tardó demasiado. Intenta nuevamente.', 0, 'timeout');
            }
            if (error instanceof ApiError) throw error;
            throw new ApiError('No fue posible conectar con el servicio. Intenta nuevamente.', 0, 'network');
        } finally {
            clearTimeout(timeout);
        }
    },

    _checkLogicalError: (data, { handleAuthError = true } = {}) => {
        const failed = data && (data.success === false || data.error);
        if (!failed) return data;

        const code = Number(data.code) || 0;
        const errorCode = typeof data.error === 'string' ? data.error : '';
        const serverMessage = typeof data.message === 'string'
            ? data.message
            : (typeof data.error === 'string' ? data.error : 'No fue posible completar la operación.');

        // Si se suspende la empresa mientras la aplicacion esta abierta, el
        // backend retira el acceso y el frontend elimina los datos cargados.
        if (errorCode === 'SERVICE_INACTIVE') {
            API.clearCache();
            Session.clear();
            if (typeof Store !== 'undefined') Store.reset();
            if (typeof UI !== 'undefined') UI.resetForLogout();
            const messageEl = document.getElementById('suspended-msg-text');
            if (messageEl) messageEl.textContent = serverMessage;
            const logoutBtn = document.getElementById('btn-logout');
            if (logoutBtn) logoutBtn.style.display = 'none';
            if (typeof Router !== 'undefined') Router.goTo('suspended');
            throw new ApiError(serverMessage, code || 403, 'logical');
        }

        if (['SUBSCRIPTION_EXPIRED','PLAN_REQUIRED','USER_LIMIT','ACCOUNT_DISABLED'].includes(errorCode)) {
            API.clearCache();Store.reset();Reportes.reset();
            if(errorCode==='ACCOUNT_DISABLED'||errorCode==='USER_LIMIT') API.handleUnauthorized();
            else if(typeof Subscription !== 'undefined' && !Subscription.pending) Subscription.refresh(true).then(()=>Router.goTo('home')).catch(()=>{});
        }
        if (code === 401 && handleAuthError) API.handleUnauthorized();
        if (code === 403 && typeof Utils !== 'undefined') {
            Utils.toast('No tienes permisos para realizar esta acción.', 'error');
        }

        throw new ApiError(serverMessage, code, 'logical');
    },

    handleUnauthorized: () => {
        API.clearCache();
        Session.clear();
        if (typeof Store !== 'undefined') Store.reset();
        if (typeof UI !== 'undefined') UI.resetForLogout();
        if (typeof Router !== 'undefined') Router.goTo('login');
        if (typeof Utils !== 'undefined') {
            Utils.toast('Tu sesión expiró. Inicia sesión nuevamente.', 'warn');
        }
    },

    get: async (path, params = {}, options = {}) => {
        const data = await API._fetch(API._url(path, params));
        return API._checkLogicalError(data, options);
    },

    post: async (path, data = {}, options = {}) => {
        const payload = { ...(data || {}) };
        const token = Session.getToken();
        if (token && !options.skipToken) payload.token = token;

        const response = await API._fetch(API._url(path), {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload)
        });
        if(token && token!==Session.getToken() && path!=='logout') throw new ApiError('La sesión cambió. Vuelve a cargar la pantalla.',401,'session_changed');
        const checked = API._checkLogicalError(response, options);
        if (!options.preserveCache && !['login', 'session/check', 'logout', 'suscripcion', 'bootstrap', 'export', 'export_informe', 'pronostico', 'auditoria'].includes(path)) {
            API.clearCache();
        }
        return checked;
    },

    // En legacy conserva GET. En token convierte lecturas protegidas a POST
    // para evitar exponer el token en la URL. El Apps Script seguro deberá
    // reconocer { action: "list", ...params } en estos endpoints.
    read: async (path, params = {}) => {
        const key = API._cacheKey(path, params);
        const scope=sessionStorage.getItem('session_cache_scope');
        const cached = API._readCache(key);
        if (cached !== null) return cached;

        if (API._pendingReads.has(key)) {
            return API._clone(await API._pendingReads.get(key));
        }

        const request = CONFIG.AUTH_MODE === 'token'
            ? API.post(path, { action: 'list', ...params }, { preserveCache: true })
            : API.get(path, params);
        API._pendingReads.set(key, request);

        try {
            const result = await request;
            if(scope!==sessionStorage.getItem('session_cache_scope'))throw new ApiError('La sesión cambió.',401,'session_changed');
            API._writeCache(key, result);
            return API._clone(result);
        } finally {
            API._pendingReads.delete(key);
        }
    }
};


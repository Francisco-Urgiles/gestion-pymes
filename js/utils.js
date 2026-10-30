// ============================================================
// js/utils.js — FUNCIONES DE UTILIDAD GENÉRICAS
// ============================================================
// Funciones puras de ayuda reutilizables en toda la app.
// No tienen estado propio. No llaman a la API.
// Depende de: store.js (DATA)
// ============================================================

const Utils = {

    // --- DOM y Formularios ---
    val: id => (document.getElementById(id) || {}).value || '',

    clearFields: ids => ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    }),

    setLoading: (btn, isLoading, label) => {
        if (btn) { btn.disabled = isLoading; btn.textContent = label; }
    },

    showEl: (id, html) => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = html;
    },

    setText: (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = String(value ?? '');
    },

    loading: id => Utils.showEl(id, `
        <div class="skeleton-list" role="status" aria-label="Cargando información">
            ${Array.from({ length: 3 }, () => `
                <div class="skeleton-card" aria-hidden="true">
                    <span class="skeleton-line wide"></span>
                    <span class="skeleton-line medium"></span>
                    <span class="skeleton-line short"></span>
                </div>`).join('')}
        </div>`),

    errorHtml: () => '<div class="empty"><span class="eicon">⚠️</span><p>No fue posible cargar la información. Intenta nuevamente.</p></div>',

    // --- Notificaciones (Toast) ---
    toast: (msg, type = 'ok') => {
        const t = document.getElementById('toast');
        if (!t) return;

        t.className = '';
        t.textContent = msg;
        if (type === 'error') t.classList.add('error');
        if (type === 'warn') t.classList.add('warn');
        t.classList.add('show');

        if (t._timer) clearTimeout(t._timer);
        t._timer = setTimeout(() => {
            t.classList.remove('show');
            setTimeout(() => { t.className = ''; t.textContent = ''; }, 300);
        }, 3000);
    },

    // --- Matemáticas y Formateo ---
    num: v => parseFloat(v) || 0,
    fmt: n => isFinite(Number(n)) ? Number(n).toFixed(2) : '0.00',
    truncate: (str, max) => String(str || '').length > max ? String(str).slice(0, max) + '…' : String(str),

    // --- Terminología configurable ---
    entity: (name, count = 1, capitalize = false) => {
        const entity = (CONFIG.entities || {})[name] || {};
        let label = count === 1 ? entity.singular : entity.plural;
        label = String(label || name || '');
        return capitalize && label ? label.charAt(0).toUpperCase() + label.slice(1) : label;
    },

    entityIcon: name => String((((CONFIG.entities || {})[name] || {}).icon) || ''),

    // Escapar datos externos antes de interpolarlos en plantillas HTML.
    escapeHTML: value => String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char])),

    // Se aceptan formatos habituales de Sheets (números, UUID y claves con
    // separadores), rechazando caracteres capaces de alterar HTML/JavaScript.
    validId: value => {
        const id = String(value ?? '').trim();
        return id.length > 0 && id.length <= 128 && !/[\u0000-\u001F\u007F<>"'`\\]/.test(id) ? id : '';
    },

    normalizePhone: value => {
        const config = CONFIG.phone || {};
        const countryCode = String(config.countryCode || CONFIG.whatsappPrefix || '').replace(/\D/g, '');
        const localPrefix = String(config.localPrefix || '0').replace(/\D/g, '');
        const mobilePrefix = String(config.mobilePrefix || '').replace(/\D/g, '');
        const localLength = Number(config.localLength) || 0;
        let digits = String(value ?? '').replace(/\D/g, '');

        if (digits.startsWith('00')) digits = digits.slice(2);
        if (countryCode && digits.startsWith(countryCode)) {
            digits = localPrefix + digits.slice(countryCode.length);
        }
        if (localLength && digits.length === localLength - localPrefix.length) {
            const nationalStart = mobilePrefix.slice(localPrefix.length);
            if (!nationalStart || digits.startsWith(nationalStart)) digits = localPrefix + digits;
        }
        return digits;
    },

    isValidPhone: value => {
        if (!String(value ?? '').trim()) return true;
        const normalized = Utils.normalizePhone(value);
        try {
            return new RegExp((CONFIG.phone || {}).pattern || '^\\d{7,15}$').test(normalized);
        } catch {
            return /^\d{7,15}$/.test(normalized);
        }
    },

    displayPhone: value => {
        const normalized = Utils.normalizePhone(value);
        return Utils.isValidPhone(normalized) ? normalized : String(value ?? '').trim();
    },

    // Devuelve sólo dígitos y evita esquemas/fragmentos controlados por datos.
    whatsappNumber: value => {
        let phone = Utils.normalizePhone(value);
        if (!phone) return '';
        const phoneConfig = CONFIG.phone || {};
        const prefix = String(phoneConfig.countryCode || CONFIG.whatsappPrefix || '').replace(/\D/g, '');
        const localPrefix = String(phoneConfig.localPrefix || '0').replace(/\D/g, '');
        if (localPrefix && phone.startsWith(localPrefix)) phone = phone.slice(localPrefix.length);
        if (prefix && !phone.startsWith(prefix)) phone = prefix + phone;
        return /^\d{7,15}$/.test(phone) ? phone : '';
    },

    // --- Fechas ---
    todayStr: () => new Date().toLocaleDateString('en-CA'), // YYYY-MM-DD en hora local
    dateAdd: (dateStr, days) => {
        const d = new Date(dateStr + 'T00:00:00');
        d.setDate(d.getDate() + days);
        return d.toISOString().split('T')[0];
    },
    fmtFecha: str => {
        if (!str) return '—';
        const [y, m, d] = (str + '').split('-');
        const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
        return `${d} ${meses[parseInt(m, 10) - 1]} ${y}`;
    },

    // --- Helpers de Negocio (leen DATA pero no lo modifican) ---
    clienteNombre: id => {
        const c = DATA.clientes.find(x => String(x.id) === String(id));
        return c ? c.nombre : Utils.entity('customer', 1, true) + ' #' + id;
    },

    estadoLabel: e => ((CONFIG.statusLabels || {})[e] || e)
};


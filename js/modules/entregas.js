// ============================================================
// js/modules/entregas.js — MÓDULO DE CALENDARIO / ENTREGAS
// ============================================================
// Gestiona la pantalla de Calendario: listado cronológico
// de pedidos separando vencidos de próximos.
// Depende de: api.js, store.js, utils.js
// ============================================================

const Entregas = {

    // --- Carga de Datos (READ) ---
    cargar: async () => {
        Utils.loading('lista-entregas');
        try {
            const [pedidos, clientes] = await Promise.all([API.read('pedidos'), API.read('clientes')]);
            DATA.pedidos  = pedidos;
            DATA.clientes = clientes;
            Entregas.render();
        } catch {
            Utils.showEl('lista-entregas', Utils.errorHtml());
        }
    },

    // --- Renderizado (VIEW) ---
    render: () => {
        const hoy    = Utils.todayStr();
        const activos = DATA.pedidos.filter(p => p.estado !== 'cancelado');
        const sorted  = activos.slice().sort((a, b) => a.fecha_entrega.localeCompare(b.fecha_entrega));

        if (!sorted.length) {
            Utils.showEl('lista-entregas', `<div class="empty"><span class="eicon">${Utils.escapeHTML(Utils.entityIcon('delivery'))}</span><p>No hay compromisos programados</p></div>`);
            return;
        }

        const vencidos = sorted.filter(p => p.fecha_entrega < hoy && p.estado !== 'entregado');
        const proximos = sorted.filter(p => p.fecha_entrega >= hoy && p.estado !== 'entregado');
        const finalizados = sorted.filter(p => p.estado === 'entregado').slice().reverse();

        let html = '';
        if (vencidos.length) {
            html += '<div class="section-title" style="color:var(--rose-soft)">⚠️ Pendientes fuera de fecha</div>';
            html += vencidos.map(p => Entregas._card(p, 'urgent')).join('');
        }
        if (proximos.length) {
            html += `<div class="section-title" style="margin-top:${vencidos.length ? '20px' : '0'}">${Utils.escapeHTML(Utils.entityIcon('delivery'))} ${(CONFIG.interface || {}).scheduleTitle || 'Agenda'} · ${Utils.escapeHTML(Utils.entity('delivery', 2))}</div>`;
            html += proximos.map(p => Entregas._card(p, p.fecha_entrega < Utils.dateAdd(hoy, 7) ? 'soon' : '')).join('');
        }
        if (finalizados.length) {
            html += '<div class="section-title" style="margin-top:20px">Compromisos finalizados</div>';
            html += finalizados.map(p => Entregas._card(p, '')).join('');
        }
        Utils.showEl('lista-entregas', html);
    },

    // --- Tarjeta de Entrega (Template) ---
    _card: (p, cls) => {
        const cli  = Utils.escapeHTML(Utils.clienteNombre(p.cliente_id));
        const deuda = Utils.num(p.deuda);
        const safeEstado = ['pendiente', 'en_proceso', 'listo', 'entregado', 'cancelado'].includes(p.estado)
            ? p.estado
            : 'pendiente';
        return `<div class="card${cls === 'urgent' ? ' urgent' : cls === 'soon' ? ' soon' : ''}">
            <div class="card-row">
                <div>
                    ${cls === 'urgent' ? '<div class="urgent-label">⚠️ Fuera de fecha</div>' : ''}
                    ${cls === 'soon'   ? '<div class="soon-label">🔔 Esta semana</div>' : ''}
                    <div class="cal-date">${Utils.escapeHTML(Utils.fmtFecha(p.fecha_entrega))}</div>
                    <div class="card-name" style="margin-top:3px">${cli}</div>
                </div>
                <span class="badge badge-${safeEstado}">${Utils.escapeHTML(Utils.estadoLabel(p.estado))}</span>
            </div>
            <div class="card-desc">${Utils.escapeHTML(Utils.truncate(p.descripcion, 70))}</div>
            <div class="finance-row">
                <span class="finance-total">${CONFIG.currencySymbol}${Utils.fmt(Utils.num(p.total))}</span>
                <span class="finance-deuda ${deuda <= 0 ? 'ok' : 'warn'}">${deuda <= 0 ? '✓ Pagado' : 'Debe ' + CONFIG.currencySymbol + Utils.fmt(deuda)}</span>
            </div>
        </div>`;
    }
};

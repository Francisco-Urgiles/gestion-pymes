// ============================================================
// js/modules/home.js — MÓDULO DEL DASHBOARD (Inicio)
// ============================================================
// Controla la pantalla principal: KPIs, gráfica y próximas
// entregas. Es el único módulo que mezcla datos de varias
// entidades porque necesita una visión global del negocio.
// Depende de: api.js, store.js, utils.js
// ============================================================

const Home = {

    cargar: async () => {
        try {
            await Subscription.refresh();
            if(!Subscription.state?.activo){
                Utils.showEl('home-entregas','<div class="empty">Servicio suspendido. El administrador puede descargar su respaldo desde esta pantalla.</div>');
                document.querySelector('.stats-section')?.setAttribute('hidden','');return;
            }
            const result=await API.post('bootstrap',{}, {preserveCache:true});
            if(!Session.isAuthenticated())return;
            Subscription.set(result.subscription);
            const d=result.dashboard,k=d.kpis;
            document.querySelector('.stats-section')?.removeAttribute('hidden');
            if(k){
                Utils.setText('stat-ingresos-totales',CONFIG.currencySymbol+Utils.fmt(k.total));
                Utils.setText('stat-pedidos-activos',d.activos);
                Utils.setText('stat-deuda-total',CONFIG.currencySymbol+Utils.fmt(k.debt));
                Utils.setText('tbl-cobrado-val',CONFIG.currencySymbol+Utils.fmt(k.collected));
                Utils.setText('tbl-pendiente-val',CONFIG.currencySymbol+Utils.fmt(k.debt));
                Utils.setText('tbl-total-val',CONFIG.currencySymbol+Utils.fmt(k.total));
                Utils.setText('tbl-cobrado-pct',(k.total?Math.round(k.collected/k.total*100):0)+'%');
                Utils.setText('tbl-pendiente-pct',(k.total?Math.round(k.debt/k.total*100):0)+'%');
                Utils.setText('donut-status-text',k.total?'Resumen de cobros':'Sin datos');
                if(typeof Chart!=='undefined')Home._dibujarDona(k.collected,k.debt);
            }
            Utils.showEl('home-entregas',d.entregas_proximas.map(p=>`<div class="card"><strong>${Utils.escapeHTML(p.cliente)}</strong><p>${Utils.escapeHTML(p.fecha_entrega)} · ${Utils.escapeHTML(p.descripcion)}</p></div>`).join('')||'<div class="empty">Sin pendientes próximos.</div>');
            if(d.entregas_total>30)document.getElementById('home-entregas').insertAdjacentHTML('beforeend','<p>Mostrando 30 compromisos. Consulta la agenda para ver todos.</p>');
        }catch(e){Utils.showEl('home-entregas','<div class="empty">'+Utils.escapeHTML(e.message)+'</div>');}
    },

    // --- KPIs y Gráfica ---
    renderKPIs: () => {
        const estadosActivos = ['pendiente', 'en_proceso', 'listo'];

        const total   = DATA.pedidos.reduce((s, p) => s + Utils.num(p.total), 0);
        const cobrado = DATA.pedidos.reduce((s, p) => s + Utils.num(p.total_pagado), 0);
        const deuda   = DATA.pedidos.reduce((s, p) => s + Utils.num(p.deuda), 0);
        const nAct    = DATA.pedidos.filter(p => estadosActivos.includes(p.estado)).length;

        // Mini tarjetas superiores
        Utils.setText('stat-ingresos-totales', CONFIG.currencySymbol + Utils.fmt(total));
        Utils.setText('stat-pedidos-activos', String(nAct));
        Utils.setText('stat-deuda-total', CONFIG.currencySymbol + Utils.fmt(deuda));

        // Tabla de la gráfica
        const pctCobrado   = total > 0 ? Math.round((cobrado / total) * 100) : 0;
        const pctPendiente = total > 0 ? Math.round((deuda   / total) * 100) : 0;
        Utils.setText('tbl-cobrado-val',   CONFIG.currencySymbol + Utils.fmt(cobrado));
        Utils.setText('tbl-cobrado-pct',   `${pctCobrado}% del total`);
        Utils.setText('tbl-pendiente-val', CONFIG.currencySymbol + Utils.fmt(deuda));
        Utils.setText('tbl-pendiente-pct', `${pctPendiente}% del total`);
        Utils.setText('tbl-total-val',     CONFIG.currencySymbol + Utils.fmt(total));

        // Estado central del donut
        const iconEl   = document.getElementById('donut-icon');
        const statusEl = document.getElementById('donut-status-text');
        if (iconEl && statusEl) {
            if (deuda <= 0 && total > 0) {
                iconEl.textContent  = '✅';
                statusEl.textContent = '100% SALDADO';
                statusEl.style.color = 'var(--sage-soft)';
            } else if (total === 0) {
                iconEl.textContent  = Utils.entityIcon('order');
                statusEl.textContent = 'SIN DATOS';
                statusEl.style.color = 'var(--text-muted)';
            } else {
                iconEl.textContent  = '⏳';
                statusEl.textContent = pctCobrado + '% COBRADO';
                statusEl.style.color = 'var(--rose-soft)';
            }
        }

        Home._dibujarDona(cobrado, deuda);
    },

    _dibujarDona: (cobrado, deuda) => {
        const canvas = document.getElementById('chartDonaNueva');
        if (!canvas) return;
        if (window._donaDashboard) window._donaDashboard.destroy();
        const styles = getComputedStyle(document.documentElement);
        const collectedColor = styles.getPropertyValue('--sage-soft').trim() || '#7dcca6';
        const pendingColor = styles.getPropertyValue('--rose-soft').trim() || '#e8909f';
        window._donaDashboard = new Chart(canvas.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: ['Cobrado', 'Pendiente'],
                datasets: [{ data: [cobrado, deuda], backgroundColor: [collectedColor, pendingColor], borderWidth: 0, hoverOffset: 4 }]
            },
            options: {
                cutout: '75%',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: true, callbacks: { label: ctx => ` ${CONFIG.currencySymbol}${Utils.fmt(ctx.raw)}` } }
                }
            }
        });
    },

    // --- Próximas Entregas ---
    renderEntregas: () => {
        const hoy  = Utils.todayStr();
        const en7  = Utils.dateAdd(hoy, 7);
        const en14 = Utils.dateAdd(hoy, 14);

        const activos  = DATA.pedidos.filter(p => !['entregado', 'cancelado'].includes(p.estado));
        const proximos = activos
            .filter(p => p.fecha_entrega >= hoy && p.fecha_entrega <= en14)
            .sort((a, b) => a.fecha_entrega.localeCompare(b.fecha_entrega))
            .slice(0, 6);
        const vencidos = activos.filter(p => p.fecha_entrega < hoy);

        if (!proximos.length && !vencidos.length) {
            Utils.showEl('home-entregas', '<div class="empty"><span class="eicon">🎉</span><p>Sin pendientes urgentes</p></div>');
            return;
        }

        let html = '';
        if (vencidos.length) {
            html += `<div class="section-title" style="color:var(--rose-soft);font-size:.85rem;margin-bottom:8px">⚠️ Fuera de fecha (${vencidos.length})</div>`;
            html += '<div class="cal-grid">' + vencidos.map(p => Home._calCard(p, 'urgent')).join('') + '</div>';
        }
        if (proximos.length) {
            html += `<div class="section-title" style="font-size:.85rem;margin-bottom:8px">${Utils.escapeHTML(Utils.entityIcon('delivery'))} Próximos 14 días</div>`;
            html += '<div class="cal-grid">' + proximos.map(p => Home._calCard(p, p.fecha_entrega <= en7 ? 'soon' : '')).join('') + '</div>';
        }
        Utils.showEl('home-entregas', html);
    },

    _calCard: (p, cls) => {
        const cli = Utils.escapeHTML(Utils.clienteNombre(p.cliente_id));
        return `<div class="cal-card ${cls === 'urgent' ? 'card urgent' : cls === 'soon' ? 'card soon' : 'card'}" style="margin-bottom:0">
            ${cls === 'urgent' ? '<div class="urgent-label">⚠️ Fuera de fecha</div>' : ''}
            ${cls === 'soon'   ? '<div class="soon-label">Próximo</div>' : ''}
            <div class="cal-date">${Utils.escapeHTML(Utils.fmtFecha(p.fecha_entrega))}</div>
            <div class="cal-name">${cli}</div>
            <div class="cal-desc">${Utils.escapeHTML(Utils.truncate(p.descripcion, 45))}</div>
        </div>`;
    }
};


// ============================================================
// js/modules/pedidos.js — MÓDULO DE PEDIDOS
// ============================================================
// Los datos de Sheets se escapan antes de formar HTML. Los eventos dinámicos
// utilizan data-* y addEventListener; nunca generan JavaScript con IDs externos.
// ============================================================

const Pedidos = {
    cargar: async () => {
        Utils.loading('lista-pedidos');
        try {
            const [pedidos, clientes] = await Promise.all([
                API.read('pedidos'),
                API.read('clientes')
            ]);
            DATA.pedidos  = pedidos;
            DATA.clientes = clientes;
            Pedidos.render();
        } catch {
            Utils.showEl('lista-pedidos', Utils.errorHtml());
        }
    },

    render: () => {
        const query = Utils.val('search-pedidos').toLowerCase();
        const filter = FILTROS.ped;

        const items = DATA.pedidos.filter(pedido => {
            const cliente = Utils.clienteNombre(pedido.cliente_id).toLowerCase();
            const matchesQuery = !query || cliente.includes(query) || String(pedido.descripcion || '').toLowerCase().includes(query);
            const matchesFilter = filter === 'todos' || pedido.estado === filter;
            return matchesQuery && matchesFilter;
        }).slice().reverse();

        if (!items.length) {
            Utils.showEl('lista-pedidos', `<div class="empty"><span class="eicon">${Utils.escapeHTML(Utils.entityIcon('order'))}</span><p>No hay registros de ${Utils.escapeHTML(Utils.entity('order', 2))}</p></div>`);
            return;
        }

        Utils.showEl('lista-pedidos', items.map(Pedidos._card).join(''));
        Pedidos._bindEvents();
    },

    _card: pedido => {
        const id = Utils.validId(pedido.id);
        if (!id) return '';

        const cliente  = Utils.escapeHTML(Utils.clienteNombre(pedido.cliente_id));
        const total    = Utils.num(pedido.total);
        const pagado   = Utils.num(pedido.total_pagado);
        const deuda    = Utils.num(pedido.deuda);
        const pct      = total > 0 ? Math.min(100, Math.max(0, (pagado / total) * 100)) : 0;
        const pagadoOk = deuda <= 0;
        const vencido  = !['entregado', 'cancelado'].includes(pedido.estado) && pedido.fecha_entrega < Utils.todayStr();
        const estado   = ['pendiente', 'en_proceso', 'listo', 'entregado', 'cancelado'].includes(pedido.estado)
            ? pedido.estado
            : 'pendiente';

        return `<div class="card pedido-card${vencido ? ' urgent' : ''}" data-pedido-id="${Utils.escapeHTML(id)}">
            <div class="card-row">
                <div class="card-name">${cliente}</div>
                <span class="badge badge-${estado}">${Utils.escapeHTML(Utils.estadoLabel(pedido.estado))}</span>
            </div>
            ${vencido ? '<div class="urgent-label" style="margin-top:4px">⚠️ Fuera de fecha</div>' : ''}
            <div class="card-desc">${Utils.escapeHTML(Utils.truncate(pedido.descripcion, 80))}</div>
            <div class="meta-row">
                <span class="meta-pill">${Utils.escapeHTML(Utils.entityIcon('delivery'))} ${Utils.escapeHTML(Utils.entity('delivery', 1, true))}: ${Utils.escapeHTML(Utils.fmtFecha(pedido.fecha_entrega))}</span>
                <span class="meta-pill">📋 ${Utils.escapeHTML(pedido.fecha_creacion)}</span>
                <span class="badge ${pagadoOk ? 'badge-pagado' : 'badge-deuda'}" style="font-size:.62rem">${pagadoOk ? '✓ Pagado' : 'Con deuda'}</span>
            </div>
            <div class="progress-track"><div class="progress-fill ${pagadoOk ? 'full' : ''}" style="width:${pct}%"></div></div>
            <div class="finance-row">
                <div class="finance-total">Total: <strong>${CONFIG.currencySymbol}${Utils.fmt(total)}</strong> · Abonado: <strong>${CONFIG.currencySymbol}${Utils.fmt(pagado)}</strong></div>
                <div class="finance-deuda ${pagadoOk ? 'ok' : 'warn'}">${pagadoOk ? '✓ Saldado' : 'Debe ' + CONFIG.currencySymbol + Utils.fmt(deuda)}</div>
            </div>
            <div class="card-actions">
                <button class="btn-sm admin-only" data-action="abonar">+ ${Utils.escapeHTML(Utils.entity('installment', 1, true))}</button>
                <button class="btn-sm" data-action="editar">✎ Editar</button>
                <button class="btn-sm admin-only" data-action="pagos">${Utils.escapeHTML(Utils.entityIcon('payment'))} ${Utils.escapeHTML(Utils.entity('payment', 2, true))}</button>
            </div>
            <button class="accordion-toggle admin-only" data-action="pagos">
                <span>Ver ${Utils.escapeHTML(Utils.entity('installment', 2))}</span><span class="arrow">▾</span>
            </button>
            <div class="accordion-body">
                <div class="pagos-list"><div class="loading" style="padding:12px"><div class="spinner"></div></div></div>
            </div>
        </div>`;
    },

    _bindEvents: () => {
        document.querySelectorAll('.pedido-card [data-action]').forEach(button => {
            button.addEventListener('click', () => {
                const card = button.closest('.pedido-card');
                if (!card) return;
                const id = card.dataset.pedidoId;
                const action = button.dataset.action;
                if (action === 'editar') Pedidos.editar(id);
                if (action === 'abonar') Pedidos.abonar(id);
                if (action === 'pagos')  Pedidos.togglePagos(id, card);
            });
        });
    },

    guardar: async () => {
        const rawEditId = Utils.val('ped-edit-id');
        const editId    = rawEditId ? Utils.validId(rawEditId) : '';
        const clienteId = Utils.validId(Utils.val('ped-cliente'));
        const desc      = Utils.val('ped-desc').trim();
        const fecha     = Utils.val('ped-fentrega');
        const estado    = Utils.val('ped-estado');
        const total     = Utils.val('ped-total');
        const notas     = Utils.val('ped-notas').trim();

        if (rawEditId && !editId) return Utils.toast('Identificador no válido', 'error');
        if (!clienteId || !desc || !fecha || !total) {
            return Utils.toast('Completa los campos obligatorios (*)', 'error');
        }
        if (!['pendiente', 'en_proceso', 'listo', 'entregado', 'cancelado'].includes(estado)) {
            return Utils.toast('El estado seleccionado no es válido', 'error');
        }

        const parsedTotal = Number(total);
        if (!Number.isFinite(parsedTotal) || parsedTotal < 0) {
            return Utils.toast('Ingresa un total válido', 'error');
        }

        const btn = document.getElementById('btn-guardar-pedido');
        Utils.setLoading(btn, true, 'Guardando...');
        const payload = {
            id: editId || null,
            cliente_id: clienteId,
            descripcion: desc,
            fecha_entrega: fecha,
            estado,
            total: parsedTotal,
            notas
        };

        try {
            if (editId) {
                await API.post('pedidos_update', payload);
                Utils.toast('✓ Cambios guardados correctamente');
            } else {
                await API.post('pedidos', payload);
                Utils.toast('✓ Registro guardado correctamente');
            }
            UI.closeModal('modal-pedido');
            await Pedidos.cargar();
            Home.cargar();
        } catch (error) {
            Utils.toast(error.message || 'Error al guardar', 'error');
        } finally {
            Utils.setLoading(btn, false, editId ? '✓ Guardar cambios' : `✓ Guardar ${Utils.entity('order')}`);
        }
    },

    editar: async pedidoId => {
        pedidoId = Utils.validId(pedidoId);
        if (!pedidoId) return Utils.toast('Identificador no válido', 'error');
        const pedido = DATA.pedidos.find(item => String(item.id) === pedidoId);
        if (!pedido) return;

        document.getElementById('modal-pedido-title').textContent = `Editar ${Utils.entity('order')}`;
        document.getElementById('ped-edit-id').value  = pedido.id;
        document.getElementById('ped-desc').value     = pedido.descripcion || '';
        document.getElementById('ped-fentrega').value = pedido.fecha_entrega || '';
        document.getElementById('ped-estado').value   = pedido.estado || 'pendiente';
        document.getElementById('ped-total').value    = pedido.total || '';
        document.getElementById('ped-notas').value    = pedido.notas || '';
        document.getElementById('btn-guardar-pedido').textContent = '✓ Guardar cambios';

        await UI.openModal('modal-pedido');
        setTimeout(() => {
            const select = document.getElementById('ped-cliente');
            if (select) select.value = String(pedido.cliente_id);
        }, 50);
    },

    abonar: async pedidoId => {
        if (Session.getRole() !== 'admin') {
            return Utils.toast('No tienes permisos para registrar pagos.', 'error');
        }
        pedidoId = Utils.validId(pedidoId);
        if (!pedidoId) return Utils.toast('Identificador no válido', 'error');
        await UI.openModal('modal-pago');
        setTimeout(() => {
            const select = document.getElementById('pag-pedido');
            if (select) select.value = pedidoId;
        }, 80);
    },

    togglePagos: async (pedidoId, card = null) => {
        if (Session.getRole() !== 'admin') {
            return Utils.toast('No tienes permisos para consultar pagos.', 'error');
        }
        pedidoId = Utils.validId(pedidoId);
        if (!pedidoId) return Utils.toast('Identificador no válido', 'error');

        if (!card) {
            card = Array.from(document.querySelectorAll('.pedido-card'))
                .find(item => item.dataset.pedidoId === pedidoId);
        }
        if (!card) return;

        const body = card.querySelector('.accordion-body');
        const toggles = card.querySelectorAll('[data-action="pagos"]');
        const container = card.querySelector('.pagos-list');
        if (!body || !container) return;

        const isOpen = body.classList.contains('open');
        body.classList.toggle('open', !isOpen);
        toggles.forEach(toggle => toggle.classList.toggle('open', !isOpen));
        if (isOpen) return;

        container.innerHTML = '<div class="loading" style="padding:12px"><div class="spinner"></div></div>';
        try {
            const pagos = await API.read('pagos', { id: pedidoId });
            if (!pagos.length) {
                    container.innerHTML = `<div style="font-size:.8rem;color:var(--text-muted);padding:8px 0">Sin ${Utils.escapeHTML(Utils.entity('payment', 2))} registrados</div>`;
                return;
            }

            const icons = { efectivo: '💵', transferencia: '🏦', tarjeta: '💳', otro: '📌' };
            container.innerHTML = pagos.map(pago => {
                const metodo = ['efectivo', 'transferencia', 'tarjeta', 'otro'].includes(pago.metodo)
                    ? pago.metodo
                    : 'otro';
                return `<div class="pago-row">
                    <div>
                        <div class="pago-monto">${icons[metodo]} ${CONFIG.currencySymbol}${Utils.fmt(Utils.num(pago.monto))}</div>
                        <div class="pago-meta">${Utils.escapeHTML(pago.fecha)}${pago.notas ? ' · ' + Utils.escapeHTML(pago.notas) : ''}</div>
                    </div>
                    <span class="metodo-tag">${Utils.escapeHTML(metodo)}</span>
                </div>`;
            }).join('');
        } catch {
            container.innerHTML = '<div style="font-size:.8rem;color:var(--rose-soft);padding:8px 0">Error al cargar pagos</div>';
        }
    }
};


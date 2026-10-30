// ============================================================
// js/modules/pagos.js — MÓDULO DE PAGOS / ABONOS
// ============================================================
// Gestiona la pantalla de Pagos: listar historial de abonos
// y registrar un nuevo abono a un pedido.
// Depende de: api.js, store.js, utils.js, modules/ui.js
// ============================================================

const Pagos = {

    // --- Carga de Datos (READ) ---
    cargar: async () => {
        // CONTROL VISUAL ÚNICAMENTE. El backend debe rechazar a employee.
        if (Session.getRole() !== 'admin') {
            return Utils.toast('No tienes permisos para consultar pagos.', 'error');
        }
        Utils.loading('lista-pagos');
        try {
            const [pagos, pedidos, clientes] = await Promise.all([
                API.read('pagos'),
                API.read('pedidos'),
                API.read('clientes')
            ]);
            DATA.pagos    = pagos;
            DATA.pedidos  = pedidos;
            DATA.clientes = clientes;
            Pagos.render();
        } catch {
            Utils.showEl('lista-pagos', Utils.errorHtml());
        }
    },

    // --- Renderizado (VIEW) ---
    render: () => {
        if (!DATA.pagos.length) {
            Utils.showEl('lista-pagos', `<div class="empty"><span class="eicon">${Utils.escapeHTML(Utils.entityIcon('payment'))}</span><p>No hay registros de ${Utils.escapeHTML(Utils.entity('payment', 2))}</p></div>`);
            return;
        }
        const icons  = { efectivo: '💵', transferencia: '🏦', tarjeta: '💳', otro: '📌' };
        const sorted = DATA.pagos.slice().reverse(); // Más recientes primero

        Utils.showEl('lista-pagos', sorted.map(p => {
            const ped = DATA.pedidos.find(x => String(x.id) === String(p.pedido_id));
            const cli = Utils.escapeHTML(ped ? Utils.clienteNombre(ped.cliente_id) : '—');
            const metodo = ['efectivo', 'transferencia', 'tarjeta', 'otro'].includes(p.metodo)
                ? p.metodo
                : 'otro';
            return `<div class="card">
                <div class="card-row">
                    <div class="card-name">${icons[metodo] || '💵'} ${CONFIG.currencySymbol}${Utils.fmt(Utils.num(p.monto))}</div>
                    <span class="meta-pill">${Utils.escapeHTML(p.fecha)}</span>
                </div>
                <div class="meta-row">
                    <span class="meta-pill">${Utils.escapeHTML(Utils.entityIcon('customer'))} ${cli}</span>
                    <span class="metodo-tag">${Utils.escapeHTML(metodo)}</span>
                    ${p.notas ? `<span class="meta-pill">${Utils.escapeHTML(p.notas)}</span>` : ''}
                </div>
            </div>`;
        }).join(''));
    },

    // --- Escritura (CREATE) ---
    guardar: async () => {
        // CONTROL VISUAL ÚNICAMENTE. El backend debe validar el rol real.
        if (Session.getRole() !== 'admin') {
            return Utils.toast('No tienes permisos para registrar pagos.', 'error');
        }
        const pedidoId = Utils.validId(Utils.val('pag-pedido'));
        const monto    = Utils.val('pag-monto');
        const metodo   = Utils.val('pag-metodo');
        const fecha    = Utils.val('pag-fecha');
        const notas    = Utils.val('pag-notas').trim();

        if (!pedidoId || !monto) return Utils.toast(`Selecciona ${Utils.entity('order')} e ingresa el monto`, 'error');
        if (parseFloat(monto) <= 0) return Utils.toast('El monto debe ser mayor a 0', 'error');

        const btn = document.getElementById('btn-guardar-pago');
        Utils.setLoading(btn, true, 'Guardando...');

        try {
            const payload = {
                pedido_id: pedidoId,
                monto:     parseFloat(monto),
                metodo,
                fecha:     fecha || Utils.todayStr(),
                notas
            };
            const signature=JSON.stringify(payload);
            let pending;try{pending=JSON.parse(sessionStorage.getItem('pending_payment')||'null');}catch{}
            if(!pending||pending.signature!==signature){pending={signature,id:crypto.randomUUID()};sessionStorage.setItem('pending_payment',JSON.stringify(pending));}
            const res=await API.post('pagos',{...payload,request_id:pending.id});
            sessionStorage.removeItem('pending_payment');
            UI.closeModal('modal-pago');
            Utils.clearFields(['pag-pedido', 'pag-monto', 'pag-notas']);
            Utils.toast(`✓ Registro guardado · Saldo restante: ${CONFIG.currencySymbol}${Utils.fmt(res.deuda)}`);

            // Refrescar pagos, pedidos y KPIs en paralelo
            await Promise.all([Pagos.cargar(), Pedidos.cargar()]);
            Home.cargar();
        } catch (e) {
            Utils.toast(e.message || 'Error al guardar', 'error');
        }
        Utils.setLoading(btn, false, `✓ Registrar ${Utils.entity('payment')}`);
    }
};


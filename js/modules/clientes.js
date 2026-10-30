// ============================================================
// js/modules/clientes.js — MÓDULO DE CLIENTES
// ============================================================
// Gestiona la pantalla de Clientes: listar, buscar, crear, editar y eliminar
// y saltar a los pedidos de un cliente.
// Depende de: api.js, store.js, utils.js, modules/ui.js
// ============================================================

const Clientes = {

    // --- Carga de Datos (READ) ---
    cargar: async () => {
        Utils.loading('lista-clientes');
        try {
            // Cargar también pedidos para contar cuántos tiene cada cliente
            const [clientes, pedidos] = await Promise.all([API.read('clientes'), API.read('pedidos')]);
            DATA.clientes = clientes;
            DATA.pedidos  = pedidos;
            Clientes.render();
        } catch {
            Utils.showEl('lista-clientes', Utils.errorHtml());
        }
    },

    // --- Renderizado (VIEW) ---
    render: () => {
        const q = Utils.val('search-clientes').trim().toLowerCase();
        const phoneQuery = q.replace(/\D/g, '');
        const items = DATA.clientes.filter(c => {
            const n = (c.nombre   || '').toLowerCase();
            const rawPhone = (c.telefono || '').toString().replace(/\D/g, '');
            const normalizedPhone = Utils.normalizePhone(c.telefono);
            const matchesPhone = phoneQuery && (
                normalizedPhone.includes(phoneQuery) ||
                rawPhone.includes(phoneQuery) ||
                Utils.whatsappNumber(c.telefono).includes(phoneQuery)
            );
            return !q || n.includes(q) || matchesPhone;
        });

        if (!items.length) {
            Utils.showEl('lista-clientes', `<div class="empty"><span class="eicon">${Utils.escapeHTML(Utils.entityIcon('customer'))}</span><p>No hay registros de ${Utils.escapeHTML(Utils.entity('customer', 2))}</p></div>`);
            return;
        }

        Utils.showEl('lista-clientes', items.map(c => {
            const id         = Utils.validId(c.id);
            if (!id) return '';
            const tel        = (c.telefono || '').toString();
            const displayTel = Utils.displayPhone(tel);
            const whatsapp   = Utils.whatsappNumber(tel);
            const pedidosCli = DATA.pedidos.filter(p => String(p.cliente_id) === String(c.id));

            return `<div class="card cliente-card" data-cliente-id="${Utils.escapeHTML(id)}">
                <div class="card-row">
                    <div class="card-name">${Utils.escapeHTML(Utils.entityIcon('customer'))} ${Utils.escapeHTML(c.nombre)}</div>
                    <span class="meta-pill">${pedidosCli.length} ${Utils.escapeHTML(Utils.entity('order', pedidosCli.length))}</span>
                </div>
                ${tel ? `<div class="meta-row"><span class="meta-pill">📞 ${Utils.escapeHTML(displayTel)}</span></div>` : ''}
                ${c.observaciones ? `<div class="card-desc" style="margin-top:6px">${Utils.escapeHTML(c.observaciones)}</div>` : ''}
                <div class="card-actions">
                    ${whatsapp ? `<a href="https://wa.me/${whatsapp}" target="_blank" rel="noopener noreferrer" style="flex:1;text-decoration:none">
                        <button class="btn-sm sage" style="width:100%">💬 WhatsApp</button>
                    </a>` : ''}
                    <button class="btn-sm" data-action="ver-pedidos">${Utils.escapeHTML(Utils.entityIcon('order'))} Ver ${Utils.escapeHTML(Utils.entity('order', 2))}</button>
                    <button class="btn-sm" data-action="editar">Editar</button>
                    <button class="btn-sm danger admin-only" data-action="eliminar">Eliminar</button>
                </div>
            </div>`;
        }).join(''));
        Clientes._bindEvents();
    },

    _bindEvents: () => {
        document.querySelectorAll('.cliente-card [data-action]').forEach(button => {
            button.addEventListener('click', () => {
                const card = button.closest('.cliente-card');
                if (!card) return;
                if (button.dataset.action === 'ver-pedidos') Clientes.verPedidos(card.dataset.clienteId);
                if (button.dataset.action === 'editar') Clientes.editar(card.dataset.clienteId);
                if (button.dataset.action === 'eliminar') Clientes.eliminar(card.dataset.clienteId, button);
            });
        });
    },

    resetForm: () => {
        Utils.clearFields(['cli-edit-id', 'cli-nombre', 'cli-tel', 'cli-obs']);
        Utils.setText('modal-cliente-title', `Agregar ${Utils.entity('customer')}`);
        const button = document.getElementById('btn-guardar-cliente');
        if (button) button.textContent = `✓ Guardar ${Utils.entity('customer')}`;
    },

    nuevo: () => {
        Clientes.resetForm();
        UI.openModal('modal-cliente');
    },

    editar: clienteId => {
        clienteId = Utils.validId(clienteId);
        if (!clienteId) return Utils.toast('Identificador no válido.', 'error');

        const cliente = DATA.clientes.find(item => String(item.id) === clienteId);
        if (!cliente) return Utils.toast('Cliente no encontrado.', 'error');

        Clientes.resetForm();
        document.getElementById('cli-edit-id').value = clienteId;
        document.getElementById('cli-nombre').value = String(cliente.nombre || '');
        document.getElementById('cli-tel').value = Utils.displayPhone(cliente.telefono || '');
        document.getElementById('cli-obs').value = String(cliente.observaciones || '');
        Utils.setText('modal-cliente-title', `Editar ${Utils.entity('customer')}`);
        const button = document.getElementById('btn-guardar-cliente');
        if (button) button.textContent = '✓ Guardar cambios';
        UI.openModal('modal-cliente');
    },

    // --- Escritura (CREATE / UPDATE) ---
    guardar: async () => {
        const editId = Utils.validId(Utils.val('cli-edit-id'));
        const nombre = Utils.val('cli-nombre').trim();
        const telRaw = Utils.val('cli-tel').trim();
        const tel    = Utils.normalizePhone(telRaw);
        const obs    = Utils.val('cli-obs').trim();

        if (nombre.length < 2 || nombre.length > 200) {
            return Utils.toast('El nombre debe tener entre 2 y 200 caracteres.', 'error');
        }
        if (!Utils.isValidPhone(telRaw)) {
            return Utils.toast((CONFIG.phone || {}).validationMessage || 'El teléfono no tiene un formato válido.', 'error');
        }
        if (obs.length > 2000) return Utils.toast('Las notas no pueden superar 2000 caracteres.', 'error');

        const btn = document.getElementById('btn-guardar-cliente');
        Utils.setLoading(btn, true, 'Guardando...');

        try {
            const route = editId ? 'clientes_update' : 'clientes';
            await API.post(route, { id: editId, nombre, telefono: tel, observaciones: obs });
            UI.closeModal('modal-cliente');
            Utils.toast(editId ? '✓ Cliente actualizado correctamente' : '✓ Registro guardado correctamente');
            await Clientes.cargar();
        } catch (e) {
            const routeMissing = editId && e && (
                e.code === 404 || /ruta no encontrada|route_not_found/i.test(e.message || '')
            );
            Utils.toast(
                routeMissing
                    ? 'El backend publicado todavía no incluye la edición de clientes.'
                    : (e.message || 'Error al guardar'),
                'error'
            );
        }
        Utils.setLoading(btn, false, editId ? '✓ Guardar cambios' : `✓ Guardar ${Utils.entity('customer')}`);
    },

    eliminar: async (clienteId, button) => {
        if (Session.getRole() !== 'admin') {
            return Utils.toast('No tienes permisos para eliminar clientes.', 'error');
        }
        clienteId = Utils.validId(clienteId);
        if (!clienteId) return Utils.toast('Identificador no válido.', 'error');

        const cliente = DATA.clientes.find(item => String(item.id) === clienteId);
        if (!cliente) return;
        const related = DATA.pedidos.filter(order => String(order.cliente_id) === clienteId).length;
        if (related > 0) {
            return Utils.toast(`No se puede eliminar: tiene ${related} registros asociados (${Utils.entity('order', related)}).`, 'warn');
        }
        if (!window.confirm(`¿Eliminar definitivamente a ${cliente.nombre}?`)) return;

        Utils.setLoading(button, true, 'Eliminando...');
        try {
            await API.post('clientes_delete', { id: clienteId });
            Utils.toast('Cliente eliminado correctamente.');
            await Clientes.cargar();
        } catch (error) {
            const routeMissing = error && (
                error.code === 404 ||
                /ruta no encontrada|route_not_found/i.test(error.message || '')
            );
            Utils.toast(
                routeMissing
                    ? 'El backend publicado todavía no incluye la eliminación de clientes.'
                    : (error.message || 'No fue posible eliminar el cliente.'),
                'error'
            );
            Utils.setLoading(button, false, 'Eliminar');
        }
    },

    // --- Acción: Ver pedidos de un cliente específico ---
    verPedidos: (clienteId) => {
        clienteId = Utils.validId(clienteId);
        if (!clienteId) return Utils.toast('Identificador no válido', 'error');
        FILTROS.ped = 'todos';
        document.querySelectorAll('.chips .chip').forEach((c, i) => c.classList.toggle('active', i === 0));
        Router.goTo('pedidos');
        setTimeout(() => {
            const cli = DATA.clientes.find(c => String(c.id) === String(clienteId));
            if (cli) {
                const input = document.getElementById('search-pedidos');
                if (input) { input.value = cli.nombre; Pedidos.render(); }
            }
        }, 100);
    }
};


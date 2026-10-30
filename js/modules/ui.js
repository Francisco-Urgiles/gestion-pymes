// ============================================================
// js/modules/ui.js — CONTROLADOR DE INTERFAZ GENÉRICA
// ============================================================
// Gestiona modales, chips de filtro y selects dinámicos.
// No sabe nada de negocio. Solo manipula el DOM.
// Depende de: utils.js, store.js
// ============================================================

const UI = {

    // Aplica marca y terminología sin alterar nombres de endpoints o campos.
    applyBusinessConfig: (businessName = CONFIG.clientName) => {
        const order       = Utils.entity('order');
        const orders      = Utils.entity('order', 2);
        const customer    = Utils.entity('customer');
        const customers   = Utils.entity('customer', 2);
        const payments    = Utils.entity('payment', 2);
        const installment = Utils.entity('installment');
        const delivery    = Utils.entity('delivery');
        const deliveries  = Utils.entity('delivery', 2);
        const cap = value => value ? value.charAt(0).toUpperCase() + value.slice(1) : '';
        const orderConfig = (CONFIG.entities || {}).order || {};
        const interfaceConfig = CONFIG.interface || {};

        const themeVariables = {
            background: '--ink',
            surface: '--ink2',
            surfaceAlt: '--ink3',
            primary: '--rose',
            primarySoft: '--rose-soft',
            accent: '--gold',
            accentSoft: '--gold-soft',
            success: '--sage',
            successSoft: '--sage-soft'
        };
        Object.entries(CONFIG.theme || {}).forEach(([key, value]) => {
            if (themeVariables[key] && value) {
                document.documentElement.style.setProperty(themeVariables[key], value);
            }
        });

        const texts = {
            appBrand: CONFIG.appBrand,
            loginTitle: CONFIG.loginTitle,
            loginSubtitle: CONFIG.loginSubtitle,
            workspaceLabel: interfaceConfig.workspaceLabel || 'Centro de gestión',
            dashboardTitle: interfaceConfig.dashboardTitle || 'Resumen del negocio',
            dashboardSubtitle: interfaceConfig.dashboardSubtitle || 'Actividad operativa y financiera',
            quickActionsTitle: interfaceConfig.quickActionsTitle || 'Acciones rápidas',
            orderIcon: Utils.entityIcon('order'),
            customerIcon: Utils.entityIcon('customer'),
            paymentIcon: Utils.entityIcon('payment'),
            deliveryIcon: Utils.entityIcon('delivery'),
            dashboardTotal: (CONFIG.dashboard || {}).totalLabel || 'Valor total',
            activeOrders: (CONFIG.dashboard || {}).activeLabel || `${cap(orders)} en curso`,
            dashboardOutstanding: (CONFIG.dashboard || {}).outstandingLabel || 'Saldo pendiente',
            dashboardGenerated: (CONFIG.dashboard || {}).generatedLabel || 'Total registrado',
            paymentDistribution: `📊 ${(CONFIG.dashboard || {}).paymentsChartLabel || `Distribución de ${payments}`}`,
            upcomingDeliveries: `${interfaceConfig.scheduleTitle || 'Agenda'} · ${deliveries}`,
            ordersTitle: `${Utils.entityIcon('order')} ${cap(orders)}`,
            customersTitle: `${Utils.entityIcon('customer')} ${cap(customers)}`,
            paymentsTitle: `${Utils.entityIcon('payment')} ${cap(payments)}`,
            scheduleTitle: `${Utils.entityIcon('delivery')} ${interfaceConfig.scheduleTitle || 'Agenda'}`,
            quickNewOrder: `Agregar ${order}`,
            quickNewCustomer: `Agregar ${customer}`,
            quickNewPayment: `Registrar ${Utils.entity('payment')}`,
            quickOpenSchedule: `Ver ${interfaceConfig.scheduleTitle || 'agenda'}`,
            addOrderShort: `+ Agregar`,
            addCustomerShort: `+ Agregar`,
            newInstallment: `+ ${cap(installment)}`,
            ordersNav: cap(orders),
            customersNav: cap(customers),
            paymentsNav: cap(payments),
            scheduleNav: interfaceConfig.scheduleNav || 'Agenda',
            newOrderTitle: `Agregar ${order}`,
            customerRequired: `${cap(customer)} *`,
            orderDescriptionRequired: `${orderConfig.descriptionLabel || 'Descripción'} *`,
            deliveryDateRequired: `${interfaceConfig.dateLabel || `Fecha de ${delivery}`} *`,
            orderTotalRequired: `Total (${CONFIG.currencySymbol}) *`,
            paymentAmountRequired: `Monto (${CONFIG.currencySymbol}) *`,
            createOrder: `✓ Guardar ${order}`,
            newCustomerTitle: `Agregar ${customer}`,
            customerNameRequired: `${interfaceConfig.customerNameLabel || 'Nombre o razón social'} *`,
            customerPhoneLabel: interfaceConfig.customerPhoneLabel || 'Teléfono o contacto',
            customerNotesLabel: interfaceConfig.customerNotesLabel || 'Notas',
            saveCustomer: `✓ Guardar ${customer}`,
            registerInstallmentTitle: `Registrar ${installment}`,
            orderRequired: `${cap(order)} *`,
            registerPayment: `✓ Registrar ${Utils.entity('payment')}`
        };

        Object.entries(texts).forEach(([key, value]) => {
            document.querySelectorAll(`[data-config-text="${key}"]`)
                .forEach(element => { element.textContent = String(value || ''); });
        });

        const placeholders = {
            orderSearch: `Buscar ${order} o ${customer}...`,
            customerSearch: `Buscar ${customer} por nombre o teléfono...`,
            customerName: interfaceConfig.customerNamePlaceholder || 'Persona, empresa o referencia',
            customerPhone: ((CONFIG.phone || {}).example) || interfaceConfig.customerPhonePlaceholder || 'Número con código de país',
            orderDescription: orderConfig.descriptionPlaceholder || 'Describe el producto o servicio...',
            orderNotes: orderConfig.notesPlaceholder || 'Información adicional...',
            customerNotes: (((CONFIG.entities || {}).customer || {}).notesPlaceholder) || 'Preferencias o información útil...'
        };
        Object.entries(placeholders).forEach(([key, value]) => {
            document.querySelectorAll(`[data-config-placeholder="${key}"]`)
                .forEach(element => { element.placeholder = value; });
        });

        document.querySelectorAll('[data-status]').forEach(element => {
            element.textContent = Utils.estadoLabel(element.dataset.status);
        });

        document.title = `${businessName || CONFIG.clientName} · ${CONFIG.appTitle}`;
        Utils.setText('hero-client-name', businessName || CONFIG.clientName);
        Utils.setText('hero-client-subtitle', CONFIG.clientSubtitle);

        Router.titles.pedidos  = cap(orders);
        Router.titles.clientes = cap(customers);
        Router.titles.pagos    = cap(payments);
        Router.titles.entregas = interfaceConfig.scheduleTitle || 'Agenda';
    },

    // --- Modales ---
    openModal: async (id) => {
        if(['modal-pedido','modal-pago'].includes(id)){
            try{[DATA.clientes,DATA.pedidos]=await Promise.all([API.read('clientes'),API.read('pedidos')]);}catch(e){Utils.toast(e.message,'error');return;}
        }
        // Preparar datos antes de abrir
        if (id === 'modal-pedido') {
            UI._poblarSelectClientes();
            const dateInput = document.getElementById('ped-fentrega');
            if (dateInput && !dateInput.value) dateInput.value = Utils.todayStr();
        }
        if (id === 'modal-pago')   UI._poblarSelectPedidos();

        const m = document.getElementById(id);
        if (m) {
            m.classList.add('open');
            document.body.style.overflow = 'hidden';
        }
    },

    closeModal: (id) => {
        const m = document.getElementById(id);
        if (m) {
            m.classList.remove('open');
            document.body.style.overflow = '';
        }
        if (id === 'modal-pedido') UI._resetPedidoForm();
        if (id === 'modal-cliente' && typeof Clientes !== 'undefined') Clientes.resetForm();
    },

    // Inicializa el cierre de modales al hacer clic fuera de ellos
    initModals: () => {
        document.querySelectorAll('.modal-overlay').forEach(ov => {
            ov.addEventListener('click', e => {
                if (e.target === ov) UI.closeModal(ov.id);
            });
        });
    },

    resetForLogout: () => {
        Reportes.reset();
        Search.close();
        document.querySelectorAll('.modal-overlay.open').forEach(modal => modal.classList.remove('open'));
        document.body.style.overflow = '';
        document.body.classList.remove('role-employee');
        const logoutBtn = document.getElementById('btn-logout');
        if (logoutBtn) logoutBtn.style.display = 'none';

        Utils.clearFields([
            'login-user', 'login-password', 'search-pedidos', 'search-clientes',
            'ped-edit-id', 'ped-cliente', 'ped-desc', 'ped-fentrega', 'ped-total', 'ped-notas',
            'cli-edit-id', 'cli-nombre', 'cli-tel', 'cli-obs', 'pag-pedido', 'pag-monto', 'pag-fecha',
            'pag-notas', 'usu-nombre', 'usu-pass'
        ]);

        ['lista-pedidos', 'lista-clientes', 'lista-pagos', 'lista-entregas', 'lista-usuarios', 'home-entregas']
            .forEach(id => {
                const el = document.getElementById(id);
                if (el) el.replaceChildren();
            });

        Utils.setText('stat-ingresos-totales', CONFIG.currencySymbol + '0.00');
        Utils.setText('stat-pedidos-activos', '0');
        Utils.setText('stat-deuda-total', CONFIG.currencySymbol + '0.00');
        Utils.setText('tbl-cobrado-val', CONFIG.currencySymbol + '0.00');
        Utils.setText('tbl-cobrado-pct', '0%');
        Utils.setText('tbl-pendiente-val', CONFIG.currencySymbol + '0.00');
        Utils.setText('tbl-pendiente-pct', '0%');
        Utils.setText('tbl-total-val', CONFIG.currencySymbol + '0.00');

        document.querySelectorAll('.chips .chip').forEach((chip, index) => {
            chip.classList.toggle('active', index === 0);
        });
        if (window._donaDashboard) {
            window._donaDashboard.destroy();
            window._donaDashboard = null;
        }
    },

    // --- Chips de Filtro ---
    setChip: (el, section, value) => {
        el.closest('.chips').querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        el.classList.add('active');
        FILTROS[section] = value;
        // El módulo correspondiente se encarga de re-renderizar
        if (section === 'ped') Pedidos.render();
    },

    // --- Privados: Población de selects ---
    _poblarSelectClientes: () => {
        const sel = document.getElementById('ped-cliente');
        if (!sel) return;
        sel.replaceChildren(new Option(`Seleccionar ${Utils.entity('customer')}...`, ''));
        DATA.clientes.forEach(cliente => {
            const id = Utils.validId(cliente.id);
            if (id) sel.appendChild(new Option(String(cliente.nombre || ''), id));
        });
    },

    _poblarSelectPedidos: () => {
        const sel = document.getElementById('pag-pedido');
        if (!sel) return;
        const activos = DATA.pedidos.filter(p => !['cancelado', 'entregado'].includes(p.estado));
        sel.replaceChildren(new Option(`Seleccionar ${Utils.entity('order')}...`, ''));
        activos.forEach(pedido => {
            const id = Utils.validId(pedido.id);
            if (!id) return;
            const text = `${Utils.clienteNombre(pedido.cliente_id)} · ${CONFIG.currencySymbol}${Utils.fmt(Utils.num(pedido.deuda))} pendiente`;
            sel.appendChild(new Option(text, id));
        });

        // Rellenar fecha actual por defecto
        const fechaInput = document.getElementById('pag-fecha');
        if (fechaInput && !fechaInput.value) fechaInput.value = Utils.todayStr();
    },

    _resetPedidoForm: () => {
        Utils.clearFields(['ped-edit-id', 'ped-cliente', 'ped-desc', 'ped-fentrega', 'ped-total', 'ped-notas']);
        const estadoInput = document.getElementById('ped-estado');
        if (estadoInput) estadoInput.value = 'pendiente';
        const titleEl = document.getElementById('modal-pedido-title');
        if (titleEl) titleEl.textContent = `Agregar ${Utils.entity('order')}`;
        const btn = document.getElementById('btn-guardar-pedido');
        if (btn) btn.textContent = `✓ Guardar ${Utils.entity('order')}`;
    }
};


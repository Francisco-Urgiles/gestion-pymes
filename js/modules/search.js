const Search = {
    filter: 'all', opener: null,
    init: () => {
        document.addEventListener('keydown', event => {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault(); Search.open();
            }
            if (event.key === 'Escape') Search.close();
        });
        document.getElementById('global-search-overlay').addEventListener('click', event => {
            if (event.target.id === 'global-search-overlay') Search.close();
        });
        document.querySelectorAll('[data-search-filter]').forEach(button => button.addEventListener('click', () => {
            Search.filter = button.dataset.searchFilter;
            document.querySelectorAll('[data-search-filter]').forEach(item => {
                item.classList.toggle('active', item === button);
                item.setAttribute('aria-pressed', String(item === button));
            });
            Search.render();
        }));
    },
    open: async () => {
        if (!Session.isAuthenticated()) return;
        Search.opener = document.activeElement;
        document.getElementById('global-search-overlay').classList.add('open');
        document.body.style.overflow = 'hidden';
        Utils.clearFields(['global-search-input']); Search.render();
        document.getElementById('global-search-input').focus();
        try {
            const [clients, orders] = await Promise.all([API.read('clientes'), API.read('pedidos')]);
            if (!Session.isAuthenticated()) return;
            DATA.clientes = clients; DATA.pedidos = orders; Search.render();
        } catch { Utils.showEl('global-search-results', Utils.errorHtml()); }
    },
    close: () => {
        document.getElementById('global-search-overlay').classList.remove('open');
        document.body.style.overflow = ''; Utils.clearFields(['global-search-input']);
        if (Search.opener?.isConnected) Search.opener.focus();
    },
    render: () => {
        const query = Utils.val('global-search-input').trim().toLowerCase();
        const digits = query.replace(/\D/g, '');
        if (!query) return Utils.showEl('global-search-results', `<div class="global-search-empty">${Icons.svg('search')}<strong>Busca cualquier registro del negocio</strong><p>Nombre, teléfono, descripción o fecha.</p><small>${DATA.clientes.length} clientes · ${DATA.pedidos.length} operaciones</small></div>`);
        const clients = Search.filter === 'orders' ? [] : DATA.clientes.filter(c => String(c.nombre || '').toLowerCase().includes(query) || (digits && Utils.whatsappNumber(c.telefono).includes(digits))).slice(0,6).map(c => ({ type:'customer', id:c.id, title:c.nombre, detail:Utils.displayPhone(c.telefono), label:Utils.entity('customer') }));
        const orders = Search.filter === 'customers' ? [] : DATA.pedidos.filter(o => {
            const c = DATA.clientes.find(c => String(c.id) === String(o.cliente_id));
            return [c?.nombre, o.descripcion, o.fecha_entrega, o.id].some(value => String(value || '').toLowerCase().includes(query)) || (digits && Utils.whatsappNumber(c?.telefono).includes(digits));
        }).slice(0,8).map(o => ({type:'order',id:o.id,title:Utils.clienteNombre(o.cliente_id),detail:o.descripcion,label:Session.getRole()==='admin' ? CONFIG.currencySymbol+Utils.fmt(o.total) : Utils.entity('order')}));
        const results = clients.concat(orders).filter(r => Utils.validId(r.id)).slice(0,12);
        Utils.showEl('global-search-results', results.length ? results.map(r => `<button type="button" class="global-result" data-type="${r.type}" data-id="${Utils.escapeHTML(r.id)}">${Icons.svg(r.type==='customer'?'user':'clipboard')}<span><strong>${Utils.escapeHTML(r.title)}</strong><small>${Utils.escapeHTML(Utils.truncate(r.detail,80))}</small></span><em>${Utils.escapeHTML(r.label)}</em></button>`).join('') : '<div class="global-search-empty"><strong>Sin coincidencias</strong><p>Prueba otro nombre, teléfono o detalle.</p></div>');
        document.querySelectorAll('.global-result').forEach(button => button.addEventListener('click', () => {
            const type = button.dataset.type, id = button.dataset.id;
            Search.close();
            if (type === 'customer') {
                Utils.clearFields(['search-clientes']);
                document.getElementById('search-clientes').value = String(DATA.clientes.find(c => String(c.id)===id)?.nombre || '');
                Router.goTo('clientes');
            } else {
                FILTROS.ped = 'todos';
                document.querySelectorAll('.chips .chip').forEach((c,i)=>c.classList.toggle('active',i===0));
                document.getElementById('search-pedidos').value = String(DATA.pedidos.find(o=>String(o.id)===id)?.descripcion || '');
                Router.goTo('pedidos');
            }
        }));
    }
};


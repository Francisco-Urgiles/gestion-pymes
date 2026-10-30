// Iconos locales: no dependen de un servicio externo.
const Icons = {
    paths: {
        home: '<path d="m3 10 9-7 9 7v11h-6v-7H9v7H3z"/>',
        user: '<circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
        clipboard: '<rect x="5" y="4" width="14" height="18" rx="2"/><path d="M9 4V2h6v2M9 10h6M9 14h6M9 18h4"/>',
        calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 2v6M17 2v6M3 11h18M7 15h2M13 15h2"/>',
        wallet: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M15 13h6v4h-6z"/>',
        chart: '<path d="M4 3v18h17M8 16V9M13 16V5M18 16v-5"/>',
        search: '<circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/>',
        check: '<path d="m5 12 4 4L19 6"/>',
        x: '<path d="m6 6 12 12M18 6 6 18"/>',
        clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
        alert: '<path d="m12 3 10 18H2zM12 9v5M12 17h.01"/>',
        phone: '<path d="M4 3h4l2 5-3 2a14 14 0 0 0 7 7l2-3 5 2v4c-9 3-21-9-17-17z"/>',
        edit: '<path d="m16 3 5 5-12 12-6 1 1-6zM13 6l5 5"/>',
        trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/>',
        bank: '<path d="m2 8 10-6 10 6H2M4 11v7M9 11v7M15 11v7M20 11v7M2 21h20"/>',
        chevron: '<path d="m9 5 7 7-7 7"/>',
        ban: '<circle cx="12" cy="12" r="9"/><path d="m6 6 12 12"/>'
    },
    svg: name => `<svg class="app-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${Icons.paths[name] || Icons.paths.clipboard}</svg>`,
    emoji: { '🏠':'home','👤':'user','👥':'user','📋':'clipboard','📦':'clipboard','📅':'calendar','💳':'wallet','💸':'wallet','💵':'wallet','🏦':'bank','📊':'chart','📉':'chart','🔍':'search','✅':'check','✓':'check','✕':'x','⏳':'clock','⚠️':'alert','🎉':'check','🚫':'ban','📞':'phone','✏️':'edit','🗑️':'trash' },
    render: root => {
        root.querySelectorAll('.btn-sm,.btn-add,.btn-submit,.modal-close').forEach(button => {
            if (button.id === 'btn-login' || button.disabled || button.querySelector('svg')) return;
            if (/✓|✕|📋|💳|💵|👤|📅/.test(button.textContent)) return;
            const action = button.dataset.action || '';
            const name = ({editar:'edit',eliminar:'trash',abonar:'wallet',pagos:'wallet','ver-pedidos':'clipboard'})[action]
                || (button.classList.contains('modal-close') ? 'x' : button.classList.contains('btn-add') ? 'clipboard' : button.classList.contains('btn-submit') ? 'check' : null);
            if (name) {
                const span = document.createElement('span'); span.innerHTML = Icons.svg(name);
                button.prepend(span);
            }
        });
        root.querySelectorAll('[data-icon]').forEach(el => {
            if (!el.firstElementChild) el.innerHTML = Icons.svg(el.dataset.icon);
        });
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        const nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);
        nodes.forEach(node => {
            if (node.parentElement.closest('script,style,textarea,option,svg,#toast')) return;
            const text = node.nodeValue;
            const pattern = /🏠|👤|👥|📋|📦|📅|💳|💸|💵|🏦|📊|📉|🔍|✅|✓|✕|⏳|⚠️|🎉|🚫|📞|✏️|🗑️/g;
            if (!pattern.test(text)) return;
            pattern.lastIndex = 0;
            const fragment = document.createDocumentFragment();
            let position = 0;
            for (const match of text.matchAll(pattern)) {
                fragment.append(document.createTextNode(text.slice(position, match.index)));
                const span = document.createElement('span');
                span.className = 'inline-icon'; span.innerHTML = Icons.svg(Icons.emoji[match[0]]);
                fragment.append(span); position = match.index + match[0].length;
            }
            fragment.append(document.createTextNode(text.slice(position)));
            node.replaceWith(fragment);
        });
    },
    init: () => {
        Icons.render(document.body);
        let queued = false;
        new MutationObserver(() => {
            if (queued) return;
            queued = true;
            queueMicrotask(() => { Icons.render(document.body); queued = false; });
        }).observe(document.body, { childList: true, subtree: true });
    }
};


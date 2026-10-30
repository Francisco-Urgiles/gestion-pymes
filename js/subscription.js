const Subscription = {
    state: null, checkedAt: 0, pending: null,
    can: name => Boolean(Subscription.state?.capabilities?.[name]),
    reset: () => { Subscription.state=null; Subscription.checkedAt=0; },
    set: state => {
        if (!state || state.version_config !== 2 || !state.capabilities) throw new Error('El backend necesita la actualización v2.');
        state={...state};delete state.success;
        const previous=Subscription.state;
        if(state.rol && state.rol!==Session.getRole()){
            sessionStorage.setItem(Session.keys.role,state.rol);
            Auth.applyVisualRole(state.rol);API.clearCache();Store.reset();
        }
        Subscription.state=state;Subscription.checkedAt=Date.now();
        if(previous && JSON.stringify(previous)!==JSON.stringify(state)){
            API.clearCache();Store.reset();Reportes.reset();
            ['lista-pedidos','lista-clientes','lista-pagos','lista-entregas','lista-usuarios','home-entregas'].forEach(id=>document.getElementById(id)?.replaceChildren());
        }
        Subscription.render();
        if(previous && JSON.stringify(previous)!==JSON.stringify(state)){
            const screen=document.querySelector('.screen.active')?.id;
            const required={'screen-reportes':'can_view_financial_reports','screen-pagos':'can_manage_payments','screen-usuarios':'can_manage_users'};
            if(!state.activo || (required[screen]&&!Subscription.can(required[screen])))Router.goTo('home');
        }
    },
    refresh: async (force=false) => {
        if(!Session.getToken())return;
        if(!force && Subscription.state && Date.now()-Subscription.checkedAt<30000)return Subscription.state;
        if(Subscription.pending)return Subscription.pending;
        const token=Session.getToken();
        Subscription.pending=API.post('suscripcion',{}, {preserveCache:true}).then(data=>{
            if(token!==Session.getToken())return null;
            Subscription.set(data);return data;
        }).finally(()=>Subscription.pending=null);
        return Subscription.pending;
    },
    render: () => {
        const s=Subscription.state;if(!s)return;
        const names={basico:'Básico',plus:'Plus',premium:'Premium'};
        Utils.setText('subscription-label',`${names[s.plan]||s.plan} · ${s.limites.usuarios_activos} usuarios activos · ${s.activo?'Activo':'Suspendido'}`);
        document.querySelectorAll('[data-capability]').forEach(el=>{el.hidden=!Subscription.can(el.dataset.capability);});
        const routeCaps={pagos:'can_manage_payments',reportes:'can_view_financial_reports',usuarios:'can_manage_users'};
        Object.entries(routeCaps).forEach(([route,cap])=>document.querySelectorAll(`[onclick="app.goTo('${route}')"]`).forEach(el=>el.hidden=!Subscription.can(cap)));
        document.querySelectorAll('.quick-action:not([data-capability])').forEach(el=>{if(!s.activo)el.hidden=true;});
        const operational=document.getElementById('bottom-nav');if(operational)operational.hidden=!s.activo;
        const search=document.getElementById('topbar-search');if(search)search.hidden=!s.activo;
    },
    download: files => files.forEach(file=>{
        const blob=new Blob(['\ufeff',file.csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
        a.href=url;a.download=file.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    }),
    backup: async () => {try{Subscription.download((await API.post('export',{}, {preserveCache:true})).files);}catch(e){Utils.toast(e.message,'error');}},
    exportReport: async () => {try{Subscription.download((await API.post('export_informe',{}, {preserveCache:true})).files);}catch(e){Utils.toast(e.message,'error');}},
    audit: async () => {
        try{const data=await API.post('auditoria',{}, {preserveCache:true});
            Utils.showEl('audit-history',data.rows.map(r=>`<div class="projection-row"><span>${Utils.escapeHTML(r.fecha)} · ${Utils.escapeHTML(r.usuario)} · ${Utils.escapeHTML(r.accion)} · ${Utils.escapeHTML(r.entidad)}</span></div>`).join('')||'Sin eventos.');
        }catch(e){Utils.toast(e.message,'error');}
    }
};
setInterval(()=>{
    if(Session.getToken()&&!document.hidden)Subscription.refresh(true).catch(()=>{
        // Authorization remains on the server; stale capabilities expire visually.
        if(Date.now()-Subscription.checkedAt>60000){document.querySelectorAll('[data-capability]').forEach(el=>el.hidden=true);Utils.setText('subscription-label','No se pudo verificar el plan. Reintenta al recuperar conexión.');}
    });
},30000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&Session.getToken())Subscription.refresh(true).catch(()=>{});});


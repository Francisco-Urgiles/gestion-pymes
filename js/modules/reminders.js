const Reminders={
    load:async()=>{
        try{const data=await API.post('notificaciones',{action:'list'},{preserveCache:true}),c=data.config;
            document.getElementById('reminder-email').value=c.email_destino;
            document.getElementById('reminder-zone').value=c.zona_horaria;
            document.getElementById('reminder-days').value=c.dias_anticipacion.join(',');
            document.getElementById('reminder-hour').value=c.hora_preferida;
            document.getElementById('reminder-active').checked=c.activo;
            Utils.showEl('reminder-history',data.historial.map(r=>`<div class="projection-row"><span>${Utils.escapeHTML(r.fecha_entrega)} · ${Utils.escapeHTML(r.estado_envio)} · ${Utils.escapeHTML(r.error_resumido)}</span></div>`).join('')||'Sin envíos registrados.');
        }catch(e){Utils.toast(e.message,'error');}
    },
    save:async()=>{
        try{await API.post('notificaciones',{action:'save',email_destino:Utils.val('reminder-email'),zona_horaria:Utils.val('reminder-zone'),dias_anticipacion:[...new Set(Utils.val('reminder-days').split(',').map(s=>Number(s.trim())))],hora_preferida:Number(Utils.val('reminder-hour')),activo:document.getElementById('reminder-active').checked});Utils.toast('Configuración guardada.');await Reminders.load();}catch(e){Utils.toast(e.message,'error');}
    },
    test:async()=>{
        if(!confirm('¿Enviar un correo de prueba al destinatario interno guardado?'))return;
        try{await API.post('notificaciones/test',{confirm:true});Utils.toast('Correo de prueba enviado.');}catch(e){Utils.toast(e.message,'error');}
    }
};


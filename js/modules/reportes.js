// Informes financieros. Los pronósticos visibles provienen del backend v2.
const Reportes = {
    orders: [], clients: [], payments: [], charts: [], forecastResult: null,
    money: value => CONFIG.currencySymbol + Utils.fmt(value),
    date: value => {
        const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (!match) return null;
        const date = new Date(+match[1], +match[2]-1, +match[3]);
        return Number.isNaN(date.getTime()) ? null : date;
    },
    key: date => date.getFullYear()+'-'+date.getMonth(),
    label: date => new Intl.DateTimeFormat('es-EC',{month:'short',year:'2-digit'}).format(date),
    trend: values => {
        const n = values.length, mean = values.reduce((s,v)=>s+v,0)/n;
        if (!mean || n < 2) return 0;
        const center = (n-1)/2;
        const slope = values.reduce((s,v,i)=>s+(i-center)*(v-mean),0)/values.reduce((s,v,i)=>s+(i-center)**2,0);
        return Math.max(-15,Math.min(20,slope/mean*100));
    },
    reset: () => {
        Reportes.charts.forEach(chart => chart.destroy()); Reportes.charts=[];
        Reportes.orders=[]; Reportes.clients=[]; Reportes.payments=[]; Reportes.forecastResult=null;
        document.getElementById('forecast-explanation')?.replaceChildren();
        ['report-metrics','report-health','report-top-clients','report-payment-behavior','report-table'].forEach(id=>document.getElementById(id)?.replaceChildren());
    },
    cargar: async () => {
        if (Session.getRole() !== 'admin') return;
        try {
            const [orders,clients,payments] = await Promise.all([API.read('pedidos'),API.read('clientes'),API.read('pagos')]);
            if (Session.getRole() !== 'admin') return;
            Reportes.orders=orders; Reportes.clients=clients; Reportes.payments=payments;
            Reportes.forecastResult=Subscription.can('can_use_advanced_forecasts') ? await API.post('pronostico',{}, {preserveCache:true}) : null;
            Reportes.render();
        } catch(error) { Utils.toast(error.message || 'No fue posible generar el informe.','error'); }
    },
    calculate: (orders,history=6,horizon=6,scenario='base',now=new Date()) => {
        const anchor = new Date(now.getFullYear(),now.getMonth(),1);
        const months = Array.from({length:history},(_,i)=>new Date(anchor.getFullYear(),anchor.getMonth()+i-history+1,1));
        const valid = orders.filter(o=>o.estado!=='cancelado' && Reportes.date(o.fecha_creacion));
        const values = months.map(month=>valid.filter(o=>Reportes.key(Reportes.date(o.fecha_creacion))===Reportes.key(month)).reduce((s,o)=>s+Math.max(0,Utils.num(o.total)),0));
        const period = valid.filter(o=>months.some(month=>Reportes.key(month)===Reportes.key(Reportes.date(o.fecha_creacion))));
        const recent = values.filter(v=>v>0).slice(-3);
        const baseline = recent.length ? recent.reduce((s,v)=>s+v,0)/recent.length : 0;
        const trend = Reportes.trend(values), factor = ({conservative:.9,base:1,optimistic:1.1})[scenario] || 1;
        const forecast = Array.from({length:horizon},(_,i)=>({month:new Date(anchor.getFullYear(),anchor.getMonth()+i+1,1),value:baseline*factor*(1+trend/100)**(i+1)}));
        const total=values.reduce((s,v)=>s+v,0);
        const collected=period.reduce((s,o)=>s+Math.min(Utils.num(o.total),Math.max(0,Utils.num(o.total_pagado))),0);
        const debt=period.reduce((s,o)=>s+Math.max(0,Utils.num(o.deuda)),0);
        const active=valid.filter(o=>!['entregado','cancelado'].includes(o.estado));
        const today=new Date(now.getFullYear(),now.getMonth(),now.getDate());
        const overdue=active.filter(o=>Reportes.date(o.fecha_entrega) && Reportes.date(o.fecha_entrega)<today);
        return {months,values,period,forecast,trend,total,collected,debt,active,overdue,rate:total?collected/total*100:0};
    },
    paymentBehavior: (orders,payments,clients) => {
        const scores={};
        orders.filter(o=>Utils.num(o.total)>0 && Utils.num(o.total_pagado)>=Utils.num(o.total)-.005 && Reportes.date(o.fecha_entrega)).forEach(order=>{
            const rows=payments.filter(p=>String(p.pedido_id)===String(order.id)).map(p=>({date:Reportes.date(p.fecha),amount:Utils.num(p.monto)})).filter(p=>p.date && p.amount>0).sort((a,b)=>a.date-b.date);
            let accumulated=0, completion=null;
            for(const p of rows){accumulated+=p.amount;if(accumulated>=Utils.num(order.total)-.005){completion=p.date;break;}}
            if(!completion)return;
            const entry=scores[order.cliente_id] || {id:order.cliente_id,onTime:0,late:0,count:0};
            entry.count++; completion<=Reportes.date(order.fecha_entrega)?entry.onTime++:entry.late++;
            scores[order.cliente_id]=entry;
        });
        const ranked=Object.values(scores).map(s=>({...s,rate:s.onTime/s.count*100,name:clients.find(c=>String(c.id)===String(s.id))?.nombre || 'Cliente'}));
        return {best:ranked.slice().sort((a,b)=>b.rate-a.rate || b.count-a.count)[0],followUp:ranked.filter(s=>s.late>0).sort((a,b)=>a.rate-b.rate || b.late-a.late)[0]};
    },
    render: () => {
        if(Session.getRole()!=='admin')return;
        const history=Number(Utils.val('report-history'))||6;
        const result=Reportes.calculate(Reportes.orders,history,0,'base');
        const f=Reportes.forecastResult;
        result.forecast=(f?.pronostico||[]).map(p=>({...p,month:new Date(p.mes+'-01T12:00:00'),value:p.valor}));
        if(f?.historial?.length){result.months=f.historial.map(p=>new Date(p.mes+'-01T12:00:00'));result.values=f.historial.map(p=>p.valor);}
        Utils.setText('forecast-explanation',f ? `${f.explicacion||f.message} Modelo: ${f.modelo||'ninguno'} · MAE: ${f.metricas?.mae===null||!f.metricas?'sin evaluación':Reportes.money(f.metricas.mae)} · WAPE: ${f.metricas?.wape==null?'no disponible':(f.metricas.wape*100).toFixed(1)+'%'} · Sesgo: ${f.metricas?.sesgo==null?'no disponible':Reportes.money(f.metricas.sesgo)} · Calculado: ${f.calculado_at}. ${f.nota_rango||''}` : 'Pronóstico estadístico disponible en Premium.');
        const metric=(label,value,detail='')=>`<div class="report-metric"><small>${label}</small><strong>${value}</strong><span>${detail}</span></div>`;
        const forecastStatus=({historial_insuficiente:'Historial insuficiente',exploratorio:'Estimación exploratoria',evaluado:'Evaluado con datos históricos'})[f?.estado]||'Disponible en Premium';
        Utils.showEl('report-metrics',metric('Valor registrado',Reportes.money(result.total),result.period.length+' operaciones')+metric('Promedio mensual',Reportes.money(result.total/history))+metric('Próximo mes estimado',result.forecast.length?Reportes.money(result.forecast[0].value):'Sin pronóstico',forecastStatus)+metric('Ticket promedio',Reportes.money(result.period.length?result.total/result.period.length:0)));
        const counts={};result.period.forEach(o=>counts[o.cliente_id]=(counts[o.cliente_id]||0)+1);
        const ids=Object.keys(counts),repeat=ids.length?ids.filter(id=>counts[id]>1).length/ids.length*100:0;
        Utils.showEl('report-health',metric('Cobrado',Reportes.money(result.collected),'De operaciones del período')+metric('Saldo pendiente',Reportes.money(result.debt))+metric('Tasa de cobro',result.rate.toFixed(0)+'%')+metric('Clientes recurrentes',repeat.toFixed(0)+'%')+metric('Operaciones en curso',result.active.length)+metric('Fuera de fecha',result.overdue.length,Reportes.money(result.overdue.reduce((s,o)=>s+Utils.num(o.deuda),0))+' pendientes'));
        const badge=document.getElementById('report-health-badge');
        badge.textContent=!result.period.length?'Sin datos suficientes':result.rate>=80&&!result.overdue.length?'Estado saludable':result.rate>=60&&result.overdue.length<=2?'Requiere atención':'Conviene revisar';
        Utils.setText('report-warning','Ventas registradas y cobros son indicadores distintos. El pronóstico excluye el mes actual y no garantiza ventas futuras.');
        Utils.showEl('report-table',result.forecast.map(p=>`<div class="projection-row"><span>${Reportes.label(p.month)}</span><strong>${Reportes.money(p.value)}</strong>${p.inferior==null?' · sin rango suficiente':` · rango ${Reportes.money(p.inferior)}–${Reportes.money(p.superior)}`}</div>`).join(''));
        Utils.setText('report-projected-total',result.forecast.length?'Total proyectado: '+Reportes.money(result.forecast.reduce((s,p)=>s+p.value,0)):'No hay pronóstico disponible para esta consulta.');
        const totals={};result.period.forEach(o=>totals[o.cliente_id]=(totals[o.cliente_id]||0)+Utils.num(o.total));
        const top=Object.entries(totals).sort((a,b)=>b[1]-a[1]).slice(0,4);
        Utils.showEl('report-top-clients',top.length?top.map(([id,value],i)=>`<div class="projection-row"><span>${i+1}. ${Utils.escapeHTML(Reportes.clients.find(c=>String(c.id)===id)?.nombre||'Cliente')}</span><strong>${Reportes.money(value)}</strong></div>`).join(''):'<p>Sin operaciones en este período.</p>');
        const {best,followUp}=Reportes.paymentBehavior(result.period,Reportes.payments,Reportes.clients);
        Utils.showEl('report-payment-behavior',metric('Mayor puntualidad',Utils.escapeHTML(best?.name||'Sin datos suficientes'),best?`${best.onTime} de ${best.count} operaciones a tiempo · ${best.rate.toFixed(0)}%`:'Se necesitan operaciones totalmente pagadas.')+metric('Requiere seguimiento',Utils.escapeHTML(followUp?.name||(best?'Sin retrasos detectados':'Sin datos suficientes')),followUp?`${followUp.late} pagos fuera de fecha · ${followUp.rate.toFixed(0)}% puntual`:'Se evalúa la fecha en que se completó el pago.'));
        Reportes.draw(result);
    },
    draw: result => {
        Reportes.charts.forEach(c=>c.destroy());Reportes.charts=[];
        const empty=document.getElementById('report-chart-empty');
        const canvas=document.getElementById('chart-proyeccion');
        const hasData=result.values.some(v=>v>0);
        canvas.hidden=!hasData || typeof Chart==='undefined';empty.hidden=hasData && typeof Chart!=='undefined';
        empty.textContent=typeof Chart==='undefined'?'No fue posible cargar los gráficos.':'No hay ventas registradas para este período.';
        if(typeof Chart==='undefined')return;
        const styles=getComputedStyle(document.documentElement),rose=styles.getPropertyValue('--rose-soft').trim(),sage=styles.getPropertyValue('--sage-soft').trim();
        if(hasData)Reportes.charts.push(new Chart(canvas,{type:'line',data:{labels:result.months.concat(result.forecast.map(p=>p.month)).map(Reportes.label),datasets:[{label:'Ventas registradas',data:result.values.concat(result.forecast.map(()=>null)),borderColor:sage,tension:.3},{label:'Proyección',data:result.values.map((v,i)=>i===result.values.length-1?v:null).concat(result.forecast.map(p=>p.value)),borderColor:rose,borderDash:[7,6],tension:.3}]},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},scales:{y:{beginAtZero:true}},plugins:{tooltip:{callbacks:{label:c=>c.dataset.label+': '+Reportes.money(c.parsed.y)}}}}}));
        Reportes.charts.push(new Chart(document.getElementById('chart-salud-cobros'),{type:'doughnut',data:{labels:['Cobrado','Pendiente'],datasets:[{data:[result.collected,result.debt],backgroundColor:[sage,rose],borderWidth:0}]},options:{responsive:true,maintainAspectRatio:false,cutout:'72%',plugins:{legend:{position:'bottom'}}}}));
    }
};


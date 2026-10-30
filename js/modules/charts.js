// js/modules/charts.js
const Charts = {
    instances: {},

    colors: {
        rose: '#e29578',
        sage: '#83c5be',
        gold: '#ffddd2',
        violet: '#9d81a0'
    },

    init(id, type, data, options = {}) {
        const el = document.getElementById(id);
        if (!el) return;

        if (this.instances[id]) this.instances[id].destroy();

        this.instances[id] = new Chart(el.getContext('2d'), {
            type: type,
            data: data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: type === 'doughnut',
                        position: 'bottom',
                        labels: { color: '#fff', font: { family: 'Outfit', size: 11 } }
                    }
                },
                ...options
            }
        });
    }
};


// ============================================================
// js/store.js — ESTADO GLOBAL (Datos en memoria)
// ============================================================
// Actúa como la "base de datos" del navegador.
// Todos los módulos leen y escriben aquí, nunca guardan
// datos locales propios. Esto evita inconsistencias.
// ============================================================

const DATA = {
    clientes: [],
    pedidos: [],
    pagos: [],
    usuarios: null // null = no cargados, [] = vacíos
};

// Filtros activos por sección
const FILTROS = {
    ped: 'todos'
};

const Store = {
    reset: () => {
        DATA.clientes = [];
        DATA.pedidos  = [];
        DATA.pagos    = [];
        DATA.usuarios = null;
        FILTROS.ped   = 'todos';
    }
};


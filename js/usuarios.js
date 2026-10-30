// ============================================================
// js/usuarios.js — AUTENTICACIÓN Y USUARIOS
// ============================================================
// El rol del frontend controla ÚNICAMENTE la presentación visual.
// La autorización real debe ser validada por Google Apps Script.
// ============================================================

const Auth = {
    applyVisualRole: role => {
        document.body.classList.toggle('role-employee', role === 'employee');
        const logoutBtn = document.getElementById('btn-logout');
        if (logoutBtn) logoutBtn.style.display = role ? 'inline-flex' : 'none';
    },

    clearClientState: () => {
        if (typeof API !== 'undefined') API.clearCache();
        Subscription.reset();
        sessionStorage.removeItem('pending_payment');
        Session.clear();
        Store.reset();
        Auth.applyVisualRole('');
        if (typeof UI !== 'undefined') UI.resetForLogout();
    },

    login: async () => {
        const user = Utils.val('login-user').trim();
        const password = Utils.val('login-password');
        if (!user || !password) {
            Utils.clearFields(['login-password']);
            return Utils.toast('Ingresa usuario y contraseña', 'error');
        }

        const btn = document.getElementById('btn-login');
        Utils.setLoading(btn, true, 'Verificando...');

        try {
            const response = await API.post('login', {
                usuario: user,
                password
            }, {
                skipToken: true,
                handleAuthError: false
            });

            const role = String(response.rol || response.role || '').toLowerCase();
            const token = response.token || '';
            const sessionUser = response.usuario || response.user || user;

            if (CONFIG.AUTH_MODE === 'token' && !token) {
                throw new Error('El servidor no devolvió una sesión válida.');
            }

            API.clearCache();
            Store.reset();
            Session.setSession({ token, role, user: sessionUser });
            Auth.applyVisualRole(role);
            await Subscription.refresh(true);
            Utils.clearFields(['login-user', 'login-password']);
            Utils.toast(role === 'admin' ? 'Bienvenido Administrador' : 'Bienvenido');
            Router.goTo('home');
        } catch (error) {
            Auth.clearClientState();
            Utils.toast(error.message || 'Usuario o contraseña incorrectos', 'error');
        } finally {
            // La contraseña no permanece en el formulario, incluso si falla.
            Utils.clearFields(['login-password']);
            Utils.setLoading(btn, false, 'Iniciar Sesión');
        }
    },

    logout: async () => {
        // Iniciar la revocación antes de borrar el token, pero limpiar la
        // interfaz y los datos inmediatamente sin esperar a la red.
        let serverLogout = null;
        if (CONFIG.AUTH_MODE === 'token' && Session.getToken()) {
            serverLogout = API.post('logout', {}, { handleAuthError: false });
        }

        Auth.clearClientState();
        Router.goTo('login');

        if (serverLogout) {
            try {
                await serverLogout;
            } catch {
                // La limpieza local siempre se ejecuta. No se registran tokens
                // ni payloads sensibles en la consola.
            }
        }
    },

    checkLegacySession: () => {
        if (!Session.isAuthenticated()) return false;
        Auth.applyVisualRole(Session.getRole());
        return true;
    },

    checkServerSession: async () => {
        if (!Session.getToken()) return false;

        try {
            const response = await API.post('session/check', {}, { handleAuthError: false });
            Session.setSession({
                token: Session.getToken(),
                role: response.rol || response.role,
                user: response.usuario || response.user || Session.getUser()
            });
            Auth.applyVisualRole(Session.getRole());
            await Subscription.refresh(true);
            return true;
        } catch {
            Auth.clearClientState();
            Utils.toast('Tu sesión no es válida. Inicia sesión nuevamente.', 'warn');
            return false;
        }
    },

    check: async () => {
        const valid = CONFIG.AUTH_MODE === 'token'
            ? await Auth.checkServerSession()
            : Auth.checkLegacySession();

        if (!valid) {
            Auth.clearClientState();
            Router.goTo('login');
        }
        return valid;
    }
};

const Usuarios = {
    cargar: async () => {
        // CONTROL VISUAL ÚNICAMENTE. Google Apps Script debe aplicar el 403.
        if (Session.getRole() !== 'admin') {
            return Utils.toast('No tienes permisos para consultar usuarios.', 'error');
        }
        Utils.loading('lista-usuarios');
        try {
            DATA.usuarios = await API.read('usuarios');
            Usuarios.render();
        } catch {
            Utils.showEl('lista-usuarios', Utils.errorHtml());
        }
    },

    render: () => {
        const items = DATA.usuarios || [];
        if (!items.length) {
            Utils.showEl('lista-usuarios', '<div class="empty"><span class="eicon">👥</span><p>No hay usuarios registrados</p></div>');
            return;
        }

        Utils.showEl('lista-usuarios', items.map(user => {
            const role = user.rol === 'admin' ? 'admin' : 'employee';
            const access = user.activo && user.acceso_plan ? 'Con acceso' : user.activo ? 'Fuera del límite del plan' : 'Desactivado';
            return `
                <div class="card" data-user-id="${Utils.escapeHTML(user.id)}">
                    <div class="card-row">
                        <div class="card-name">👤 ${Utils.escapeHTML(user.usuario)} · ${access}</div>
                        <span class="badge ${role === 'admin' ? 'badge-listo' : 'badge-pendiente'}">
                            ${role === 'admin' ? 'Administrador' : 'Empleado'}
                        </span>
                    </div>
                    <div class="card-actions">
                        <button class="btn-sm" data-user-action="toggle">${user.activo?'Desactivar':'Activar'}</button>
                        <button class="btn-sm" data-user-action="password">Cambiar contraseña</button>
                    </div>
                </div>`;
        }).join(''));
        document.querySelectorAll('[data-user-action]').forEach(button=>button.addEventListener('click',()=>Usuarios.update(button.closest('[data-user-id]').dataset.userId,button.dataset.userAction)));
    },

    update: async (id,action) => {
        const user=DATA.usuarios?.find(u=>String(u.id)===id);if(!user)return;
        const payload={id};
        if(action==='toggle'){
            if(!confirm(`${user.activo?'Desactivar':'Activar'} a ${user.usuario}? Sus sesiones actuales serán revocadas.`))return;
            payload.activo=!user.activo;
        }else{
            const password=prompt(`Nueva contraseña para ${user.usuario} (10 a 256 caracteres):`);
            if(password===null)return;
            if(password.length<10||password.length>256)return Utils.toast('Usa entre 10 y 256 caracteres.','error');
            payload.password=password;
        }
        try{await API.post('usuarios_update',payload);Utils.toast('Usuario actualizado.');await Usuarios.cargar();}catch(e){Utils.toast(e.message,'error');}
    },

    guardar: async () => {
        // CONTROL VISUAL ÚNICAMENTE. Google Apps Script debe aplicar el 403.
        if (Session.getRole() !== 'admin') {
            return Utils.toast('No tienes permisos para crear usuarios.', 'error');
        }
        const usuario = Utils.val('usu-nombre').trim();
        const password = Utils.val('usu-pass');
        const rol = Utils.val('usu-rol');

        if (!usuario || !password) {
            Utils.clearFields(['usu-pass']);
            return Utils.toast('Usuario y contraseña obligatorios', 'error');
        }

        const btn = document.getElementById('btn-guardar-usuario');
        Utils.setLoading(btn, true, 'Guardando...');

        try {
            await API.post('usuarios', { usuario, password, rol });
            UI.closeModal('modal-usuario');
            Utils.clearFields(['usu-nombre', 'usu-pass']);
            Utils.toast('✓ Usuario agregado correctamente');
            await Usuarios.cargar();
        } catch (error) {
            Utils.toast(error.message || 'Error al guardar', 'error');
        } finally {
            // No conservar contraseñas después de ningún intento.
            Utils.clearFields(['usu-pass']);
            Utils.setLoading(btn, false, '✓ Guardar Usuario');
        }
    }
};


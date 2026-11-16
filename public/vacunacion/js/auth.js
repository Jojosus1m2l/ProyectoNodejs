/* ============================================================
   Autenticación · SISALUD Guárico
   La sesión vive en una cookie httpOnly emitida por la API.
   localStorage/sessionStorage solo guardan una copia para pintar
   la interfaz; ninguna decisión de acceso se toma con ese cache.
   ============================================================ */
(function () {
  'use strict';

  const DATOS = window.SISALUD_DATOS;
  const KEY_USUARIOS = 'sisalud_usuarios_v1';
  const KEY_SESION = 'sisalud_sesion_v1';
  const KEY_SESION_TEMP = 'sisalud_sesion_temporal_v1';
  const ROLES_VALIDOS = ['centro', 'revisor', 'master'];
  const ROLES_SOLICITABLES = ['centro', 'revisor'];
  const CODIGOS = {
    CREDENCIALES: 'clave',
    ESTADO_PENDIENTE: 'pendiente',
    ESTADO_RECHAZADO: 'rechazado',
    ESTADO_SUSPENDIDO: 'suspendido',
    CORREO_EXISTE: 'existe',
    NOMBRE: 'nombre',
    CORREO: 'correo',
    PASSWORD: 'clave',
    ROL: 'rol',
    CENTRO: 'centro'
  };
  let inicializacion = null;

  function normalizarCorreo(valor) {
    return String(valor || '').trim().toLowerCase();
  }

  function correoValido(correo) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
  }

  function error(codigo, mensaje) {
    const err = new Error(mensaje);
    err.codigo = codigo;
    return err;
  }

  function leerUsuarios() {
    try {
      const raw = localStorage.getItem(KEY_USUARIOS);
      if (!raw) return [];
      const lista = JSON.parse(raw);
      return Array.isArray(lista) ? lista : [];
    } catch {
      return [];
    }
  }

  function guardarUsuarios(usuarios) {
    localStorage.setItem(KEY_USUARIOS, JSON.stringify(usuarios));
    window.dispatchEvent(new CustomEvent('sisalud:usuarios'));
  }

  function actualizarUsuarioCache(usuario) {
    const usuarios = leerUsuarios();
    const indice = usuarios.findIndex((u) => String(u.id) === String(usuario.id));
    if (indice >= 0) usuarios[indice] = { ...usuarios[indice], ...usuario };
    else usuarios.push(usuario);
    guardarUsuarios(usuarios);
    return usuario;
  }

  function buscarUsuario(referencia) {
    const valor = String(referencia || '').trim().toLowerCase();
    return leerUsuarios().find((u) =>
      String(u.id) === String(referencia) || u.correo === valor
    ) || null;
  }

  function limpiarSesion() {
    localStorage.removeItem(KEY_SESION);
    localStorage.removeItem(KEY_SESION_TEMP);
    sessionStorage.removeItem(KEY_SESION);
    sessionStorage.removeItem(KEY_SESION_TEMP);
  }

  function sesionActual() {
    for (const clave of [KEY_SESION, KEY_SESION_TEMP]) {
      const raw = localStorage.getItem(clave) || sessionStorage.getItem(clave);
      if (!raw) continue;
      try {
        const sesion = JSON.parse(raw);
        if (!sesion || !sesion.correo) {
          limpiarSesion();
          return null;
        }
        const usuario = buscarUsuario(sesion.correo);
        if (!usuario || usuario.estado !== 'aprobado') {
          limpiarSesion();
          return null;
        }
        return {
          ...sesion,
          userId: usuario.id,
          nombre: usuario.nombre,
          correo: usuario.correo,
          rol: usuario.rol,
          centroId: usuario.centroId || null
        };
      } catch {
        limpiarSesion();
        return null;
      }
    }
    return null;
  }

  function guardarSesion(usuario, recordar) {
    limpiarSesion();
    const sesion = {
      userId: usuario.id,
      nombre: usuario.nombre,
      correo: usuario.correo,
      rol: usuario.rol,
      centroId: usuario.centroId || null,
      iniciadoEn: new Date().toISOString()
    };
    const destino = recordar ? localStorage : sessionStorage;
    destino.setItem(recordar ? KEY_SESION : KEY_SESION_TEMP, JSON.stringify(sesion));
  }

  async function api(ruta, opciones = {}) {
    const config = {
      method: opciones.method || 'GET',
      credentials: 'same-origin',
      headers: {}
    };
    if (opciones.body !== undefined) {
      config.headers['content-type'] = 'application/json';
      config.body = JSON.stringify(opciones.body);
    }

    const response = await fetch(ruta, config);
    const texto = await response.text();
    let datos = null;
    if (texto) {
      try {
        datos = JSON.parse(texto);
      } catch {
        datos = null;
      }
    }

    if (!response.ok) {
      if (response.status === 401) limpiarSesion();
      const codigo = (datos && datos.codigo) || 'red';
      const err = error(CODIGOS[codigo] || codigo, (datos && datos.error) || 'No se pudo completar la operación.');
      err.status = response.status;
      throw err;
    }

    return datos;
  }

  async function cargarUsuarios() {
    const lista = await api('/api/usuarios');
    guardarUsuarios(lista);
    return lista;
  }

  async function init() {
    if (inicializacion) return inicializacion;
    inicializacion = (async () => {
      const anterior = sesionActual();
      if (!anterior) return leerUsuarios();

      try {
        const usuario = await api('/api/auth/me');
        actualizarUsuarioCache(usuario);
        guardarSesion(usuario, Boolean(anterior && localStorage.getItem(KEY_SESION)));
        if (usuario.rol === 'master') await cargarUsuarios();
      } catch (err) {
        if (err.status === 401) limpiarSesion();
      }

      return leerUsuarios();
    })();
    return inicializacion;
  }

  async function registrarSolicitud({ nombre, correo, clave, rol, centroId }) {
    const nombreLimpio = String(nombre || '').trim();
    const correoLimpio = normalizarCorreo(correo);
    const rolLimpio = String(rol || '').trim();

    if (nombreLimpio.length < 3) throw error('nombre', 'Escribe tu nombre completo.');
    if (!correoValido(correoLimpio)) throw error('correo', 'Escribe un correo electrónico válido.');
    if (String(clave || '').length < 8) throw error('clave', 'La contraseña debe tener al menos 8 caracteres.');
    if (!ROLES_SOLICITABLES.includes(rolLimpio)) throw error('rol', 'Selecciona el rol que deseas solicitar.');
    if (rolLimpio === 'centro' && !DATOS.CENTROS.some((c) => c.id === centroId)) {
      throw error('centro', 'Selecciona el centro de salud al que perteneces.');
    }

    const usuario = await api('/api/auth/solicitud', {
      method: 'POST',
      body: {
        nombre: nombreLimpio,
        correo: correoLimpio,
        password: String(clave),
        rol: rolLimpio,
        centroId: rolLimpio === 'centro' ? centroId : null
      }
    });

    return usuario;
  }

  async function login(correo, clave, recordar = false) {
    const correoLimpio = normalizarCorreo(correo);
    if (!correoValido(correoLimpio)) throw error('correo', 'Escribe un correo electrónico válido.');

    const usuario = await api('/api/auth/login', {
      method: 'POST',
      body: {
        correo: correoLimpio,
        password: String(clave),
        recordar: Boolean(recordar)
      }
    });

    actualizarUsuarioCache(usuario);
    guardarSesion(usuario, Boolean(recordar));
    if (usuario.rol === 'master') await cargarUsuarios();
    window.dispatchEvent(new CustomEvent('sisalud:sesion'));
    return usuario;
  }

  function logout() {
    limpiarSesion();
    window.dispatchEvent(new CustomEvent('sisalud:sesion'));
    return fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'same-origin',
      keepalive: true
    }).catch(() => {});
  }

  function requireSession() {
    const sesion = sesionActual();
    if (!sesion) {
      limpiarSesion();
      window.location.replace('index.html');
      return null;
    }
    return sesion;
  }

  async function aprobarUsuario(id, { rol, centroId } = {}) {
    const usuario = await api(`/api/usuarios/${encodeURIComponent(id)}/aprobar`, {
      method: 'PATCH',
      body: { rol, centroId }
    });
    return actualizarUsuarioCache(usuario);
  }

  async function rechazarUsuario(id) {
    const usuario = await api(`/api/usuarios/${encodeURIComponent(id)}/rechazar`, {
      method: 'PATCH'
    });
    return actualizarUsuarioCache(usuario);
  }

  async function cambiarEstadoUsuario(id, estado) {
    if (!['aprobado', 'suspendido'].includes(estado)) {
      throw error('estado', 'Estado de usuario no válido.');
    }
    const accion = estado === 'aprobado' ? 'reactivar' : 'suspender';
    const usuario = await api(`/api/usuarios/${encodeURIComponent(id)}/${accion}`, {
      method: 'PATCH'
    });
    return actualizarUsuarioCache(usuario);
  }

  function contarPendientes() {
    return leerUsuarios().filter((u) => u.estado === 'pendiente').length;
  }

  function centroPorId(id) {
    return DATOS.CENTROS.find((c) => c.id === id) || null;
  }

  function etiquetaRol(rol) {
    return (DATOS.ROLES[rol] && DATOS.ROLES[rol].nombre) || rol || '—';
  }

  function etiquetaEstado(estado) {
    const etiquetas = {
      aprobado: 'Aprobado',
      pendiente: 'Pendiente',
      rechazado: 'Rechazado',
      suspendido: 'Suspendido'
    };
    return etiquetas[estado] || estado || '—';
  }

  window.SISALUD = {
    KEY_USUARIOS,
    KEY_SESION,
    init,
    registrarSolicitud,
    login,
    logout,
    getSession: sesionActual,
    requireSession,
    getUsuarios: leerUsuarios,
    cargarUsuarios,
    buscarUsuario,
    aprobarUsuario,
    rechazarUsuario,
    cambiarEstadoUsuario,
    contarPendientes,
    centroPorId,
    etiquetaRol,
    etiquetaEstado,
    normalizarCorreo,
    correoValido,
    ROLES_VALIDOS,
    CUENTAS_DEMO: DATOS.CUENTAS_DEMO
  };
})();

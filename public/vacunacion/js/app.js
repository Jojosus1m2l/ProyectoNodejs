/* ============================================================
   Registro de Vacunación · SISALUD Guárico
   Lógica de la aplicación: registros, validación y usuarios.
   ============================================================ */
(function () {
  'use strict';

  const DATOS = window.SISALUD_DATOS;
  const S = window.SISALUD;
  const CENTROS = DATOS.CENTROS;
  const VACUNAS = DATOS.VACUNAS;
  const ROLES = DATOS.ROLES;

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  let sesion = null;
  let registros = [];
  let registroPendiente = null;
  let registroDetalle = null;
  let usuarioAprobar = null;
  let accionConfirmar = null;
  let esCentro = false;
  let esRevisor = false;
  let esMaster = false;
  let puedeValidar = false;

  /* ── Utilidades ── */
  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function normalizar(value) {
    return String(value ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  function isoLocal(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function hoyISO() {
    return isoLocal(new Date());
  }

  function isoHaceDias(dias) {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - dias);
    return isoLocal(fecha);
  }

  function fmtFecha(iso) {
    const fecha = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(fecha.getTime())) return '—';
    return fecha.toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function fmtFechaHora(valor) {
    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) return '—';
    return fecha.toLocaleString('es-VE', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }

  function aniosCumplidos(iso) {
    const nacimiento = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(nacimiento.getTime())) return null;
    const hoy = new Date();
    let anios = hoy.getFullYear() - nacimiento.getFullYear();
    const meses = hoy.getMonth() - nacimiento.getMonth();
    if (meses < 0 || (meses === 0 && hoy.getDate() < nacimiento.getDate())) anios -= 1;
    return anios;
  }

  function textoEdad(iso) {
    const anios = aniosCumplidos(iso);
    if (anios === null) return '—';
    if (anios >= 1) return `${anios} ${anios === 1 ? 'año' : 'años'}`;

    const nacimiento = new Date(`${iso}T00:00:00`);
    const hoy = new Date();
    let meses = (hoy.getFullYear() - nacimiento.getFullYear()) * 12 + (hoy.getMonth() - nacimiento.getMonth());
    if (hoy.getDate() < nacimiento.getDate()) meses -= 1;
    if (meses <= 0) return 'Recién nacido';
    return `${meses} ${meses === 1 ? 'mes' : 'meses'}`;
  }

  function genId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    return `reg-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function buscarCentroRegistro(registro) {
    return CENTROS.find((centro) => centro.id === registro.centroId)
      || CENTROS.find((centro) => centro.nombre === registro.centro)
      || null;
  }

  function nombreCentro(id) {
    const centro = S.centroPorId(id);
    return centro ? centro.nombre : '—';
  }

  function separarNombre(nombre) {
    const partes = String(nombre || '').trim().split(/\s+/).filter(Boolean);
    if (partes.length >= 4) {
      return {
        primerNombre: partes[0],
        segundoNombre: partes.slice(1, -2).join(' '),
        primerApellido: partes[partes.length - 2],
        segundoApellido: partes[partes.length - 1]
      };
    }
    if (partes.length === 3) {
      return { primerNombre: partes[0], segundoNombre: '', primerApellido: partes[1], segundoApellido: partes[2] };
    }
    return {
      primerNombre: partes[0] || '',
      segundoNombre: '',
      primerApellido: partes[1] || '',
      segundoApellido: ''
    };
  }

  function enriquecerRegistro(registro) {
    const limpio = { ...registro };
    delete limpio.direccion;
    limpio.correo = limpio.correo || '';
    limpio.confirmado = limpio.confirmado === undefined ? true : limpio.confirmado === true;
    limpio.confirmadoEn = typeof limpio.confirmadoEn === 'string' ? limpio.confirmadoEn : '';
    limpio.validado = limpio.validado === undefined ? limpio.confirmado : limpio.validado === true;
    limpio.validadoPor = typeof limpio.validadoPor === 'string' ? limpio.validadoPor : '';
    limpio.validadoEn = typeof limpio.validadoEn === 'string' ? limpio.validadoEn : '';
    limpio.creadoPor = typeof limpio.creadoPor === 'string' ? limpio.creadoPor : '';
    limpio.creadoPorNombre = typeof limpio.creadoPorNombre === 'string' ? limpio.creadoPorNombre : '';

    const partesNombre = separarNombre(limpio.nombres);
    limpio.primerNombre = String(limpio.primerNombre || partesNombre.primerNombre).trim();
    limpio.segundoNombre = String(limpio.segundoNombre || partesNombre.segundoNombre).trim();
    limpio.primerApellido = String(limpio.primerApellido || partesNombre.primerApellido).trim();
    limpio.segundoApellido = String(limpio.segundoApellido || partesNombre.segundoApellido).trim();
    limpio.nombres = [
      limpio.primerNombre, limpio.segundoNombre, limpio.primerApellido, limpio.segundoApellido
    ].filter(Boolean).join(' ') || String(limpio.nombres || '').trim();

    const centro = buscarCentroRegistro(limpio);
    if (!centro) {
      return {
        ...limpio,
        estado: limpio.estado || '',
        municipio: limpio.municipio || '',
        parroquia: limpio.parroquia || ''
      };
    }

    return {
      ...limpio,
      centroId: centro.id,
      centro: centro.nombre,
      estado: centro.estado,
      municipio: centro.municipio,
      parroquia: centro.parroquia
    };
  }

  function opcionesCentrosHTML() {
    const grupos = new Map();
    CENTROS.forEach((centro) => {
      const clave = `${centro.estado} · ${centro.municipio}`;
      if (!grupos.has(clave)) grupos.set(clave, []);
      grupos.get(clave).push(centro);
    });

    return Array.from(grupos.entries()).map(([grupo, centros]) => `
      <optgroup label="${esc(grupo)}">
        ${centros.map((centro) => `<option value="${esc(centro.id)}">${esc(centro.nombre)} — ${esc(centro.parroquia)}</option>`).join('')}
      </optgroup>`).join('');
  }

  /* ── Datos ── */
  async function cargarRegistros() {
    const response = await fetch('/api/registros', { credentials: 'same-origin' });

    if (response.status === 401) {
      S.logout();
      window.location.replace('index.html');
      return [];
    }
    if (!response.ok) {
      throw new Error('No se pudieron cargar los registros.');
    }

    const lista = await response.json();
    return Array.isArray(lista) ? lista.map(enriquecerRegistro) : [];
  }

  async function enviarJSON(ruta, opciones = {}) {
    const config = {
      method: opciones.method || 'POST',
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

    if (response.status === 401) {
      S.logout();
      window.location.replace('index.html');
    }
    if (!response.ok) {
      throw new Error((datos && datos.error) || 'No se pudo completar la operación.');
    }
    return datos;
  }

  /* ── Formulario ── */
  function actualizarDosis() {
    const vacuna = VACUNAS[$('#vacuna').value];
    if (!vacuna) return;
    $('#esquema-vacuna').textContent = `Esquema de referencia: ${vacuna.esquema}.`;
    $('#dosis').innerHTML = vacuna.dosis
      .map((d) => `<option value="${esc(d)}">${esc(d)}</option>`)
      .join('');
  }

  function actualizarLimitesFechas() {
    const hoy = hoyISO();
    $('#fechaNacimiento').max = hoy;
    $('#fechaAplicacion').max = hoy;
  }

  function actualizarUbicacionCentro() {
    const centro = CENTROS.find((item) => item.id === $('#centro').value);
    $('#estadoCentro').value = centro ? centro.estado : '';
    $('#municipioCentro').value = centro ? centro.municipio : '';
    $('#parroquiaCentro').value = centro ? centro.parroquia : '';
  }

  function inicializarCentros() {
    $('#centro').innerHTML = '<option value="">Seleccione un centro…</option>' + opcionesCentrosHTML();
    $('#aprobar-centro').innerHTML = '<option value="">Seleccione un centro…</option>' + opcionesCentrosHTML();

    if (esCentro) {
      const centro = S.centroPorId(sesion.centroId);
      if (centro) {
        $('#centro').value = centro.id;
        $('#centro').disabled = true;
        $('#ayudaCentro').textContent = 'Centro asignado a tu cuenta.';
      } else {
        $('#centro').disabled = false;
        $('#ayudaCentro').textContent = 'Tu cuenta no tiene centro asignado; selecciona uno.';
      }
    } else {
      $('#centro').disabled = false;
      $('#ayudaCentro').textContent = esMaster
        ? 'Como Master puedes registrar en cualquier centro.'
        : 'La ubicación se completa al elegir el establecimiento.';
    }

    actualizarUbicacionCentro();
  }

  function prepararFormulario() {
    $('#fechaAplicacion').value = hoyISO();
    actualizarLimitesFechas();
    actualizarDosis();
    actualizarUbicacionCentro();
  }

  function resetFormulario() {
    $('#form-registro').reset();
    if (esCentro && sesion.centroId) $('#centro').value = sesion.centroId;
    prepararFormulario();
    $('#aviso').classList.add('hidden');
  }

  /* ── Tabla y detalle ── */
  function badgeValidacion(registro) {
    return registro.validado
      ? '<span class="status-chip status-ok"><i class="fas fa-check"></i> Validado</span>'
      : '<span class="status-chip status-pending"><i class="fas fa-clock"></i> Por validar</span>';
  }

  function filaDato(label, value) {
    return `<dt class="detail-label">${label}</dt><dd class="detail-value">${value || '—'}</dd>`;
  }

  function filaHTML(registro) {
    const ubicacion = [registro.municipio, registro.estado].filter(Boolean).join(', ');
    const puedeValidarEste = puedeValidar && !registro.validado;
    return `
      <tr>
        <td>
          <p class="cell-name">${esc(registro.nombres)}</p>
          <p class="cell-sub">${esc(registro.cedula)} · ${esc(textoEdad(registro.fechaNacimiento))}</p>
        </td>
        <td>
          <p>${esc(registro.vacunaNombre)}</p>
          <span class="chip chip-info">${esc(registro.dosis)}</span>
        </td>
        <td class="cell-mono">${esc(registro.lote)}</td>
        <td class="cell-nowrap">${esc(fmtFecha(registro.fechaAplicacion))}</td>
        <td class="cell-location">
          <strong>${esc(registro.centro)}</strong>
          ${ubicacion ? `<span>${esc(ubicacion)}</span>` : ''}
        </td>
        <td>${badgeValidacion(registro)}</td>
        <td class="text-right">
          <div class="row-actions">
            <button type="button" class="action" data-ver="${esc(registro.id)}">
              <i class="fas fa-eye"></i> Ver
            </button>
            ${puedeValidarEste ? `<button type="button" class="action action-ok" data-validar="${esc(registro.id)}">
              <i class="fas fa-check"></i> Validar
            </button>` : ''}
          </div>
        </td>
      </tr>`;
  }

  function registrosVisibles() {
    if (!esCentro) return registros;
    if (!sesion.centroId) return [];
    return registros.filter((registro) => registro.centroId === sesion.centroId);
  }

  function renderTabla() {
    const base = registrosVisibles();
    const query = normalizar($('#buscar').value.trim());
    const filtrados = base.filter((registro) => normalizar([
      registro.nombres,
      registro.cedula,
      registro.vacunaNombre,
      registro.dosis,
      registro.lote,
      registro.centro,
      registro.estado,
      registro.municipio,
      registro.parroquia,
      registro.correo,
      registro.validadoPor
    ].join(' ')).includes(query));

    $('#contador').textContent = `${base.length} ${base.length === 1 ? 'registro' : 'registros'}`;
    const aplicadasHoy = base.filter((registro) => registro.fechaAplicacion === hoyISO()).length;
    $('#resumen').textContent = `Aplicadas hoy: ${aplicadasHoy}`;

    if (filtrados.length === 0) {
      const mensaje = query
        ? 'No hay registros que coincidan con la búsqueda.'
        : esCentro
          ? (sesion.centroId
            ? 'Aún no hay registros en tu centro. Usa el formulario para agregar el primero.'
            : 'Tu cuenta no tiene un centro asignado. Contacta al Master.')
          : 'Aún no hay registros. Usa el formulario para agregar el primero.';
      $('#tabla').innerHTML = `
        <tr>
          <td colspan="7" class="empty-cell">${mensaje}</td>
        </tr>`;
      return;
    }

    $('#tabla').innerHTML = filtrados.map(filaHTML).join('');
  }

  function detalleHTML(registro, { revision = false } = {}) {
    return `
      <p class="detail-name">${esc(registro.nombres)}</p>
      <p class="detail-meta">${esc(registro.cedula)} · ${esc(textoEdad(registro.fechaNacimiento))} · ${esc(registro.sexo)}</p>

      <p class="detail-section">Paciente</p>
      <div class="detail-grid">
        ${filaDato('Primer nombre', esc(registro.primerNombre))}
        ${filaDato('Segundo nombre', esc(registro.segundoNombre))}
        ${filaDato('Primer apellido', esc(registro.primerApellido))}
        ${filaDato('Segundo apellido', esc(registro.segundoApellido))}
        ${filaDato('Nacimiento', esc(fmtFecha(registro.fechaNacimiento)))}
        ${filaDato('Representante', esc(registro.representante))}
        ${filaDato('Teléfono', esc(registro.telefono))}
        ${filaDato('Correo', esc(registro.correo))}
      </div>

      <p class="detail-section">Vacuna y centro</p>
      <div class="detail-grid">
        ${filaDato('Vacuna', esc(registro.vacunaNombre))}
        ${filaDato('Dosis', esc(registro.dosis))}
        ${filaDato('Aplicación', esc(fmtFecha(registro.fechaAplicacion)))}
        ${filaDato('Lote', esc(registro.lote))}
        ${filaDato('Estado', esc(registro.estado))}
        ${filaDato('Municipio', esc(registro.municipio))}
        ${filaDato('Parroquia', esc(registro.parroquia))}
        ${filaDato('Centro', esc(registro.centro))}
        ${filaDato('Observaciones', esc(registro.observaciones))}
      </div>

      ${revision ? '' : `
        <p class="detail-section">Verificación</p>
        <div class="detail-grid">
          ${filaDato('Estado', badgeValidacion(registro))}
          ${filaDato('Validado por', esc(registro.validadoPor || '—'))}
          ${filaDato('Fecha de validación', esc(registro.validadoEn ? fmtFechaHora(registro.validadoEn) : '—'))}
        </div>`}

      <p class="detail-section">Trazabilidad</p>
      <div class="detail-grid">
        ${filaDato('Registrado por', esc(registro.creadoPorNombre || registro.creadoPor || '—'))}
        ${filaDato('Creado', esc(registro.creadoEn ? fmtFechaHora(registro.creadoEn) : '—'))}
        ${filaDato('Confirmado', esc(registro.confirmadoEn ? fmtFechaHora(registro.confirmadoEn) : '—'))}
      </div>`;
  }

  function abrirDetalle(id) {
    const registro = registros.find((item) => String(item.id) === String(id));
    if (!registro) return;
    registroDetalle = registro;
    $('#detalle-contenido').innerHTML = detalleHTML(registro);
    const boton = $('#btn-validar');
    boton.hidden = !(puedeValidar && !registro.validado);
    boton.dataset.id = registro.id;
    $('#dlg-detalle').showModal();
  }

  async function validarRegistro(id) {
    if (!puedeValidar) return;

    try {
      const datos = await enviarJSON(`/api/registros/${encodeURIComponent(id)}/validar`, {
        method: 'PATCH'
      });
      const actualizado = enriquecerRegistro(datos);
      const indice = registros.findIndex((item) => String(item.id) === String(id));
      if (indice >= 0) registros[indice] = actualizado;
      else registros.unshift(actualizado);

      renderTabla();
      if ($('#dlg-detalle').open) $('#dlg-detalle').close();
      mostrarAviso(`Registro validado: ${actualizado.nombres} · ${actualizado.vacunaNombre}.`);
    } catch (err) {
      mostrarAviso(err.message, 'error');
    }
  }

  function mostrarConfirmacion(registro) {
    $('#aviso').classList.add('hidden');
    $('#confirmar-contenido').innerHTML = `
      <div class="review-banner">
        <i class="fas fa-info-circle"></i>
        <span>Este registro aún no se ha guardado. Revísalo y confirma para incorporarlo a la tabla; luego quedará pendiente de validación por el Revisor.</span>
      </div>
      ${detalleHTML(registro, { revision: true })}`;
    $('#confirmar-error').textContent = '';
    $('#confirmar-error').classList.add('hidden');
    $('#chk-confirmar').checked = false;
    $('#btn-confirmar-guardar').disabled = true;
    $('#dlg-confirmar').showModal();
    $('#chk-confirmar').focus();
  }

  async function confirmarRegistro() {
    if (!registroPendiente || !$('#chk-confirmar').checked) return;

    const boton = $('#btn-confirmar-guardar');
    boton.disabled = true;

    try {
      const datos = await enviarJSON('/api/registros', {
        method: 'POST',
        body: registroPendiente.payload
      });
      const registro = enriquecerRegistro(datos);
      registros = [registro, ...registros];

      renderTabla();
      registroPendiente = null;
      $('#dlg-confirmar').close();
      resetFormulario();
      mostrarAviso(`Registro confirmado: ${registro.nombres} · ${registro.vacunaNombre} — ${registro.dosis}.`);
      $('#primerNombre').focus();
    } catch (err) {
      const error = $('#confirmar-error');
      error.textContent = err.message;
      error.classList.remove('hidden');
      error.focus();
      boton.disabled = false;
    }
  }

  /* ── Usuarios ── */
  function actualizarBadgePendientes() {
    const total = S.contarPendientes();
    const badge = $('#badgePendientes');
    badge.textContent = total;
    badge.style.display = total > 0 ? '' : 'none';
  }

  function renderUsuarios() {
    if (!esMaster) return;

    const usuarios = S.getUsuarios();
    const pendientes = usuarios.filter((u) => u.estado === 'pendiente');
    const aprobados = usuarios.filter((u) => u.estado === 'aprobado' || u.estado === 'suspendido');

    $('#contadorPendientes').textContent = `${pendientes.length} ${pendientes.length === 1 ? 'pendiente' : 'pendientes'}`;
    $('#contadorUsuarios').textContent = `${aprobados.length} ${aprobados.length === 1 ? 'usuario' : 'usuarios'}`;
    actualizarBadgePendientes();

    $('#tablaPendientes').innerHTML = pendientes.length === 0
      ? '<tr><td colspan="6" class="empty-cell">No hay solicitudes pendientes.</td></tr>'
      : pendientes.map((u) => {
        const centro = S.centroPorId(u.centroId);
        return `
          <tr>
            <td><p class="cell-name">${esc(u.nombre)}</p></td>
            <td class="cell-mono">${esc(u.correo)}</td>
            <td><span class="chip chip-info">${esc(S.etiquetaRol(u.rol))}</span></td>
            <td class="cell-location">${centro ? `<strong>${esc(centro.nombre)}</strong><span>${esc(centro.municipio)}</span>` : '—'}</td>
            <td class="cell-nowrap">${esc(fmtFechaHora(u.creadoEn))}</td>
            <td>
              <div class="row-actions">
                <button type="button" class="action action-ok" data-aprobar="${esc(u.id)}">
                  <i class="fas fa-check"></i> Aprobar
                </button>
                <button type="button" class="action action-danger" data-rechazar="${esc(u.id)}">
                  <i class="fas fa-times"></i> Rechazar
                </button>
              </div>
            </td>
          </tr>`;
      }).join('');

    $('#tablaUsuarios').innerHTML = aprobados.length === 0
      ? '<tr><td colspan="6" class="empty-cell">Todavía no hay usuarios aprobados.</td></tr>'
      : aprobados.map((u) => {
        const centro = S.centroPorId(u.centroId);
        const esPropio = u.id === sesion.userId;
        const estado = u.estado === 'suspendido'
          ? '<span class="status-chip status-suspended"><i class="fas fa-ban"></i> Suspendido</span>'
          : '<span class="status-chip status-ok"><i class="fas fa-check"></i> Aprobado</span>';
        const accion = esPropio
          ? '<span class="chip chip-info">Tú</span>'
          : u.estado === 'suspendido'
            ? `<button type="button" class="action action-ok" data-reactivar="${esc(u.id)}"><i class="fas fa-rotate-left"></i> Reactivar</button>`
            : `<button type="button" class="action action-danger" data-suspender="${esc(u.id)}"><i class="fas fa-ban"></i> Suspender</button>`;
        return `
          <tr>
            <td><p class="cell-name">${esc(u.nombre)}</p></td>
            <td class="cell-mono">${esc(u.correo)}</td>
            <td>${esc(S.etiquetaRol(u.rol))}</td>
            <td class="cell-location">${centro ? `<strong>${esc(centro.nombre)}</strong><span>${esc(centro.municipio)}</span>` : '—'}</td>
            <td>${estado}</td>
            <td><div class="row-actions">${accion}</div></td>
          </tr>`;
      }).join('');
  }

  function actualizarCentroAprobar() {
    const esRolCentro = $('#aprobar-rol').value === 'centro';
    $('#aprobar-centro-wrap').hidden = !esRolCentro;
    $('#aprobar-centro').required = esRolCentro;
  }

  function abrirAprobar(id) {
    const usuario = S.buscarUsuario(id);
    if (!usuario) return;
    usuarioAprobar = usuario;

    $('#aprobar-resumen').innerHTML = `Solicitud de <strong>${esc(usuario.nombre)}</strong> · ${esc(usuario.correo)}<br>Rol solicitado: ${esc(S.etiquetaRol(usuario.rol))}`;
    $('#aprobar-rol').value = usuario.rol;
    $('#aprobar-centro').innerHTML = '<option value="">Seleccione un centro…</option>' + opcionesCentrosHTML();
    $('#aprobar-centro').value = usuario.centroId || '';
    $('#aprobar-error').classList.add('hidden');
    actualizarCentroAprobar();
    $('#dlg-aprobar').showModal();
  }

  function pedirConfirmacion({ titulo, mensaje, texto, accion }) {
    $('#titulo-accion').textContent = titulo;
    $('#accion-mensaje').textContent = mensaje;
    $('#btn-confirmar-accion').innerHTML = `<i class="fas fa-check"></i> ${esc(texto || 'Confirmar')}`;
    accionConfirmar = accion;
    $('#dlg-confirmar-accion').showModal();
  }

  /* ── Avisos y sesión ── */
  function mostrarAviso(mensaje, tipo = 'ok') {
    const aviso = $('#aviso');
    aviso.className = 'toast ' + (tipo === 'ok' ? 'toast-ok' : 'toast-error');
    aviso.textContent = mensaje;
    window.clearTimeout(mostrarAviso.timer);
    mostrarAviso.timer = window.setTimeout(() => aviso.classList.add('hidden'), 5000);
  }

  function configurarSesion() {
    const rol = ROLES[sesion.rol] || { corto: sesion.rol, nombre: sesion.rol };
    $('#chipNombre').textContent = sesion.nombre;
    $('#chipRol').textContent = rol.corto;
    $('#chipUsuario').title = sesion.correo;
    $('#fecha-hoy').textContent = (() => {
      const fecha = new Date().toLocaleDateString('es-VE', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
      });
      return fecha.charAt(0).toUpperCase() + fecha.slice(1);
    })();

    $('#navUsuariosItem').hidden = !esMaster;

    if (esRevisor) {
      $('#panelFormulario').hidden = true;
      $('#layoutRegistro').classList.add('solo-tabla');
      $('#subtituloRol').textContent = 'Consulta los registros y valida las dosis aplicadas.';
      $('#chipCentro').innerHTML = '<i class="fas fa-users"></i> Todos los centros';
    } else if (esCentro) {
      const centro = S.centroPorId(sesion.centroId);
      $('#subtituloRol').textContent = centro
        ? `Registra dosis para ${centro.nombre} y consulta solo el historial de tu centro.`
        : 'Registra las dosis aplicadas en tu centro de salud.';
      $('#chipCentro').innerHTML = `<i class="fas fa-hospital"></i> ${esc(centro ? centro.nombre : 'Sin centro asignado')}`;
      $('#titulo-tabla').innerHTML = '<i class="fas fa-list-check"></i> Registros de mi centro';
    } else {
      $('#subtituloRol').textContent = 'Administra usuarios y supervisa los registros de vacunación.';
      $('#chipCentro').innerHTML = '<i class="fas fa-crown"></i> Administración Master';
    }
  }

  function mostrarVista(vista) {
    const usuarios = vista === 'usuarios' && esMaster;
    $('#vistaRegistro').hidden = usuarios;
    $('#vistaUsuarios').hidden = !usuarios;
    $('#navRegistro').classList.toggle('active', !usuarios);
    $('#navUsuarios').classList.toggle('active', usuarios);
    if (usuarios) renderUsuarios();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ── Eventos ── */
  function conectarEventos() {
    $('#form-registro').addEventListener('submit', (event) => {
      event.preventDefault();
      actualizarLimitesFechas();
      const datos = new FormData(event.target);
      const claveVacuna = String(datos.get('vacuna'));
      const vacuna = VACUNAS[claveVacuna];

      const primerNombre = String(datos.get('primerNombre') || '').trim();
      const segundoNombre = String(datos.get('segundoNombre') || '').trim();
      const primerApellido = String(datos.get('primerApellido') || '').trim();
      const segundoApellido = String(datos.get('segundoApellido') || '').trim();

      if (!primerNombre || !segundoNombre || !primerApellido || !segundoApellido) {
        mostrarAviso('Completa los cuatro campos del nombre del paciente.', 'error');
        return;
      }
      if (!vacuna) {
        mostrarAviso('Selecciona una vacuna válida.', 'error');
        return;
      }

      const centroId = esCentro
        ? (sesion.centroId || String(datos.get('centro') || ''))
        : String(datos.get('centro') || '');
      const centro = CENTROS.find((item) => item.id === centroId);
      if (!centro) {
        mostrarAviso('Selecciona el centro de salud.', 'error');
        return;
      }

      const fechaNacimiento = String(datos.get('fechaNacimiento') || '');
      const fechaAplicacion = String(datos.get('fechaAplicacion') || '');
      if (fechaNacimiento && fechaAplicacion && fechaAplicacion < fechaNacimiento) {
        mostrarAviso('La fecha de aplicación no puede ser anterior al nacimiento.', 'error');
        return;
      }

      const representanteNombre = String(datos.get('representanteNombre') || '').trim();
      const representanteApellido = String(datos.get('representanteApellido') || '').trim();
      const representanteCedula = String(datos.get('representanteCedula') || '').trim().toUpperCase();
      const representanteTelefono = String(datos.get('representanteTelefono') || '').trim();
      const hayRepresentante = Boolean(representanteNombre || representanteApellido || representanteCedula);

      if (hayRepresentante && (!representanteNombre || !representanteApellido)) {
        mostrarAviso('Completa nombre y apellido del representante, o deja los campos vacíos.', 'error');
        return;
      }

      const representanteDatos = hayRepresentante ? {
        nombre: representanteNombre,
        apellido: representanteApellido,
        cedula: representanteCedula,
        telefono: representanteTelefono
      } : null;

      const cedula = String(datos.get('cedula') || '').trim().toUpperCase();
      const telefono = String(datos.get('telefono') || '').trim();
      const correo = String(datos.get('correo') || '').trim();
      const sexo = String(datos.get('sexo') || '');
      const dosis = String(datos.get('dosis') || '');
      const lote = String(datos.get('lote') || '').trim().toUpperCase();
      const observaciones = String(datos.get('observaciones') || '').trim();

      registroPendiente = {
        primerNombre,
        segundoNombre,
        primerApellido,
        segundoApellido,
        nombres: [primerNombre, segundoNombre, primerApellido, segundoApellido].join(' '),
        cedula,
        fechaNacimiento,
        sexo,
        representante: representanteDatos
          ? [representanteDatos.nombre, representanteDatos.apellido].join(' ')
          : '',
        telefono,
        correo,
        vacuna: claveVacuna,
        vacunaNombre: vacuna.nombre,
        dosis,
        fechaAplicacion,
        lote,
        centroId: centro.id,
        centro: centro.nombre,
        estado: centro.estado,
        municipio: centro.municipio,
        parroquia: centro.parroquia,
        observaciones,
        confirmado: false,
        confirmadoEn: '',
        validado: false,
        validadoPor: '',
        validadoEn: '',
        creadoPor: sesion.correo,
        creadoPorNombre: sesion.nombre,
        creadoEn: new Date().toISOString(),
        payload: {
          centroId,
          primerNombre,
          segundoNombre,
          primerApellido,
          segundoApellido,
          cedula,
          fechaNacimiento,
          sexo,
          telefono,
          correo,
          representante: representanteDatos,
          vacuna: claveVacuna,
          dosis,
          fechaAplicacion,
          lote,
          observaciones
        }
      };

      mostrarConfirmacion(registroPendiente);
    });

    $('#form-registro').addEventListener('reset', () => {
      $('#aviso').classList.add('hidden');
      window.setTimeout(() => {
        if (esCentro && sesion.centroId) $('#centro').value = sesion.centroId;
        prepararFormulario();
      }, 0);
    });

    $('#centro').addEventListener('change', actualizarUbicacionCentro);
    $('#vacuna').addEventListener('change', actualizarDosis);

    $('#cedula').addEventListener('blur', (event) => {
      let valor = event.target.value.trim().toUpperCase().replace(/\s+/g, '');
      if (/^\d+$/.test(valor)) valor = `V-${valor}`;
      if (/^[VEJP]-?\d+$/.test(valor) && !valor.includes('-')) valor = `${valor[0]}-${valor.slice(1)}`;
      event.target.value = valor;
    });

    $('#lote').addEventListener('blur', (event) => {
      event.target.value = event.target.value.trim().toUpperCase();
    });

    $('#buscar').addEventListener('input', renderTabla);

    $('#tabla').addEventListener('click', (event) => {
      const ver = event.target.closest('[data-ver]');
      if (ver) {
        abrirDetalle(ver.dataset.ver);
        return;
      }
      const validar = event.target.closest('[data-validar]');
      if (validar) validarRegistro(validar.dataset.validar);
    });

    $('#chk-confirmar').addEventListener('change', () => {
      $('#btn-confirmar-guardar').disabled = !$('#chk-confirmar').checked || !registroPendiente;
    });

    $('#btn-confirmar-guardar').addEventListener('click', confirmarRegistro);

    $('#dlg-confirmar').addEventListener('close', () => {
      if ($('#dlg-confirmar').open) return;
      registroPendiente = null;
      $('#chk-confirmar').checked = false;
      $('#btn-confirmar-guardar').disabled = true;
      $('#confirmar-error').classList.add('hidden');
    });

    $('#btn-validar').addEventListener('click', () => {
      const id = $('#btn-validar').dataset.id;
      if (id) validarRegistro(id);
    });

    $('#btn-salir').addEventListener('click', () => {
      S.logout();
      window.location.href = 'index.html';
    });

    $$('[data-vista]').forEach((boton) => {
      boton.addEventListener('click', () => mostrarVista(boton.dataset.vista));
    });

    $$('[data-cerrar]').forEach((boton) => {
      boton.addEventListener('click', () => {
        const dialogo = document.getElementById(boton.dataset.cerrar);
        if (dialogo && dialogo.open) dialogo.close();
      });
    });

    $('#vistaUsuarios').addEventListener('click', (event) => {
      const aprobar = event.target.closest('[data-aprobar]');
      if (aprobar) {
        abrirAprobar(aprobar.dataset.aprobar);
        return;
      }

      const rechazar = event.target.closest('[data-rechazar]');
      if (rechazar) {
        const usuario = S.buscarUsuario(rechazar.dataset.rechazar);
        if (!usuario) return;
        pedirConfirmacion({
          titulo: 'Rechazar solicitud',
          mensaje: `¿Rechazar la solicitud de ${usuario.nombre} (${usuario.correo})? Su correo no podrá ingresar.`,
          texto: 'Rechazar',
          accion: async () => {
            await S.rechazarUsuario(usuario.id);
            renderUsuarios();
            mostrarAviso(`Solicitud rechazada: ${usuario.correo}.`);
          }
        });
        return;
      }

      const suspender = event.target.closest('[data-suspender]');
      if (suspender) {
        const usuario = S.buscarUsuario(suspender.dataset.suspender);
        if (!usuario) return;
        pedirConfirmacion({
          titulo: 'Suspender usuario',
          mensaje: `¿Suspender el acceso de ${usuario.nombre} (${usuario.correo})?`,
          texto: 'Suspender',
          accion: async () => {
            await S.cambiarEstadoUsuario(usuario.id, 'suspendido');
            renderUsuarios();
            mostrarAviso(`Usuario suspendido: ${usuario.correo}.`);
          }
        });
        return;
      }

      const reactivar = event.target.closest('[data-reactivar]');
      if (reactivar) {
        const usuario = S.buscarUsuario(reactivar.dataset.reactivar);
        if (!usuario) return;
        pedirConfirmacion({
          titulo: 'Reactivar usuario',
          mensaje: `¿Reactivar el acceso de ${usuario.nombre} (${usuario.correo})?`,
          texto: 'Reactivar',
          accion: async () => {
            await S.cambiarEstadoUsuario(usuario.id, 'aprobado');
            renderUsuarios();
            mostrarAviso(`Usuario reactivado: ${usuario.correo}.`);
          }
        });
      }
    });

    $('#aprobar-rol').addEventListener('change', actualizarCentroAprobar);

    $('#btn-aprobar').addEventListener('click', async () => {
      if (!usuarioAprobar) return;
      const error = $('#aprobar-error');
      const rolAprobado = $('#aprobar-rol').value;
      try {
        const aprobado = await S.aprobarUsuario(usuarioAprobar.id, {
          rol: rolAprobado,
          centroId: $('#aprobar-centro').value
        });
        usuarioAprobar = null;
        $('#dlg-aprobar').close();
        renderUsuarios();
        mostrarAviso(`Solicitud aprobada: ${aprobado.correo} · ${S.etiquetaRol(rolAprobado)}.`);
      } catch (err) {
        error.textContent = err.message;
        error.classList.remove('hidden');
      }
    });

    $('#btn-confirmar-accion').addEventListener('click', async () => {
      if (!accionConfirmar) return;
      try {
        await accionConfirmar();
        $('#dlg-confirmar-accion').close();
      } catch (err) {
        mostrarAviso(err.message, 'error');
      }
    });

    $('#dlg-confirmar-accion').addEventListener('close', () => {
      accionConfirmar = null;
    });

    $('#dlg-aprobar').addEventListener('close', () => {
      usuarioAprobar = null;
      $('#aprobar-error').classList.add('hidden');
    });

    $('#dlg-detalle').addEventListener('close', () => {
      registroDetalle = null;
    });

    window.addEventListener('sisalud:usuarios', () => {
      if (esMaster) renderUsuarios();
      else actualizarBadgePendientes();
    });

    window.addEventListener('storage', (event) => {
      if (!event.key || event.key === S.KEY_USUARIOS || event.key === S.KEY_SESION) {
        const actual = S.getSession();
        if (!actual) {
          S.logout();
          window.location.replace('index.html');
          return;
        }
        sesion = actual;
        if (esMaster) renderUsuarios();
      }
    });
  }

  async function iniciar() {
    try {
      await S.init();
    } catch {
      window.alert('No se pudo verificar la sesión con el servidor.');
      return;
    }

    sesion = S.requireSession();
    if (!sesion) return;

    esCentro = sesion.rol === 'centro';
    esRevisor = sesion.rol === 'revisor';
    esMaster = sesion.rol === 'master';
    puedeValidar = esRevisor || esMaster;

    configurarSesion();
    inicializarCentros();
    try {
      registros = await cargarRegistros();
    } catch (err) {
      registros = [];
      mostrarAviso(err.message, 'error');
    }
    prepararFormulario();
    renderTabla();
    if (esMaster) renderUsuarios();
    actualizarBadgePendientes();
    conectarEventos();
  }

  iniciar();
})();

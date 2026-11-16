const express = require("express");
const personas = require("../../models/personas");
const dosis = require("../../models/dosis");
const vacunas = require("../../models/vacunas");
const vacunasDosis = require("../../models/vacunas_dosis");
const centros = require("../../models/centros");
const { requireAuth, requireRole, sessionUser } = require("../../middleware/auth");
const asyncHandler = require("../../utils/async-handler");

const router = express.Router();
router.use(requireAuth);

const SEXOS = ["Femenino", "Masculino", "Otro"];

function texto(valor) {
    return String(valor === null || valor === undefined ? "" : valor).trim();
}

function esFechaValida(valor) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
    const [anio, mes, dia] = valor.split("-").map(Number);
    const fecha = new Date(Date.UTC(anio, mes - 1, dia));
    return fecha.getUTCFullYear() === anio &&
        fecha.getUTCMonth() === mes - 1 &&
        fecha.getUTCDate() === dia;
}

function fechaISO(valor) {
    if (!valor) return null;
    if (typeof valor === "string") return valor.slice(0, 10);
    const fecha = new Date(valor);
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    const dia = String(fecha.getDate()).padStart(2, "0");
    return `${anio}-${mes}-${dia}`;
}

function timestamp(valor) {
    return valor ? new Date(valor).toISOString() : null;
}

function hoyLocal() {
    return fechaISO(new Date());
}

function mapRegistro(fila) {
    return {
        id: fila.id,
        nombres: fila.persona || "",
        primerNombre: fila.nombre1 || "",
        segundoNombre: fila.nombre2 || "",
        primerApellido: fila.apellido1 || "",
        segundoApellido: fila.apellido2 || "",
        cedula: fila.cedula || "",
        fechaNacimiento: fechaISO(fila.fecha_nacimiento),
        sexo: fila.sexo || "",
        representante: fila.representante || "",
        telefono: fila.telefono_personal || "",
        correo: fila.correo || "",
        vacuna: fila.vacuna_codigo,
        vacunaNombre: fila.vacuna || "",
        dosis: fila.etiqueta_dosis,
        numeroDosis: fila.numero_dosis,
        fechaAplicacion: fechaISO(fila.fecha),
        lote: fila.lote || "",
        centroId: fila.centro_codigo,
        centro: fila.centro || "",
        estado: fila.estado || "",
        municipio: fila.municipio || "",
        parroquia: fila.parroquia || "",
        observaciones: fila.observaciones || "",
        confirmado: true,
        confirmadoEn: timestamp(fila.created_at),
        validado: Boolean(fila.validado),
        validadoPor: fila.validador || "",
        validadoEn: timestamp(fila.fecha_validacion),
        creadoPor: fila.usuario_correo || "",
        creadoPorNombre: fila.usuario || "",
        creadoEn: timestamp(fila.created_at)
    };
}

async function centroDelUsuario(usuario) {
    if (!usuario.centroId) return null;
    return centros.obtenerPorCodigo(usuario.centroId);
}

async function resolverRepresentante(datos) {
    const cedula = texto(datos.cedula).toUpperCase();

    if (cedula) {
        const existente = await personas.obtenerPorCedula(cedula);
        if (existente) return existente.id;
    }

    const nombre = texto(datos.nombre);
    const apellido = texto(datos.apellido);
    if (!cedula) {
        const existente = await personas.buscarPorNombre(nombre, apellido);
        if (existente) return existente.id;
    }

    return personas.insertar(
        nombre, null, apellido, null,
        null, null, cedula || null,
        texto(datos.telefono) || null, null, null, null, null
    );
}

router.post("/", asyncHandler(async (req, res) => {
    const usuario = sessionUser(req);
    const body = req.body || {};

    const primerNombre = texto(body.primerNombre);
    const segundoNombre = texto(body.segundoNombre);
    const primerApellido = texto(body.primerApellido);
    const segundoApellido = texto(body.segundoApellido);
    const cedula = texto(body.cedula).toUpperCase();
    const fechaNacimiento = texto(body.fechaNacimiento);
    const sexo = texto(body.sexo);
    const vacunaCodigo = texto(body.vacuna);
    const etiquetaDosis = texto(body.dosis);
    const fechaAplicacion = texto(body.fechaAplicacion);
    const lote = texto(body.lote);
    const observaciones = texto(body.observaciones) || null;
    const telefono = texto(body.telefono) || null;
    const correo = texto(body.correo) || null;

    if (!primerNombre || !primerApellido) {
        return res.status(400).json({ error: "Nombre y apellido son obligatorios.", codigo: "NOMBRE" });
    }
    if (!cedula) {
        return res.status(400).json({ error: "La cédula es obligatoria.", codigo: "CEDULA" });
    }
    if (!esFechaValida(fechaNacimiento) || fechaNacimiento > hoyLocal()) {
        return res.status(400).json({ error: "Fecha de nacimiento inválida.", codigo: "FECHA_NACIMIENTO" });
    }
    if (!SEXOS.includes(sexo)) {
        return res.status(400).json({ error: "Selecciona el sexo.", codigo: "SEXO" });
    }
    if (!esFechaValida(fechaAplicacion)) {
        return res.status(400).json({ error: "Fecha de aplicación inválida.", codigo: "FECHA_APLICACION" });
    }
    if (fechaAplicacion < fechaNacimiento || fechaAplicacion > hoyLocal()) {
        return res.status(400).json({
            error: "La fecha de aplicación debe estar entre el nacimiento y hoy.",
            codigo: "FECHA_APLICACION"
        });
    }
    if (!lote) {
        return res.status(400).json({ error: "El lote es obligatorio.", codigo: "LOTE" });
    }

    let idCentro;
    if (usuario.rol === "centro") {
        const centro = await centroDelUsuario(usuario);
        if (!centro) {
            return res.status(400).json({ error: "Tu usuario no tiene un centro válido.", codigo: "CENTRO" });
        }
        idCentro = centro.id;
    } else {
        const centro = await centros.obtenerPorCodigo(texto(body.centroId));
        if (!centro) {
            return res.status(400).json({ error: "Selecciona un centro de salud válido.", codigo: "CENTRO" });
        }
        idCentro = centro.id;
    }

    const vacuna = await vacunas.obtenerPorCodigo(vacunaCodigo);
    if (!vacuna) {
        return res.status(400).json({ error: "La vacuna no existe.", codigo: "VACUNA" });
    }
    const etiquetas = await vacunasDosis.obtenerPorVacuna(vacuna.id);
    const etiqueta = etiquetas.find((item) => item.etiqueta === etiquetaDosis);
    if (!etiqueta) {
        return res.status(400).json({ error: "La dosis no existe para esa vacuna.", codigo: "DOSIS" });
    }

    const representante = body.representante;
    const hayRepresentante = representante && typeof representante === "object" &&
        (texto(representante.nombre) || texto(representante.apellido) || texto(representante.cedula));
    if (hayRepresentante && (!texto(representante.nombre) || !texto(representante.apellido))) {
        return res.status(400).json({
            error: "Nombre y apellido del representante son obligatorios.",
            codigo: "REPRESENTANTE"
        });
    }

    let persona = await personas.obtenerPorCedula(cedula);
    if (!persona) {
        const idRepresentante = hayRepresentante
            ? await resolverRepresentante(representante)
            : null;

        const idPersona = await personas.insertar(
            primerNombre, segundoNombre || null, primerApellido, segundoApellido || null,
            fechaNacimiento, sexo, cedula, telefono, null, correo, null, idRepresentante
        );
        persona = { id: idPersona };
    }

    let idDosis;
    try {
        idDosis = await dosis.insertar(
            persona.id, vacuna.id, idCentro, usuario.id,
            etiqueta.orden, etiqueta.etiqueta, lote, fechaAplicacion, observaciones
        );
    } catch (err) {
        if (err.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                error: "Esa persona ya tiene registrada la misma dosis de esa vacuna.",
                codigo: "DOSIS_DUPLICADA"
            });
        }
        throw err;
    }

    const creado = await dosis.obtenerPorId(idDosis);
    res.status(201).json(mapRegistro(creado));
}));

router.get("/", asyncHandler(async (req, res) => {
    const usuario = sessionUser(req);
    const filtros = {};

    if (usuario.rol === "centro") {
        const centro = await centroDelUsuario(usuario);
        if (!centro) return res.json([]);
        filtros.idCentro = centro.id;
    }
    if (req.query.validado !== undefined && req.query.validado !== "") {
        filtros.validado = req.query.validado === "1" || req.query.validado === "true";
    }
    if (req.query.buscar) {
        filtros.buscar = texto(req.query.buscar);
    }

    const filas = await dosis.obtenerConFiltros(filtros);
    res.json(filas.map(mapRegistro));
}));

router.get("/:id", asyncHandler(async (req, res) => {
    const usuario = sessionUser(req);
    const fila = await dosis.obtenerPorId(req.params.id);

    if (!fila) {
        return res.status(404).json({ error: "Registro no encontrado.", codigo: "NO_ENCONTRADO" });
    }
    if (usuario.rol === "centro" && fila.centro_codigo !== usuario.centroId) {
        return res.status(403).json({ error: "No autorizado para ver ese registro.", codigo: "NO_PERMISO" });
    }

    res.json(mapRegistro(fila));
}));

router.patch("/:id/validar", requireRole("revisor", "master"), asyncHandler(async (req, res) => {
    const usuario = sessionUser(req);
    const fila = await dosis.obtenerPorId(req.params.id);

    if (!fila) {
        return res.status(404).json({ error: "Registro no encontrado.", codigo: "NO_ENCONTRADO" });
    }
    if (fila.validado) {
        return res.status(409).json({ error: "El registro ya fue validado.", codigo: "YA_VALIDADO" });
    }

    const afectadas = await dosis.validar(req.params.id, usuario.id);
    if (!afectadas) {
        return res.status(409).json({ error: "El registro ya fue validado.", codigo: "YA_VALIDADO" });
    }

    const actualizado = await dosis.obtenerPorId(req.params.id);
    res.json(mapRegistro(actualizado));
}));

module.exports = router;

const express = require("express");
const usuarios = require("../../models/usuarios");
const centros = require("../../models/centros");
const { requireRole, sessionUser } = require("../../middleware/auth");
const { publicUser } = require("../../utils/public-user");
const asyncHandler = require("../../utils/async-handler");

const router = express.Router();
router.use(requireRole("master"));

const ESTADOS = ["pendiente", "aprobado", "rechazado", "suspendido"];
const ROLES_APROBABLES = ["centro", "revisor"];

async function obtenerUsuario(req, res) {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
        res.status(400).json({ error: "Identificador inválido.", codigo: "ID" });
        return null;
    }
    const fila = await usuarios.obtenerPorId(id);
    if (!fila) {
        res.status(404).json({ error: "Usuario no encontrado.", codigo: "NO_ENCONTRADO" });
        return null;
    }
    return fila;
}

function esUnoMismo(req, id) {
    return sessionUser(req).id === id;
}

router.get("/", asyncHandler(async (req, res) => {
    const estado = String(req.query.estado || "").trim();
    if (estado && !ESTADOS.includes(estado)) {
        return res.status(400).json({ error: "Estado no válido.", codigo: "ESTADO" });
    }

    const lista = estado
        ? await usuarios.obtenerPorEstado(estado)
        : await usuarios.obtener();

    res.json(lista.map(publicUser));
}));

router.patch("/:id/aprobar", asyncHandler(async (req, res) => {
    const fila = await obtenerUsuario(req, res);
    if (!fila) return;

    if (esUnoMismo(req, fila.id)) {
        return res.status(409).json({ error: "No puedes modificar tu propia cuenta.", codigo: "PROPIA_CUENTA" });
    }

    const rol = String(req.body.rol || "").trim();
    if (!ROLES_APROBABLES.includes(rol)) {
        return res.status(400).json({ error: "Rol de aprobación no válido.", codigo: "ROL" });
    }

    let idCentro = null;
    if (rol === "centro") {
        const centro = await centros.obtenerPorCodigo(String(req.body.centroId || "").trim());
        if (!centro) {
            return res.status(400).json({ error: "Selecciona un centro de salud válido.", codigo: "CENTRO" });
        }
        idCentro = centro.id;
    }

    await usuarios.actualizar(fila.id, fila.correo, fila.nombre, idCentro, rol);
    await usuarios.actualizarEstado(fila.id, "aprobado", sessionUser(req).id);

    res.json(publicUser(await usuarios.obtenerPorId(fila.id)));
}));

async function cambiarEstado(req, res, estado) {
    const fila = await obtenerUsuario(req, res);
    if (!fila) return;

    if (esUnoMismo(req, fila.id) && estado !== "aprobado") {
        return res.status(409).json({ error: "No puedes modificar tu propia cuenta.", codigo: "PROPIA_CUENTA" });
    }

    if (estado === "aprobado" && fila.rol === "centro" && !fila.id_centro) {
        return res.status(400).json({
            error: "Asigna un centro de salud antes de reactivar a este usuario.",
            codigo: "CENTRO"
        });
    }

    await usuarios.actualizarEstado(fila.id, estado, sessionUser(req).id);
    res.json(publicUser(await usuarios.obtenerPorId(fila.id)));
}

function rutaEstado(estado) {
    return asyncHandler((req, res) => cambiarEstado(req, res, estado));
}

router.patch("/:id/rechazar", rutaEstado("rechazado"));
router.patch("/:id/suspender", rutaEstado("suspendido"));
router.patch("/:id/reactivar", rutaEstado("aprobado"));

module.exports = router;

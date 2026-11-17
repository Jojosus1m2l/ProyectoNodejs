const express = require("express");
const usuarios = require("../../models/usuarios");
const centros = require("../../models/centros");
const { hashPassword, verifyPassword } = require("../../utils/password");
const { sessionUser } = require("../../middleware/auth");
const { publicUser } = require("../../utils/public-user");
const asyncHandler = require("../../utils/async-handler");

const router = express.Router();

const ROLES_SOLICITABLES = ["centro", "revisor"];
const ESTADOS = {
    pendiente: "Tu solicitud está pendiente de aprobación.",
    rechazado: "Tu solicitud fue rechazada.",
    suspendido: "Tu cuenta está suspendida."
};

function normalizarCorreo(correo) {
    return String(correo || "").trim().toLowerCase();
}

function passwordDe(body) {
    return body.password !== undefined ? body.password : body.clave;
}

router.post("/solicitud", asyncHandler(async (req, res) => {
    const nombre = String(req.body.nombre || "").trim();
    const correo = normalizarCorreo(req.body.correo);
    const password = String(passwordDe(req.body) || "");
    const rol = String(req.body.rol || "").trim();
    const centroCodigo = String(req.body.centroId || "").trim();

    if (nombre.length < 3) {
        return res.status(400).json({ error: "Escribe tu nombre completo.", codigo: "NOMBRE" });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
        return res.status(400).json({ error: "Correo electrónico inválido.", codigo: "CORREO" });
    }
    if (password.length < 8) {
        return res.status(400).json({ error: "La contraseña debe tener al menos 8 caracteres.", codigo: "PASSWORD" });
    }
    if (!ROLES_SOLICITABLES.includes(rol)) {
        return res.status(400).json({ error: "Rol no válido para una solicitud.", codigo: "ROL" });
    }

    let idCentro = null;
    if (rol === "centro") {
        if (!centroCodigo) {
            return res.status(400).json({ error: "Selecciona el centro de salud.", codigo: "CENTRO" });
        }
        const centro = await centros.obtenerPorCodigo(centroCodigo);
        if (!centro) {
            return res.status(400).json({ error: "El centro de salud no existe.", codigo: "CENTRO" });
        }
        idCentro = centro.id;
    }

    const existente = await usuarios.obtenerPorCorreo(correo);
    if (existente) {
        const mensaje = existente.estado === "pendiente"
            ? "Ya existe una solicitud pendiente con ese correo."
            : "Ese correo ya tiene una cuenta.";
        return res.status(409).json({ error: mensaje, codigo: "CORREO_EXISTE" });
    }

    const passwordHash = await hashPassword(password);
    const id = await usuarios.insertar({ correo, nombre, passwordHash, idCentro, rol, estado: "pendiente" });
    const creado = await usuarios.obtenerPorId(id);
    res.status(201).json(publicUser(creado));
}));

router.post("/login", asyncHandler(async (req, res) => {
    const correo = normalizarCorreo(req.body.correo);
    const password = String(passwordDe(req.body) || "");

    const usuario = await usuarios.obtenerPorCorreo(correo);
    if (!usuario || !(await verifyPassword(password, usuario.password_hash))) {
        return res.status(401).json({ error: "Credenciales inválidas.", codigo: "CREDENCIALES" });
    }

    if (usuario.estado !== "aprobado") {
        return res.status(403).json({
            error: ESTADOS[usuario.estado] || "Tu cuenta no está habilitada.",
            codigo: `ESTADO_${usuario.estado.toUpperCase()}`
        });
    }

    const publico = publicUser(usuario);
    if (req.body.recordar === true) {
        req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000;
    }
    req.session.usuario = publico;
    res.json(publico);
}));

router.post("/logout", (req, res) => {
    if (!req.session) return res.status(204).end();
    req.session.destroy(() => res.status(204).end());
});

router.get("/me", asyncHandler(async (req, res) => {
    const actual = sessionUser(req);
    if (!actual) {
        return res.status(401).json({ error: "No autenticado.", codigo: "NO_AUTH" });
    }

    const usuario = await usuarios.obtenerPorId(actual.id);
    if (!usuario || usuario.estado !== "aprobado") {
        req.session.destroy(() => {});
        return res.status(401).json({ error: "Sesión no válida.", codigo: "NO_AUTH" });
    }

    res.json(publicUser(usuario));
}));

module.exports = router;

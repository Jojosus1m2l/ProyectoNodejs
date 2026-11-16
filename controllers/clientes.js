const express = require("express");
const router = express.Router();

const clientesModel = require("../models/clientes");

function listar(req, res) {
    clientesModel
        .obtener()
        .then(clientes => {
            res.render("clientes/ver", {
                clientes: clientes,
            });
        })
        .catch(() => {
            return res.status(500).send("Error obteniendo Clientes");
        });
}

function formularioAgregar(req, res) {
    res.render("clientes/agregar");
}

function insertar(req, res) {
    const { cedula, nombre, apellido, direccion, telefono } = req.body;
    if (!cedula || !nombre || !apellido || !direccion || !telefono) {
        return res.status(500).send("No hay datos del cliente");
    }
    clientesModel
        .insertar(cedula, nombre, apellido, direccion, telefono)
        .then(() => {
            res.redirect("/clientes");
        })
        .catch(() => {
            return res.status(500).send("Error Registrando Cliente");
        });
}

function eliminar(req, res) {
    clientesModel
        .eliminar(req.params.id)
        .then(() => {
            res.redirect("/clientes");
        })
        .catch(() => {
            return res.status(500).send("Error eliminando");
        });
}

function formularioEditar(req, res) {
    clientesModel
        .obtenerPorId(req.params.id)
        .then(clientes => {
            if (clientes) {
                res.render("clientes/editar", {
                    clientes: clientes,
                });
            } else {
                return res.status(500).send("No existe Cliente con ese id");
            }
        })
        .catch(() => {
            return res.status(500).send("Error obteniendo Cliente");
        });
}

function actualizar(req, res) {
    const { id, cedula, nombre, apellido, direccion, telefono } = req.body;
    if (!nombre || !apellido || !id || !cedula || !direccion || !telefono) {
        return res.status(500).send("No hay suficientes datos");
    }
    clientesModel
        .actualizar(id, cedula, nombre, apellido, direccion, telefono)
        .then(() => {
            res.redirect("/clientes");
        })
        .catch(() => {
            return res.status(500).send("Error actualizando cliente");
        });
}

router.get("/", listar);
router.get("/agregar", formularioAgregar);
router.post("/insertar", insertar);
router.get("/eliminar/:id", eliminar);
router.get("/editar/:id", formularioEditar);
router.post("/actualizar/", actualizar);

module.exports = router;

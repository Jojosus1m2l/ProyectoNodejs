const express = require("express");
const router = express.Router();

const productosModel = require("../models/productos");

function listar(req, res) {
    productosModel
        .obtener()
        .then(productos => {
            res.render("productos/ver", {
                productos: productos,
            });
        })
        .catch(() => {
            return res.status(500).send("Error obteniendo productos");
        });
}

function formularioAgregar(req, res) {
    res.render("productos/agregar");
}

function insertar(req, res) {
    const { nombre, precio } = req.body;
    if (!nombre || !precio) {
        return res.status(500).send("No hay nombre o precio");
    }
    productosModel
        .insertar(nombre, precio)
        .then(() => {
            res.redirect("/productos");
        })
        .catch(() => {
            return res.status(500).send("Error insertando producto");
        });
}

function eliminar(req, res) {
    productosModel
        .eliminar(req.params.id)
        .then(() => {
            res.redirect("/productos");
        })
        .catch(() => {
            return res.status(500).send("Error eliminando");
        });
}

function formularioEditar(req, res) {
    productosModel
        .obtenerPorId(req.params.id)
        .then(producto => {
            if (producto) {
                res.render("productos/editar", {
                    producto: producto,
                });
            } else {
                return res.status(500).send("No existe producto con ese id");
            }
        })
        .catch(() => {
            return res.status(500).send("Error obteniendo producto");
        });
}

function actualizar(req, res) {
    const { id, nombre, precio } = req.body;
    if (!nombre || !precio || !id) {
        return res.status(500).send("No hay suficientes datos");
    }
    productosModel
        .actualizar(id, nombre, precio)
        .then(() => {
            res.redirect("/productos");
        })
        .catch(() => {
            return res.status(500).send("Error actualizando producto");
        });
}

router.get("/", listar);
router.get("/agregar", formularioAgregar);
router.post("/insertar", insertar);
router.get("/eliminar/:id", eliminar);
router.get("/editar/:id", formularioEditar);
router.post("/actualizar/", actualizar);

module.exports = router;

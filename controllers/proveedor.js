const express = require("express");
const router = express.Router();

const proveedorModel = require("../models/proveedor");

function listar(req, res) {
    proveedorModel
        .obtener()
        .then(proveedor => {
            res.render("proveedor/ver", {
                proveedor: proveedor,
            });
        })
        .catch(() => {
            return res.status(500).send("Error obteniendo proveedor");
        });
}

function formularioAgregar(req, res) {
    res.render("proveedor/agregar");
}

function insertar(req, res) {
    const { rif, empresa, direccion } = req.body;
    if (!rif || !empresa || !direccion) {
        return res.status(500).send("No hay datos para Registrar");
    }
    proveedorModel
        .insertar(rif, empresa, direccion)
        .then(() => {
            res.redirect("/proveedor");
        })
        .catch(() => {
            return res.status(500).send("Error insertando Proveedor");
        });
}

function eliminar(req, res) {
    proveedorModel
        .eliminar(req.params.id)
        .then(() => {
            res.redirect("/proveedor");
        })
        .catch(() => {
            return res.status(500).send("Error eliminando");
        });
}

function formularioEditar(req, res) {
    proveedorModel
        .obtenerPorId(req.params.id)
        .then(proveedor => {
            if (proveedor) {
                res.render("proveedor/editar", {
                    proveedor: proveedor,
                });
            } else {
                return res.status(500).send("No existe proveedor con ese id");
            }
        })
        .catch(() => {
            return res.status(500).send("Error obteniendo proveedor");
        });
}

function actualizar(req, res) {
    const { id, empresa, direccion, rif } = req.body;
    if (!empresa || !direccion || !id || !rif) {
        return res.status(500).send("No hay suficientes datos");
    }
    proveedorModel
        .actualizar(id, empresa, direccion, rif)
        .then(() => {
            res.redirect("/proveedor");
        })
        .catch(() => {
            return res.status(500).send("Error actualizando Proveedor");
        });
}

router.get("/", listar);
router.get("/agregar", formularioAgregar);
router.post("/insertar", insertar);
router.get("/eliminar/:id", eliminar);
router.get("/editar/:id", formularioEditar);
router.post("/actualizar/", actualizar);

module.exports = router;

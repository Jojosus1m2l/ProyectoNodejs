const express = require("express");
const centros = require("../../models/centros");
const vacunas = require("../../models/vacunas");
const vacunasDosis = require("../../models/vacunas_dosis");
const asyncHandler = require("../../utils/async-handler");

const router = express.Router();

const ROLES = {
    centro: "Centro de salud",
    revisor: "Revisión",
    master: "Coordinación"
};

router.get("/", asyncHandler(async (req, res) => {
    const [listaCentros, listaVacunas, etiquetas] = await Promise.all([
        centros.obtener(),
        vacunas.obtener(),
        vacunasDosis.obtener()
    ]);

    const mapaVacunas = {};
    for (const vacuna of listaVacunas) {
        mapaVacunas[vacuna.codigo] = {
            nombre: vacuna.nombre,
            esquema: vacuna.esquema || "",
            dosis: []
        };
    }
    for (const etiqueta of etiquetas) {
        const vacuna = mapaVacunas[etiqueta.vacuna_codigo];
        if (vacuna) vacuna.dosis.push(etiqueta.etiqueta);
    }

    res.json({
        centros: listaCentros.map((centro) => ({
            id: centro.codigo,
            nombre: centro.nombre,
            estado: centro.estado,
            municipio: centro.municipio,
            parroquia: centro.parroquia
        })),
        vacunas: mapaVacunas,
        roles: ROLES
    });
}));

module.exports = router;

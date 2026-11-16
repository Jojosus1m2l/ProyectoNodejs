const usuarios = require("../models/usuarios");
const centros = require("../models/centros");
const { hashPassword } = require("../utils/password");

const DEMO = [
    {
        nombre: "Coordinación SISALUD",
        correo: "master@sisalud.gob.ve",
        password: "Master2026",
        rol: "master",
        centroCodigo: null
    },
    {
        nombre: "Personal Hospital San Juan",
        correo: "centro@sisalud.gob.ve",
        password: "Centro2026",
        rol: "centro",
        centroCodigo: "hospital-san-juan"
    },
    {
        nombre: "Revisión SISALUD",
        correo: "revisor@sisalud.gob.ve",
        password: "Revisor2026",
        rol: "revisor",
        centroCodigo: null
    }
];

async function seedDemo() {
    for (const demo of DEMO) {
        const centro = demo.centroCodigo
            ? await centros.obtenerPorCodigo(demo.centroCodigo)
            : null;

        if (demo.centroCodigo && !centro) {
            throw new Error(`No existe el centro demo ${demo.centroCodigo}`);
        }

        const idCentro = centro ? centro.id : null;
        const hash = await hashPassword(demo.password);
        const existente = await usuarios.obtenerPorCorreo(demo.correo);

        if (existente) {
            await usuarios.actualizar(existente.id, demo.correo, demo.nombre, idCentro, demo.rol);
            await usuarios.actualizarEstado(existente.id, "aprobado", null);
            await usuarios.actualizarPassword(existente.id, hash);
        } else {
            await usuarios.insertar(demo.correo, demo.nombre, hash, idCentro, demo.rol, "aprobado");
        }
    }
}

if (require.main === module) {
    const conexion = require("../conexion_vacunas");
    seedDemo()
        .then(() => {
            console.log("Usuarios demo creados/actualizados.");
            conexion.end();
        })
        .catch((err) => {
            console.error(err);
            conexion.end();
            process.exitCode = 1;
        });
}

module.exports = { seedDemo, DEMO };

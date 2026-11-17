const conexion = require("../conexion_vacunas");
const { consultar, insertar, obtenerUno, ejecutar } = require("./_consultas");

module.exports = {
    insertar({ estado, municipio, parroquia }) {
        return insertar(conexion, `insert into ubicaciones (estado, municipio, parroquia) values (?, ?, ?)`,
            [estado, municipio, parroquia]);
    },

    obtener() {
        return consultar(conexion,
            `select id, estado, municipio, parroquia, created_at, updated_at
                 from ubicaciones
                 order by estado, municipio, parroquia`);
    },

    obtenerPorId(id) {
        return obtenerUno(conexion,
            `select id, estado, municipio, parroquia, created_at, updated_at
                 from ubicaciones
                 where id = ?`, [id]);
    },

    actualizar({ id, estado, municipio, parroquia }) {
        return ejecutar(conexion,
            `update ubicaciones
                 set estado = ?, municipio = ?, parroquia = ?
                 where id = ?`,
            [estado, municipio, parroquia, id]);
    },

    eliminar(id) {
        return ejecutar(conexion, `delete from ubicaciones where id = ?`, [id]);
    }
};

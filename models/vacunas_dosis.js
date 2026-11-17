const conexion = require("../conexion_vacunas");
const { consultar, insertar, ejecutar } = require("./_consultas");

module.exports = {
    insertar({ idVacuna, etiqueta, orden = 1 }) {
        return insertar(conexion, `insert into vacunas_dosis (id_vacuna, etiqueta, orden) values (?, ?, ?)`,
            [idVacuna, etiqueta, orden]);
    },

    obtener() {
        return consultar(conexion,
            `select vd.id, vd.id_vacuna, vd.etiqueta, vd.orden,
                        v.codigo as vacuna_codigo, v.nombre as vacuna_nombre
                 from vacunas_dosis vd
                 join vacunas v on v.id = vd.id_vacuna
                 order by v.nombre, vd.orden`);
    },

    obtenerPorVacuna(idVacuna) {
        return consultar(conexion,
            `select id, id_vacuna, etiqueta, orden
                 from vacunas_dosis
                 where id_vacuna = ?
                 order by orden`, [idVacuna]);
    },

    actualizar({ id, etiqueta, orden }) {
        return ejecutar(conexion, `update vacunas_dosis set etiqueta = ?, orden = ? where id = ?`, [etiqueta, orden, id]);
    },

    eliminar(id) {
        return ejecutar(conexion, `delete from vacunas_dosis where id = ?`, [id]);
    }
};

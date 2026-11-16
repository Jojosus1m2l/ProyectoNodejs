const conexion = require("../conexion_vacunas");

module.exports = {
    insertar(idVacuna, etiqueta, orden = 1) {
        return new Promise((resolve, reject) => {
            conexion.query(
                `insert into vacunas_dosis (id_vacuna, etiqueta, orden) values (?, ?, ?)`,
                [idVacuna, etiqueta, orden],
                (err, resultados) => {
                    if (err) reject(err);
                    else resolve(resultados.insertId);
                }
            );
        });
    },

    obtener() {
        return new Promise((resolve, reject) => {
            conexion.query(
                `select vd.id, vd.id_vacuna, vd.etiqueta, vd.orden,
                        v.codigo as vacuna_codigo, v.nombre as vacuna_nombre
                 from vacunas_dosis vd
                 join vacunas v on v.id = vd.id_vacuna
                 order by v.nombre, vd.orden`,
                (err, resultados) => {
                    if (err) reject(err);
                    else resolve(resultados);
                }
            );
        });
    },

    obtenerPorVacuna(idVacuna) {
        return new Promise((resolve, reject) => {
            conexion.query(
                `select id, id_vacuna, etiqueta, orden
                 from vacunas_dosis
                 where id_vacuna = ?
                 order by orden`,
                [idVacuna],
                (err, resultados) => {
                    if (err) reject(err);
                    else resolve(resultados);
                }
            );
        });
    },

    actualizar(id, etiqueta, orden) {
        return new Promise((resolve, reject) => {
            conexion.query(
                `update vacunas_dosis set etiqueta = ?, orden = ? where id = ?`,
                [etiqueta, orden, id],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    },

    eliminar(id) {
        return new Promise((resolve, reject) => {
            conexion.query(
                `delete from vacunas_dosis where id = ?`,
                [id],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }
};

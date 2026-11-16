const conexion = require("../conexion_vacunas");

module.exports = {
    insertar(estado, municipio, parroquia) {
        return new Promise((resolve, reject) => {
            conexion.query(
                `insert into ubicaciones (estado, municipio, parroquia) values (?, ?, ?)`,
                [estado, municipio, parroquia],
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
                `select id, estado, municipio, parroquia, created_at, updated_at
                 from ubicaciones
                 order by estado, municipio, parroquia`,
                (err, resultados) => {
                    if (err) reject(err);
                    else resolve(resultados);
                }
            );
        });
    },

    obtenerPorId(id) {
        return new Promise((resolve, reject) => {
            conexion.query(
                `select id, estado, municipio, parroquia, created_at, updated_at
                 from ubicaciones
                 where id = ?`,
                [id],
                (err, resultados) => {
                    if (err) reject(err);
                    else resolve(resultados[0]);
                }
            );
        });
    },

    actualizar(id, estado, municipio, parroquia) {
        return new Promise((resolve, reject) => {
            conexion.query(
                `update ubicaciones
                 set estado = ?, municipio = ?, parroquia = ?
                 where id = ?`,
                [estado, municipio, parroquia, id],
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
                `delete from ubicaciones where id = ?`,
                [id],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }
};

const conexion = require("../conexion_vacunas");

module.exports = {
    insertar(codigo, nombre, descripcion, esquema, fabricante, dosisRequeridas = 1) {
        return new Promise((resolve, reject) => {
            conexion.query(
                `insert into vacunas
                   (codigo, nombre, descripcion, esquema, fabricante, dosis_requeridas)
                 values (?, ?, ?, ?, ?, ?)`,
                [codigo, nombre, descripcion, esquema, fabricante, dosisRequeridas],
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
                `select id, codigo, nombre, descripcion, esquema, fabricante,
                        dosis_requeridas, created_at, updated_at
                 from vacunas
                 order by nombre`,
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
                `select id, codigo, nombre, descripcion, esquema, fabricante,
                        dosis_requeridas, created_at, updated_at
                 from vacunas
                 where id = ?`,
                [id],
                (err, resultados) => {
                    if (err) reject(err);
                    else resolve(resultados[0]);
                }
            );
        });
    },

    obtenerPorCodigo(codigo) {
        return new Promise((resolve, reject) => {
            conexion.query(
                `select id, codigo, nombre, descripcion, esquema, fabricante,
                        dosis_requeridas, created_at, updated_at
                 from vacunas
                 where codigo = ?`,
                [codigo],
                (err, resultados) => {
                    if (err) reject(err);
                    else resolve(resultados[0]);
                }
            );
        });
    },

    actualizar(id, codigo, nombre, descripcion, esquema, fabricante, dosisRequeridas) {
        return new Promise((resolve, reject) => {
            conexion.query(
                `update vacunas
                 set codigo = ?, nombre = ?, descripcion = ?, esquema = ?,
                     fabricante = ?, dosis_requeridas = ?
                 where id = ?`,
                [codigo, nombre, descripcion, esquema, fabricante, dosisRequeridas, id],
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
                `delete from vacunas where id = ?`,
                [id],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }
};

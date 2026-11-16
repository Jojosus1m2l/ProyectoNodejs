const conexion = require("../conexion_vacunas");

module.exports = {
    insertar(codigo, nombre, idUbicacion) {
        return new Promise((resolve, reject) => {
            conexion.query(
                `insert into centros (codigo, nombre, id_ubicacion) values (?, ?, ?)`,
                [codigo, nombre, idUbicacion],
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
                `select c.id, c.codigo, c.nombre, c.id_ubicacion,
                        u.estado, u.municipio, u.parroquia,
                        c.created_at, c.updated_at
                 from centros c
                 join ubicaciones u on u.id = c.id_ubicacion
                 order by c.nombre`,
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
                `select c.id, c.codigo, c.nombre, c.id_ubicacion,
                        u.estado, u.municipio, u.parroquia,
                        c.created_at, c.updated_at
                 from centros c
                 join ubicaciones u on u.id = c.id_ubicacion
                 where c.id = ?`,
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
                `select c.id, c.codigo, c.nombre, c.id_ubicacion,
                        u.estado, u.municipio, u.parroquia,
                        c.created_at, c.updated_at
                 from centros c
                 join ubicaciones u on u.id = c.id_ubicacion
                 where c.codigo = ?`,
                [codigo],
                (err, resultados) => {
                    if (err) reject(err);
                    else resolve(resultados[0]);
                }
            );
        });
    },

    actualizar(id, codigo, nombre, idUbicacion) {
        return new Promise((resolve, reject) => {
            conexion.query(
                `update centros set codigo = ?, nombre = ?, id_ubicacion = ? where id = ?`,
                [codigo, nombre, idUbicacion, id],
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
                `delete from centros where id = ?`,
                [id],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }
};

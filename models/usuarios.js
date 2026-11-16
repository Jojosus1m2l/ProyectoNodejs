const conexion = require("../conexion_vacunas");

// passwordHash debe llegar ya cifrado desde utils/password.js.
module.exports = {
    insertar(correo, nombre, passwordHash, idCentro = null, rol = "centro", estado = "pendiente") {
        return new Promise((resolve, reject) => {
            conexion.query(
                `insert into usuarios
                   (correo, nombre, password_hash, id_centro, rol, estado)
                 values (?, ?, ?, ?, ?, ?)`,
                [correo, nombre, passwordHash, idCentro, rol, estado],
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
                `select u.id, u.correo, u.nombre, u.id_centro, c.codigo as centro_codigo,
                        u.rol, u.estado, u.id_aprobador, u.fecha_aprobacion,
                        a.correo as aprobador_correo,
                        u.created_at, u.updated_at
                 from usuarios u
                 left join centros c on c.id = u.id_centro
                 left join usuarios a on a.id = u.id_aprobador
                 order by u.nombre`,
                (err, resultados) => {
                    if (err) reject(err);
                    else resolve(resultados);
                }
            );
        });
    },

    obtenerPorEstado(estado) {
        return new Promise((resolve, reject) => {
            conexion.query(
                `select u.id, u.correo, u.nombre, u.id_centro, c.codigo as centro_codigo,
                        u.rol, u.estado, u.id_aprobador, u.fecha_aprobacion,
                        a.correo as aprobador_correo,
                        u.created_at, u.updated_at
                 from usuarios u
                 left join centros c on c.id = u.id_centro
                 left join usuarios a on a.id = u.id_aprobador
                 where u.estado = ?
                 order by u.created_at`,
                [estado],
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
                `select u.id, u.correo, u.nombre, u.id_centro, c.codigo as centro_codigo,
                        u.rol, u.estado, u.id_aprobador, u.fecha_aprobacion,
                        a.correo as aprobador_correo,
                        u.created_at, u.updated_at
                 from usuarios u
                 left join centros c on c.id = u.id_centro
                 left join usuarios a on a.id = u.id_aprobador
                 where u.id = ?`,
                [id],
                (err, resultados) => {
                    if (err) reject(err);
                    else resolve(resultados[0]);
                }
            );
        });
    },

    // Solo para autenticacion: incluye el hash.
    obtenerPorCorreo(correo) {
        return new Promise((resolve, reject) => {
            conexion.query(
                `select u.id, u.correo, u.nombre, u.password_hash, u.id_centro,
                        c.codigo as centro_codigo, u.rol, u.estado, u.id_aprobador,
                        u.fecha_aprobacion, a.correo as aprobador_correo,
                        u.created_at, u.updated_at
                 from usuarios u
                 left join centros c on c.id = u.id_centro
                 left join usuarios a on a.id = u.id_aprobador
                 where u.correo = ?`,
                [correo],
                (err, resultados) => {
                    if (err) reject(err);
                    else resolve(resultados[0]);
                }
            );
        });
    },

    actualizar(id, correo, nombre, idCentro, rol) {
        return new Promise((resolve, reject) => {
            conexion.query(
                `update usuarios
                 set correo = ?, nombre = ?, id_centro = ?, rol = ?
                 where id = ?`,
                [correo, nombre, idCentro, rol, id],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    },

    actualizarEstado(id, estado, idAprobador = null) {
        return new Promise((resolve, reject) => {
            conexion.query(
                `update usuarios
                 set estado = ?, id_aprobador = ?,
                     fecha_aprobacion = case when ? = 'aprobado' then now() else fecha_aprobacion end
                 where id = ?`,
                [estado, idAprobador, estado, id],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    },

    actualizarPassword(id, passwordHash) {
        return new Promise((resolve, reject) => {
            conexion.query(
                `update usuarios set password_hash = ? where id = ?`,
                [passwordHash, id],
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
                `delete from usuarios where id = ?`,
                [id],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }
};

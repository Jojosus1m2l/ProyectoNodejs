const conexion = require("../conexion_vacunas");
const { consultar, insertar, obtenerUno, ejecutar } = require("./_consultas");

// passwordHash debe llegar ya cifrado desde utils/password.js.

const SELECT_BASE = `select u.id, u.correo, u.nombre, u.id_centro, c.codigo as centro_codigo,
                        u.rol, u.estado, u.id_aprobador, u.fecha_aprobacion,
                        a.correo as aprobador_correo,
                        u.created_at, u.updated_at
                 from usuarios u
                 left join centros c on c.id = u.id_centro
                 left join usuarios a on a.id = u.id_aprobador`;

module.exports = {
    insertar(correo, nombre, passwordHash, idCentro = null, rol = "centro", estado = "pendiente") {
        return insertar(conexion,
            `insert into usuarios
                   (correo, nombre, password_hash, id_centro, rol, estado)
                 values (?, ?, ?, ?, ?, ?)`,
            [correo, nombre, passwordHash, idCentro, rol, estado]);
    },

    obtener() {
        return consultar(conexion, `${SELECT_BASE}
                 order by u.nombre`);
    },

    obtenerPorEstado(estado) {
        return consultar(conexion, `${SELECT_BASE}
                 where u.estado = ?
                 order by u.created_at`, [estado]);
    },

    obtenerPorId(id) {
        return obtenerUno(conexion, `${SELECT_BASE}
                 where u.id = ?`, [id]);
    },

    // Solo para autenticacion: incluye el hash.
    obtenerPorCorreo(correo) {
        return obtenerUno(conexion,
            `select u.id, u.correo, u.nombre, u.password_hash, u.id_centro,
                        c.codigo as centro_codigo, u.rol, u.estado, u.id_aprobador,
                        u.fecha_aprobacion, a.correo as aprobador_correo,
                        u.created_at, u.updated_at
                 from usuarios u
                 left join centros c on c.id = u.id_centro
                 left join usuarios a on a.id = u.id_aprobador
                 where u.correo = ?`, [correo]);
    },

    actualizar(id, correo, nombre, idCentro, rol) {
        return ejecutar(conexion,
            `update usuarios
                 set correo = ?, nombre = ?, id_centro = ?, rol = ?
                 where id = ?`,
            [correo, nombre, idCentro, rol, id]);
    },

    actualizarEstado(id, estado, idAprobador = null) {
        return ejecutar(conexion,
            `update usuarios
                 set estado = ?, id_aprobador = ?,
                     fecha_aprobacion = case when ? = 'aprobado' then now() else fecha_aprobacion end
                 where id = ?`,
            [estado, idAprobador, estado, id]);
    },

    actualizarPassword(id, passwordHash) {
        return ejecutar(conexion, `update usuarios set password_hash = ? where id = ?`, [passwordHash, id]);
    },

    eliminar(id) {
        return ejecutar(conexion, `delete from usuarios where id = ?`, [id]);
    }
};

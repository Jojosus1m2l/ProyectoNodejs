const conexion = require("../conexion_vacunas");
const { consultar, insertar, obtenerUno, ejecutar } = require("./_consultas");

// Un certificado certifica UNA dosis concreta.
// Los campos nombre_completo, cedula, nombre_vacuna y fecha_aplicacion
// son un snapshot: se copian al emitir y no deben cambiar despues.

const SELECT_BASE = `select c.id, c.codigo, c.id_dosis, c.id_examen, c.id_usuario,
                        c.fecha_expedicion, c.fecha_vencimiento, c.nombre_completo,
                        c.cedula, c.nombre_vacuna, c.fecha_aplicacion,
                        c.created_at, c.updated_at,
                        d.id_persona, d.numero_dosis, d.lote,
                        ce.nombre as centro
                 from certificados c
                 join dosis d on d.id = c.id_dosis
                 join centros ce on ce.id = d.id_centro`;

module.exports = {
    insertar(codigo, idDosis, idExamen, idUsuario, fechaExpedicion, fechaVencimiento,
             nombreCompleto, cedula, nombreVacuna, fechaAplicacion) {
        return insertar(conexion,
            `insert into certificados
                   (codigo, id_dosis, id_examen, id_usuario, fecha_expedicion,
                    fecha_vencimiento, nombre_completo, cedula, nombre_vacuna,
                    fecha_aplicacion)
                 values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [codigo, idDosis, idExamen, idUsuario, fechaExpedicion,
             fechaVencimiento, nombreCompleto, cedula, nombreVacuna,
             fechaAplicacion]);
    },

    obtener() {
        return consultar(conexion, `${SELECT_BASE}
                 order by c.fecha_expedicion desc, c.id desc`);
    },

    obtenerPorId(id) {
        return obtenerUno(conexion, `${SELECT_BASE}
                 where c.id = ?`, [id]);
    },

    // Validacion publica de un certificado por su codigo
    obtenerPorCodigo(codigo) {
        return obtenerUno(conexion,
            `select c.id, c.codigo, c.id_dosis, c.fecha_expedicion,
                        c.fecha_vencimiento, c.nombre_completo, c.cedula,
                        c.nombre_vacuna, c.fecha_aplicacion,
                        d.numero_dosis, d.lote,
                        ce.nombre as centro
                 from certificados c
                 join dosis d on d.id = c.id_dosis
                 join centros ce on ce.id = d.id_centro
                 where c.codigo = ?`,
            [codigo]);
    },

    // Solo para correcciones administrativas. El snapshot no deberia variar.
    actualizar(id, codigo, idDosis, idExamen, idUsuario, fechaExpedicion,
               fechaVencimiento, nombreCompleto, cedula, nombreVacuna, fechaAplicacion) {
        return ejecutar(conexion,
            `update certificados
                 set codigo = ?, id_dosis = ?, id_examen = ?, id_usuario = ?,
                     fecha_expedicion = ?, fecha_vencimiento = ?,
                     nombre_completo = ?, cedula = ?, nombre_vacuna = ?,
                     fecha_aplicacion = ?
                 where id = ?`,
            [codigo, idDosis, idExamen, idUsuario, fechaExpedicion,
             fechaVencimiento, nombreCompleto, cedula, nombreVacuna,
             fechaAplicacion, id]);
    },

    eliminar(id) {
        return ejecutar(conexion, `delete from certificados where id = ?`, [id]);
    }
};

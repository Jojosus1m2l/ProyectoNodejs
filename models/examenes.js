const conexion = require("../conexion_vacunas");
const { consultar, insertar, obtenerUno, ejecutar } = require("./_consultas");

module.exports = {
    insertar(idPersona, nombreExamen, fechaCarga, resultado, archivo) {
        return insertar(conexion,
            `insert into examenes
                   (id_persona, nombre_examen, fecha_carga, resultado, archivo)
                 values (?, ?, ?, ?, ?)`,
            [idPersona, nombreExamen, fechaCarga, resultado, archivo]);
    },

    obtener() {
        return consultar(conexion,
            `select e.id, e.id_persona, e.nombre_examen, e.fecha_carga,
                        e.resultado, e.archivo, e.created_at, e.updated_at,
                        concat_ws(' ', p.nombre1, p.nombre2, p.apellido1, p.apellido2) as persona
                 from examenes e
                 join personas p on p.id = e.id_persona
                 order by e.fecha_carga desc, e.id desc`);
    },

    obtenerPorId(id) {
        return obtenerUno(conexion,
            `select e.id, e.id_persona, e.nombre_examen, e.fecha_carga,
                        e.resultado, e.archivo, e.created_at, e.updated_at,
                        concat_ws(' ', p.nombre1, p.nombre2, p.apellido1, p.apellido2) as persona
                 from examenes e
                 join personas p on p.id = e.id_persona
                 where e.id = ?`, [id]);
    },

    // Examenes de una persona
    obtenerPorPersona(idPersona) {
        return consultar(conexion,
            `select id, id_persona, nombre_examen, fecha_carga, resultado, archivo,
                        created_at, updated_at
                 from examenes
                 where id_persona = ?
                 order by fecha_carga desc, id desc`, [idPersona]);
    },

    actualizar(id, idPersona, nombreExamen, fechaCarga, resultado, archivo) {
        return ejecutar(conexion,
            `update examenes
                 set id_persona = ?, nombre_examen = ?, fecha_carga = ?,
                     resultado = ?, archivo = ?
                 where id = ?`,
            [idPersona, nombreExamen, fechaCarga, resultado, archivo, id]);
    },

    eliminar(id) {
        return ejecutar(conexion, `delete from examenes where id = ?`, [id]);
    }
};

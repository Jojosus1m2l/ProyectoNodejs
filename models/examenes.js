const conexion = require("../conexion_vacunas");

module.exports = {
    insertar(idPersona, nombreExamen, fechaCarga, resultado, archivo) {
        return new Promise((resolve, reject) => {
            conexion.query(
                `insert into examenes
                   (id_persona, nombre_examen, fecha_carga, resultado, archivo)
                 values (?, ?, ?, ?, ?)`,
                [idPersona, nombreExamen, fechaCarga, resultado, archivo],
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
                `select e.id, e.id_persona, e.nombre_examen, e.fecha_carga,
                        e.resultado, e.archivo, e.created_at, e.updated_at,
                        concat_ws(' ', p.nombre1, p.nombre2, p.apellido1, p.apellido2) as persona
                 from examenes e
                 join personas p on p.id = e.id_persona
                 order by e.fecha_carga desc, e.id desc`,
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
                `select e.id, e.id_persona, e.nombre_examen, e.fecha_carga,
                        e.resultado, e.archivo, e.created_at, e.updated_at,
                        concat_ws(' ', p.nombre1, p.nombre2, p.apellido1, p.apellido2) as persona
                 from examenes e
                 join personas p on p.id = e.id_persona
                 where e.id = ?`,
                [id],
                (err, resultados) => {
                    if (err) reject(err);
                    else resolve(resultados[0]);
                }
            );
        });
    },

    // Examenes de una persona
    obtenerPorPersona(idPersona) {
        return new Promise((resolve, reject) => {
            conexion.query(
                `select id, id_persona, nombre_examen, fecha_carga, resultado, archivo,
                        created_at, updated_at
                 from examenes
                 where id_persona = ?
                 order by fecha_carga desc, id desc`,
                [idPersona],
                (err, resultados) => {
                    if (err) reject(err);
                    else resolve(resultados);
                }
            );
        });
    },

    actualizar(id, idPersona, nombreExamen, fechaCarga, resultado, archivo) {
        return new Promise((resolve, reject) => {
            conexion.query(
                `update examenes
                 set id_persona = ?, nombre_examen = ?, fecha_carga = ?,
                     resultado = ?, archivo = ?
                 where id = ?`,
                [idPersona, nombreExamen, fechaCarga, resultado, archivo, id],
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
                `delete from examenes where id = ?`,
                [id],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }
};

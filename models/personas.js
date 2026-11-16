const conexion = require("../conexion_vacunas");

// Personas unifica pacientes y representantes.
// idRepresentante = null  -> persona adulta/independiente.
// idRepresentante = id    -> dependiente de ese representante.
module.exports = {
    insertar(nombre1, nombre2, apellido1, apellido2, fechaNacimiento, sexo, cedula,
             telefonoPersonal, telefonoCasa, correo, rif, idRepresentante) {
        return new Promise((resolve, reject) => {
            conexion.query(
                `insert into personas
                   (nombre1, nombre2, apellido1, apellido2, fecha_nacimiento, sexo,
                    cedula, telefono_personal, telefono_casa, correo, rif,
                    id_representante)
                 values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [nombre1, nombre2, apellido1, apellido2, fechaNacimiento, sexo,
                 cedula, telefonoPersonal, telefonoCasa, correo, rif,
                 idRepresentante],
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
                `select p.id, p.nombre1, p.nombre2, p.apellido1, p.apellido2,
                        p.fecha_nacimiento, p.sexo, p.cedula, p.telefono_personal,
                        p.telefono_casa, p.correo, p.rif, p.id_representante,
                        concat_ws(' ', r.nombre1, r.nombre2, r.apellido1, r.apellido2) as representante,
                        p.created_at, p.updated_at
                 from personas p
                 left join personas r on r.id = p.id_representante
                 order by p.apellido1, p.nombre1`,
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
                `select p.id, p.nombre1, p.nombre2, p.apellido1, p.apellido2,
                        p.fecha_nacimiento, p.sexo, p.cedula, p.telefono_personal,
                        p.telefono_casa, p.correo, p.rif, p.id_representante,
                        concat_ws(' ', r.nombre1, r.nombre2, r.apellido1, r.apellido2) as representante,
                        p.created_at, p.updated_at
                 from personas p
                 left join personas r on r.id = p.id_representante
                 where p.id = ?`,
                [id],
                (err, resultados) => {
                    if (err) reject(err);
                    else resolve(resultados[0]);
                }
            );
        });
    },

    obtenerPorCedula(cedula) {
        return new Promise((resolve, reject) => {
            conexion.query(
                `select id, nombre1, nombre2, apellido1, apellido2,
                        fecha_nacimiento, sexo, cedula, telefono_personal, telefono_casa,
                        correo, rif, id_representante, created_at, updated_at
                 from personas
                 where cedula = ?`,
                [cedula],
                (err, resultados) => {
                    if (err) reject(err);
                    else resolve(resultados[0]);
                }
            );
        });
    },

    buscarPorNombre(nombre1, apellido1) {
        return new Promise((resolve, reject) => {
            conexion.query(
                `select id, nombre1, nombre2, apellido1, apellido2,
                        fecha_nacimiento, sexo, cedula, telefono_personal, telefono_casa,
                        correo, rif, id_representante, created_at, updated_at
                 from personas
                 where nombre1 = ? and apellido1 = ?
                 limit 1`,
                [nombre1, apellido1],
                (err, resultados) => {
                    if (err) reject(err);
                    else resolve(resultados[0]);
                }
            );
        });
    },

    // Hijos / dependientes de un representante
    obtenerDependientes(idRepresentante) {
        return new Promise((resolve, reject) => {
            conexion.query(
                `select id, nombre1, nombre2, apellido1, apellido2,
                        fecha_nacimiento, sexo, cedula, telefono_personal, telefono_casa,
                        correo, rif, id_representante, created_at, updated_at
                 from personas
                 where id_representante = ?
                 order by apellido1, nombre1`,
                [idRepresentante],
                (err, resultados) => {
                    if (err) reject(err);
                    else resolve(resultados);
                }
            );
        });
    },

    actualizar(id, nombre1, nombre2, apellido1, apellido2, fechaNacimiento, sexo, cedula,
                telefonoPersonal, telefonoCasa, correo, rif, idRepresentante) {
        return new Promise((resolve, reject) => {
            conexion.query(
                `update personas
                 set nombre1 = ?, nombre2 = ?, apellido1 = ?, apellido2 = ?,
                     fecha_nacimiento = ?, sexo = ?, cedula = ?, telefono_personal = ?,
                     telefono_casa = ?, correo = ?, rif = ?, id_representante = ?
                 where id = ?`,
                [nombre1, nombre2, apellido1, apellido2, fechaNacimiento, sexo,
                 cedula, telefonoPersonal, telefonoCasa, correo, rif,
                 idRepresentante, id],
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
                `delete from personas where id = ?`,
                [id],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }
};

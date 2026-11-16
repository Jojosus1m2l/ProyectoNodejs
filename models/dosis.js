const conexion = require("../conexion_vacunas");

const SELECT_BASE = `
    select d.id, d.id_persona, d.id_vacuna, d.id_centro, d.id_usuario,
           d.numero_dosis, d.etiqueta_dosis, d.lote, d.fecha, d.observaciones,
           d.validado, d.id_validador, d.fecha_validacion,
           d.created_at, d.updated_at,
           p.nombre1, p.nombre2, p.apellido1, p.apellido2,
           p.cedula, p.sexo, p.fecha_nacimiento, p.telefono_personal, p.correo,
           p.id_representante,
           concat_ws(' ', p.nombre1, p.nombre2, p.apellido1, p.apellido2) as persona,
           concat_ws(' ', r.nombre1, r.nombre2, r.apellido1, r.apellido2) as representante,
           v.nombre as vacuna, v.codigo as vacuna_codigo,
           c.nombre as centro, c.codigo as centro_codigo,
           ub.estado, ub.municipio, ub.parroquia,
           u.nombre as usuario, u.correo as usuario_correo,
           val.nombre as validador
    from dosis d
    join personas p on p.id = d.id_persona
    left join personas r on r.id = p.id_representante
    join vacunas v on v.id = d.id_vacuna
    join centros c on c.id = d.id_centro
    join ubicaciones ub on ub.id = c.id_ubicacion
    left join usuarios u on u.id = d.id_usuario
    left join usuarios val on val.id = d.id_validador`;

module.exports = {
    insertar(idPersona, idVacuna, idCentro, idUsuario, numeroDosis, etiquetaDosis,
             lote, fecha, observaciones) {
        return new Promise((resolve, reject) => {
            conexion.query(
                `insert into dosis
                   (id_persona, id_vacuna, id_centro, id_usuario, numero_dosis,
                    etiqueta_dosis, lote, fecha, observaciones)
                 values (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [idPersona, idVacuna, idCentro, idUsuario, numeroDosis,
                 etiquetaDosis, lote, fecha, observaciones],
                (err, resultados) => {
                    if (err) reject(err);
                    else resolve(resultados.insertId);
                }
            );
        });
    },

    obtener() {
        return this.obtenerConFiltros({});
    },

    obtenerConFiltros({ idCentro = null, validado = null, buscar = null } = {}) {
        return new Promise((resolve, reject) => {
            const where = [];
            const params = [];

            if (idCentro !== null && idCentro !== undefined) {
                where.push("d.id_centro = ?");
                params.push(idCentro);
            }
            if (validado !== null && validado !== undefined) {
                where.push("d.validado = ?");
                params.push(validado ? 1 : 0);
            }
            if (buscar) {
                where.push(`(
                    p.cedula like ? or
                    concat_ws(' ', p.nombre1, p.nombre2, p.apellido1, p.apellido2) like ? or
                    v.nombre like ? or
                    d.lote like ?
                )`);
                const term = `%${buscar}%`;
                params.push(term, term, term, term);
            }

            const sql = SELECT_BASE +
                (where.length ? ` where ${where.join(" and ")}` : "") +
                " order by d.fecha desc, d.id desc";

            conexion.query(sql, params, (err, resultados) => {
                if (err) reject(err);
                else resolve(resultados);
            });
        });
    },

    obtenerPorId(id) {
        return new Promise((resolve, reject) => {
            conexion.query(
                `${SELECT_BASE} where d.id = ?`,
                [id],
                (err, resultados) => {
                    if (err) reject(err);
                    else resolve(resultados[0]);
                }
            );
        });
    },

    // Historial de dosis de una persona
    obtenerPorPersona(idPersona) {
        return new Promise((resolve, reject) => {
            conexion.query(
                `${SELECT_BASE} where d.id_persona = ? order by d.fecha desc`,
                [idPersona],
                (err, resultados) => {
                    if (err) reject(err);
                    else resolve(resultados);
                }
            );
        });
    },

    validar(id, idValidador) {
        return new Promise((resolve, reject) => {
            conexion.query(
                `update dosis
                 set validado = 1, id_validador = ?, fecha_validacion = now()
                 where id = ? and validado = 0`,
                [idValidador, id],
                (err, resultados) => {
                    if (err) reject(err);
                    else resolve(resultados.affectedRows);
                }
            );
        });
    },

    actualizar(id, idPersona, idVacuna, idCentro, idUsuario, numeroDosis,
                etiquetaDosis, lote, fecha, observaciones) {
        return new Promise((resolve, reject) => {
            conexion.query(
                `update dosis
                 set id_persona = ?, id_vacuna = ?, id_centro = ?, id_usuario = ?,
                     numero_dosis = ?, etiqueta_dosis = ?, lote = ?, fecha = ?,
                     observaciones = ?
                 where id = ?`,
                [idPersona, idVacuna, idCentro, idUsuario, numeroDosis,
                 etiquetaDosis, lote, fecha, observaciones, id],
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
                `delete from dosis where id = ?`,
                [id],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
    }
};

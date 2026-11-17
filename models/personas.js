const conexion = require("../conexion_vacunas");
const { consultar, insertar, obtenerUno, ejecutar } = require("./_consultas");

// Personas unifica pacientes y representantes.
// idRepresentante = null  -> persona adulta/independiente.
// idRepresentante = id    -> dependiente de ese representante.
module.exports = {
    insertar({ nombre1, nombre2, apellido1, apellido2, fechaNacimiento, sexo, cedula,
             telefonoPersonal, telefonoCasa, correo, rif, idRepresentante }) {
        return insertar(conexion,
            `insert into personas
                   (nombre1, nombre2, apellido1, apellido2, fecha_nacimiento, sexo,
                    cedula, telefono_personal, telefono_casa, correo, rif,
                    id_representante)
                 values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [nombre1, nombre2, apellido1, apellido2, fechaNacimiento, sexo,
             cedula, telefonoPersonal, telefonoCasa, correo, rif,
             idRepresentante]);
    },

    obtener() {
        return consultar(conexion,
            `select p.id, p.nombre1, p.nombre2, p.apellido1, p.apellido2,
                        p.fecha_nacimiento, p.sexo, p.cedula, p.telefono_personal,
                        p.telefono_casa, p.correo, p.rif, p.id_representante,
                        concat_ws(' ', r.nombre1, r.nombre2, r.apellido1, r.apellido2) as representante,
                        p.created_at, p.updated_at
                 from personas p
                 left join personas r on r.id = p.id_representante
                 order by p.apellido1, p.nombre1`);
    },

    obtenerPorId(id) {
        return obtenerUno(conexion,
            `select p.id, p.nombre1, p.nombre2, p.apellido1, p.apellido2,
                        p.fecha_nacimiento, p.sexo, p.cedula, p.telefono_personal,
                        p.telefono_casa, p.correo, p.rif, p.id_representante,
                        concat_ws(' ', r.nombre1, r.nombre2, r.apellido1, r.apellido2) as representante,
                        p.created_at, p.updated_at
                 from personas p
                 left join personas r on r.id = p.id_representante
                 where p.id = ?`, [id]);
    },

    obtenerPorCedula(cedula) {
        return obtenerUno(conexion,
            `select id, nombre1, nombre2, apellido1, apellido2,
                        fecha_nacimiento, sexo, cedula, telefono_personal, telefono_casa,
                        correo, rif, id_representante, created_at, updated_at
                 from personas
                 where cedula = ?`, [cedula]);
    },

    buscarPorNombre(nombre1, apellido1) {
        return obtenerUno(conexion,
            `select id, nombre1, nombre2, apellido1, apellido2,
                        fecha_nacimiento, sexo, cedula, telefono_personal, telefono_casa,
                        correo, rif, id_representante, created_at, updated_at
                 from personas
                 where nombre1 = ? and apellido1 = ?
                 limit 1`, [nombre1, apellido1]);
    },

    // Hijos / dependientes de un representante
    obtenerDependientes(idRepresentante) {
        return consultar(conexion,
            `select id, nombre1, nombre2, apellido1, apellido2,
                        fecha_nacimiento, sexo, cedula, telefono_personal, telefono_casa,
                        correo, rif, id_representante, created_at, updated_at
                 from personas
                 where id_representante = ?
                 order by apellido1, nombre1`, [idRepresentante]);
    },

    actualizar({ id, nombre1, nombre2, apellido1, apellido2, fechaNacimiento, sexo, cedula,
               telefonoPersonal, telefonoCasa, correo, rif, idRepresentante }) {
        return ejecutar(conexion,
            `update personas
                 set nombre1 = ?, nombre2 = ?, apellido1 = ?, apellido2 = ?,
                     fecha_nacimiento = ?, sexo = ?, cedula = ?, telefono_personal = ?,
                     telefono_casa = ?, correo = ?, rif = ?, id_representante = ?
                 where id = ?`,
            [nombre1, nombre2, apellido1, apellido2, fechaNacimiento, sexo,
             cedula, telefonoPersonal, telefonoCasa, correo, rif,
             idRepresentante, id]);
    },

    eliminar(id) {
        return ejecutar(conexion, `delete from personas where id = ?`, [id]);
    }
};

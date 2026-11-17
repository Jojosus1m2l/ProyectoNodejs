const conexion = require("../conexion_vacunas");
const { consultar, insertar, obtenerUno, ejecutar } = require("./_consultas");

const SELECT_BASE = `select c.id, c.codigo, c.nombre, c.id_ubicacion,
                        u.estado, u.municipio, u.parroquia,
                        c.created_at, c.updated_at
                 from centros c
                 join ubicaciones u on u.id = c.id_ubicacion`;

module.exports = {
    insertar(codigo, nombre, idUbicacion) {
        return insertar(conexion, `insert into centros (codigo, nombre, id_ubicacion) values (?, ?, ?)`,
            [codigo, nombre, idUbicacion]);
    },

    obtener() {
        return consultar(conexion, `${SELECT_BASE}
                 order by c.nombre`);
    },

    obtenerPorId(id) {
        return obtenerUno(conexion, `${SELECT_BASE}
                 where c.id = ?`, [id]);
    },

    obtenerPorCodigo(codigo) {
        return obtenerUno(conexion, `${SELECT_BASE}
                 where c.codigo = ?`, [codigo]);
    },

    actualizar(id, codigo, nombre, idUbicacion) {
        return ejecutar(conexion, `update centros set codigo = ?, nombre = ?, id_ubicacion = ? where id = ?`,
            [codigo, nombre, idUbicacion, id]);
    },

    eliminar(id) {
        return ejecutar(conexion, `delete from centros where id = ?`, [id]);
    }
};

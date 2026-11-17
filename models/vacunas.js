const conexion = require("../conexion_vacunas");
const { consultar, insertar, obtenerUno, ejecutar } = require("./_consultas");

module.exports = {
    insertar(codigo, nombre, descripcion, esquema, fabricante, dosisRequeridas = 1) {
        return insertar(conexion,
            `insert into vacunas
                   (codigo, nombre, descripcion, esquema, fabricante, dosis_requeridas)
                 values (?, ?, ?, ?, ?, ?)`,
            [codigo, nombre, descripcion, esquema, fabricante, dosisRequeridas]);
    },

    obtener() {
        return consultar(conexion,
            `select id, codigo, nombre, descripcion, esquema, fabricante,
                        dosis_requeridas, created_at, updated_at
                 from vacunas
                 order by nombre`);
    },

    obtenerPorId(id) {
        return obtenerUno(conexion,
            `select id, codigo, nombre, descripcion, esquema, fabricante,
                        dosis_requeridas, created_at, updated_at
                 from vacunas
                 where id = ?`, [id]);
    },

    obtenerPorCodigo(codigo) {
        return obtenerUno(conexion,
            `select id, codigo, nombre, descripcion, esquema, fabricante,
                        dosis_requeridas, created_at, updated_at
                 from vacunas
                 where codigo = ?`, [codigo]);
    },

    actualizar(id, codigo, nombre, descripcion, esquema, fabricante, dosisRequeridas) {
        return ejecutar(conexion,
            `update vacunas
                 set codigo = ?, nombre = ?, descripcion = ?, esquema = ?,
                     fabricante = ?, dosis_requeridas = ?
                 where id = ?`,
            [codigo, nombre, descripcion, esquema, fabricante, dosisRequeridas, id]);
    },

    eliminar(id) {
        return ejecutar(conexion, `delete from vacunas where id = ?`, [id]);
    }
};

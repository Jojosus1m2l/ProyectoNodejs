const conexion = require("../conexion");
const { consultar, insertar, obtenerUno, ejecutar } = require("./_consultas");
module.exports = {
    insertar(nombre, precio) {
        return insertar(conexion, `insert into productos (nombre, precio) values (?, ?)`, [nombre, precio]);
    },
    obtener() {
        return consultar(conexion, `select id, nombre, precio from productos`);
    },
    obtenerPorId(id) {
        return obtenerUno(conexion, `select id, nombre, precio from productos where id = ?`, [id]);
    },
    actualizar(id, nombre, precio) {
        return ejecutar(conexion, `update productos
            set nombre = ?,
            precio = ?
            where id = ?`, [nombre, precio, id]);
    },
    eliminar(id) {
        return ejecutar(conexion, `delete from productos
            where id = ?`, [id]);
    }
};

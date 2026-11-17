const conexion = require("../conexion");
const { consultar, insertar, obtenerUno, ejecutar } = require("./_consultas");
module.exports = {
    insertar(cedula, nombre, apellido, direccion, telefono) {
        return insertar(conexion, `insert into clientes (cedula, nombre, apellido, direccion, telefono) values (?, ?, ?, ?, ?)`,
            [cedula, nombre, apellido, direccion, telefono]);
    },
    obtener() {
        return consultar(conexion, `select id, cedula, nombre, apellido, direccion, telefono from clientes`);
    },
    obtenerPorId(id) {
        return obtenerUno(conexion, `select id, cedula, nombre, apellido, direccion, telefono from clientes where id = ?`, [id]);
    },
    actualizar(id, cedula, nombre, apellido, direccion, telefono) {
        return ejecutar(conexion, `update clientes set cedula = ?, nombre = ?, apellido = ?, direccion = ?, telefono = ? where id = ?`,
            [cedula, nombre, apellido, direccion, telefono, id]);
    },
    eliminar(id) {
        return ejecutar(conexion, `delete from clientes
            where id = ?`, [id]);
    }
};

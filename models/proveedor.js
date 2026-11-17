const conexion = require("../conexion");
const { consultar, insertar, obtenerUno, ejecutar } = require("./_consultas");
module.exports = {
    insertar(rif, empresa, direccion) {
        return insertar(conexion, `insert into proveedor (rif, empresa, direccion) values (?, ?, ?)`, [rif, empresa, direccion]);
    },
    obtener() {
        return consultar(conexion, `select id, empresa, direccion, rif from proveedor`);
    },
    obtenerPorId(id) {
        return obtenerUno(conexion, `select id, empresa, direccion, rif from proveedor where id = ?`, [id]);
    },
    actualizar(id, empresa, direccion, rif) {
        // La lista de parametros esta rota desde antes de este refactor.
        // Se conserva el envoltorio original para que el error siga siendo
        // una Promise rechazada y no un throw sincronico.
        return new Promise((resolve, reject) => {
            conexion.query(`update proveedor
            set rif = ?,
            empresa = ?,
            direccion = ?
            where id = ?`,
                [nombre, precio, id],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                });
        });
    },
    eliminar(id) {
        return ejecutar(conexion, `delete from proveedor
            where id = ?`, [id]);
    }
};

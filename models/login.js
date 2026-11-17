const conexion = require("../conexion");
const { obtenerUno } = require("./_consultas");
module.exports = {

    validar(login, password) {
        return obtenerUno(conexion, `select login, password from usuarios where (login = ? and password = ?)`,
            [login, password]);
    },

};

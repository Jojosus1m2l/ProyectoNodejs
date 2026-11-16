const conexion = require("../conexion")
module.exports = {

    validar(login, password) {
        return new Promise((resolve, reject) => {
           conexion.query(`select login, password from usuarios where (login = ? and password = ?)`,
                [login, password],
                (err, resultados) => {
                    //console.log(sql);
                    if (err) reject(err);
                    else
                    resolve(resultados[0]);
                });
        });
    },

}


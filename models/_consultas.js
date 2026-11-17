function consultar(conexion, sql, params = []) {
    return new Promise((resolve, reject) => conexion.query(sql, params, (err, resultados) => err ? reject(err) : resolve(resultados)));
}

async function insertar(conexion, sql, params) {
    const resultados = await consultar(conexion, sql, params);
    return resultados.insertId;
}

async function obtenerUno(conexion, sql, params) {
    const resultados = await consultar(conexion, sql, params);
    return resultados[0];
}

async function ejecutar(conexion, sql, params) {
    await consultar(conexion, sql, params);
}

async function afectados(conexion, sql, params) {
    const resultados = await consultar(conexion, sql, params);
    return resultados.affectedRows;
}

module.exports = { consultar, insertar, obtenerUno, ejecutar, afectados };

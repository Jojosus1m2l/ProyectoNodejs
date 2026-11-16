function iso(value) {
    return value ? new Date(value).toISOString() : null;
}

function publicUser(row) {
    return {
        id: row.id,
        nombre: row.nombre,
        correo: row.correo,
        rol: row.rol,
        centroId: row.centro_codigo || null,
        estado: row.estado,
        creadoEn: iso(row.created_at),
        aprobadoEn: iso(row.fecha_aprobacion),
        aprobadoPor: row.aprobador_correo || null
    };
}

module.exports = { iso, publicUser };

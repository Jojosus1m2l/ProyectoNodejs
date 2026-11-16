function sessionUser(req) {
    return req.session && req.session.usuario ? req.session.usuario : null;
}

function requireAuth(req, res, next) {
    if (!sessionUser(req)) {
        return res.status(401).json({ error: "No autenticado", codigo: "NO_AUTH" });
    }
    next();
}

function requireRole(...roles) {
    return (req, res, next) => {
        const usuario = sessionUser(req);
        if (!usuario) {
            return res.status(401).json({ error: "No autenticado", codigo: "NO_AUTH" });
        }
        if (!roles.includes(usuario.rol)) {
            return res.status(403).json({ error: "No autorizado", codigo: "NO_PERMISO" });
        }
        next();
    };
}

module.exports = { sessionUser, requireAuth, requireRole };

const express = require("express");
const router = express.Router();

const loginModel = require("../models/login");

function inicio(req, res) {
    res.render("index");
}

function validar(req, res) {
    const { login, password } = req.body;

    if (!login || !password) {
        return res.status(400).render("index", {
            abrirLogin: true,
            error: "Escribe usuario y contraseña",
        });
    }

    loginModel
        .validar(login, password)
        .then((resultados) => {
            // El modelo devuelve el usuario encontrado o undefined
            if (resultados) {
                req.session.loggedin = true;
                req.session.login = login;
                res.redirect("/clientes");
            } else {
                res.status(401).render("index", {
                    abrirLogin: true,
                    error: "Usuario y/o Contraseña Incorrecta",
                    login: login,
                });
            }
        })
        .catch(() => {
            return res.status(500).render("index", {
                abrirLogin: true,
                error: "Error Validando Usuario",
                login: login,
            });
        });
}

router.get("/", inicio);
router.post("/login/envio", validar);

module.exports = router;

const mysql = require("mysql");

// Conexion exclusiva para el sistema de vacunacion.
// Deja intacta la conexion original (base "tienda").
module.exports = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "db_vacunas"
});

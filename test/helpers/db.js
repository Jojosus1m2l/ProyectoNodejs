const fs = require("fs");
const path = require("path");
const mysql = require("mysql");

const ROOT = path.resolve(__dirname, "../..");
const DB_NAME = process.env.DB_NAME || "db_vacunas_test";

const baseConfig = {
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  multipleStatements: true
};

let pool = null;

function exec(connection, sql, params = []) {
  return new Promise((resolve, reject) => {
    connection.query(sql, params, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

async function prepareDatabase() {
  const schemaPath = path.join(ROOT, "db_vacunas.sql");
  const sql = fs.readFileSync(schemaPath, "utf8").replace(/db_vacunas/g, DB_NAME);
  const admin = mysql.createConnection(baseConfig);

  try {
    await exec(admin, `drop database if exists \`${DB_NAME}\``);
    await exec(admin, sql);
  } finally {
    admin.end();
  }
}

function getPool() {
  if (!pool) {
    pool = mysql.createPool({ ...baseConfig, database: DB_NAME, multipleStatements: false });
  }
  return pool;
}

function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    getPool().query(sql, params, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

async function truncateAll() {
  const tables = [
    "certificados", "dosis", "examenes", "personas", "vacunas_dosis",
    "vacunas", "usuarios", "centros", "ubicaciones"
  ];
  await query("set foreign_key_checks = 0");
  for (const table of tables) await query(`truncate table \`${table}\``);
  await query("set foreign_key_checks = 1");
}

function close() {
  return new Promise((resolve, reject) => {
    const vacunas = require("../../conexion_vacunas");
    const pending = [];

    if (pool) {
      pending.push(new Promise((res, rej) => pool.end((err) => (err ? rej(err) : res()))));
      pool = null;
    }
    pending.push(new Promise((res, rej) => vacunas.end((err) => (err ? rej(err) : res()))));

    Promise.all(pending).then(() => resolve(), reject);
  });
}

module.exports = { DB_NAME, prepareDatabase, truncateAll, query, close };

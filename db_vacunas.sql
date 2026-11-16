-- ============================================================
--  db_vacunas - esquema alineado con el prototipo SISALUD
--  Motor: MySQL 8.x / MariaDB 10.4+
--
--  Cambios respecto al esquema anterior:
--   1. usuarios: roles centro/revisor/master y estados de aprobacion.
--   2. centros y vacunas: codigo estable para mapear con datos.js.
--   3. vacunas_dosis: etiquetas del esquema de vacunacion.
--   4. personas: sexo.
--   5. dosis: etiqueta, observaciones y validacion por revisor.
--   6. semilla idempotente de 11 centros, 5 vacunas y 16 etiquetas.
-- ============================================================

CREATE DATABASE IF NOT EXISTS db_vacunas
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE db_vacunas;

-- ------------------------------------------------------------
-- Catalogo geografico
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ubicaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    estado VARCHAR(100) NOT NULL,
    municipio VARCHAR(100) NOT NULL,
    parroquia VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_ubicacion (estado, municipio, parroquia)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Centros de vacunacion
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS centros (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(50) NOT NULL UNIQUE,
    nombre VARCHAR(150) NOT NULL,
    id_ubicacion INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_centros_ubicacion FOREIGN KEY (id_ubicacion)
        REFERENCES ubicaciones(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Usuarios del sistema (un centro puede tener varios)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    correo VARCHAR(150) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    id_centro INT NULL,
    rol ENUM('centro', 'revisor', 'master') NOT NULL DEFAULT 'centro',
    estado ENUM('pendiente', 'aprobado', 'rechazado', 'suspendido') NOT NULL DEFAULT 'pendiente',
    id_aprobador INT NULL,
    fecha_aprobacion DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_usuarios_centro FOREIGN KEY (id_centro)
        REFERENCES centros(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_usuarios_aprobador FOREIGN KEY (id_aprobador)
        REFERENCES usuarios(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Catalogo de vacunas (el lote ya no vive aqui)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vacunas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(20) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    esquema VARCHAR(255),
    fabricante VARCHAR(100),
    dosis_requeridas TINYINT UNSIGNED NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Etiquetas de dosis por vacuna (1.ª dosis, 2.º refuerzo, etc.)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vacunas_dosis (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_vacuna INT NOT NULL,
    etiqueta VARCHAR(50) NOT NULL,
    orden TINYINT UNSIGNED NOT NULL DEFAULT 1,
    UNIQUE KEY uq_vacuna_dosis (id_vacuna, etiqueta),
    CONSTRAINT fk_vacunas_dosis_vacuna FOREIGN KEY (id_vacuna)
        REFERENCES vacunas(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Personas: pacientes y representantes en una sola tabla.
-- Si id_representante es NULL, la persona es adulta/independiente.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS personas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre1 VARCHAR(100) NOT NULL,
    nombre2 VARCHAR(100),
    apellido1 VARCHAR(100) NOT NULL,
    apellido2 VARCHAR(100),
    fecha_nacimiento DATE,
    sexo ENUM('Femenino', 'Masculino', 'Otro') NULL,
    cedula VARCHAR(20) UNIQUE,
    telefono_personal VARCHAR(20),
    telefono_casa VARCHAR(20),
    correo VARCHAR(150),
    rif VARCHAR(20),
    id_representante INT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_personas_representante FOREIGN KEY (id_representante)
        REFERENCES personas(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Dosis aplicadas
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dosis (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_persona INT NOT NULL,
    id_vacuna INT NOT NULL,
    id_centro INT NOT NULL,
    id_usuario INT NULL,
    numero_dosis TINYINT UNSIGNED NOT NULL DEFAULT 1,
    etiqueta_dosis VARCHAR(50) NOT NULL,
    lote VARCHAR(50),
    fecha DATE NOT NULL,
    observaciones TEXT,
    validado TINYINT(1) NOT NULL DEFAULT 0,
    id_validador INT NULL,
    fecha_validacion DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_dosis (id_persona, id_vacuna, etiqueta_dosis),
    CONSTRAINT fk_dosis_persona FOREIGN KEY (id_persona)
        REFERENCES personas(id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_dosis_vacuna FOREIGN KEY (id_vacuna)
        REFERENCES vacunas(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_dosis_centro FOREIGN KEY (id_centro)
        REFERENCES centros(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_dosis_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_dosis_validador FOREIGN KEY (id_validador)
        REFERENCES usuarios(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Examenes cargados por persona
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS examenes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    id_persona INT NOT NULL,
    nombre_examen VARCHAR(150) NOT NULL,
    fecha_carga DATE,
    resultado TEXT,
    archivo VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_examenes_persona FOREIGN KEY (id_persona)
        REFERENCES personas(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Certificados: certifican UNA dosis.
-- Guardan snapshot para que sigan siendo validos aunque la persona
-- o la dosis cambien. La FK RESTRICT impide borrar dosis certificadas.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS certificados (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(50) NOT NULL UNIQUE,
    id_dosis INT NOT NULL,
    id_examen INT NULL,
    id_usuario INT NULL,
    fecha_expedicion DATE NOT NULL,
    fecha_vencimiento DATE,
    nombre_completo VARCHAR(255) NOT NULL,
    cedula VARCHAR(20) NOT NULL,
    nombre_vacuna VARCHAR(150) NOT NULL,
    fecha_aplicacion DATE NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_certificados_dosis FOREIGN KEY (id_dosis)
        REFERENCES dosis(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_certificados_examen FOREIGN KEY (id_examen)
        REFERENCES examenes(id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_certificados_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Semilla de catalogos (idempotente)
-- Los datos replican public/js/datos.js del prototipo.
-- ============================================================

INSERT INTO ubicaciones (estado, municipio, parroquia) VALUES
    ('Guárico', 'Juan Germán Roscio', 'San Juan de los Morros'),
    ('Guárico', 'Francisco de Miranda', 'Calabozo'),
    ('Guárico', 'Leonardo Infante', 'Valle de la Pascua'),
    ('Guárico', 'Pedro Zaraza', 'Zaraza'),
    ('Guárico', 'José Tadeo Monagas', 'Altagracia de Orituco'),
    ('Guárico', 'Las Mercedes', 'Las Mercedes del Llano'),
    ('Guárico', 'Julián Mellado', 'El Sombrero'),
    ('Guárico', 'José Félix Ribas', 'Tucupido'),
    ('Guárico', 'Chaguaramas', 'Chaguaramas'),
    ('Guárico', 'Ortiz', 'Cazorla'),
    ('Guárico', 'Santa María de Ipire', 'Santa María de Ipire')
ON DUPLICATE KEY UPDATE id = id;

INSERT INTO centros (codigo, nombre, id_ubicacion)
SELECT 'hospital-san-juan', 'Hospital Central de San Juan de los Morros', id
  FROM ubicaciones WHERE estado = 'Guárico' AND municipio = 'Juan Germán Roscio' AND parroquia = 'San Juan de los Morros'
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), id_ubicacion = VALUES(id_ubicacion);

INSERT INTO centros (codigo, nombre, id_ubicacion)
SELECT 'hospital-calabozo', 'Hospital Dr. Francisco Antonio Rísquez', id
  FROM ubicaciones WHERE estado = 'Guárico' AND municipio = 'Francisco de Miranda' AND parroquia = 'Calabozo'
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), id_ubicacion = VALUES(id_ubicacion);

INSERT INTO centros (codigo, nombre, id_ubicacion)
SELECT 'ambulatorio-valle-pascua', 'Ambulatorio Urbano Valle de la Pascua', id
  FROM ubicaciones WHERE estado = 'Guárico' AND municipio = 'Leonardo Infante' AND parroquia = 'Valle de la Pascua'
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), id_ubicacion = VALUES(id_ubicacion);

INSERT INTO centros (codigo, nombre, id_ubicacion)
SELECT 'ambulatorio-zaraza', 'Ambulatorio Urbano Zaraza', id
  FROM ubicaciones WHERE estado = 'Guárico' AND municipio = 'Pedro Zaraza' AND parroquia = 'Zaraza'
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), id_ubicacion = VALUES(id_ubicacion);

INSERT INTO centros (codigo, nombre, id_ubicacion)
SELECT 'hospital-altagracia', 'Hospital Dr. José Francisco Torrealba', id
  FROM ubicaciones WHERE estado = 'Guárico' AND municipio = 'José Tadeo Monagas' AND parroquia = 'Altagracia de Orituco'
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), id_ubicacion = VALUES(id_ubicacion);

INSERT INTO centros (codigo, nombre, id_ubicacion)
SELECT 'ambulatorio-las-mercedes', 'Ambulatorio Rural Las Mercedes del Llano', id
  FROM ubicaciones WHERE estado = 'Guárico' AND municipio = 'Las Mercedes' AND parroquia = 'Las Mercedes del Llano'
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), id_ubicacion = VALUES(id_ubicacion);

INSERT INTO centros (codigo, nombre, id_ubicacion)
SELECT 'ambulatorio-el-sombrero', 'Ambulatorio Urbano El Sombrero', id
  FROM ubicaciones WHERE estado = 'Guárico' AND municipio = 'Julián Mellado' AND parroquia = 'El Sombrero'
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), id_ubicacion = VALUES(id_ubicacion);

INSERT INTO centros (codigo, nombre, id_ubicacion)
SELECT 'ambulatorio-tucupido', 'Ambulatorio Urbano Tucupido', id
  FROM ubicaciones WHERE estado = 'Guárico' AND municipio = 'José Félix Ribas' AND parroquia = 'Tucupido'
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), id_ubicacion = VALUES(id_ubicacion);

INSERT INTO centros (codigo, nombre, id_ubicacion)
SELECT 'ambulatorio-chaguaramas', 'Ambulatorio Rural Chaguaramas', id
  FROM ubicaciones WHERE estado = 'Guárico' AND municipio = 'Chaguaramas' AND parroquia = 'Chaguaramas'
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), id_ubicacion = VALUES(id_ubicacion);

INSERT INTO centros (codigo, nombre, id_ubicacion)
SELECT 'ambulatorio-cazorla', 'Ambulatorio Rural Cazorla', id
  FROM ubicaciones WHERE estado = 'Guárico' AND municipio = 'Ortiz' AND parroquia = 'Cazorla'
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), id_ubicacion = VALUES(id_ubicacion);

INSERT INTO centros (codigo, nombre, id_ubicacion)
SELECT 'ambulatorio-santa-maria', 'Ambulatorio Rural Santa María de Ipire', id
  FROM ubicaciones WHERE estado = 'Guárico' AND municipio = 'Santa María de Ipire' AND parroquia = 'Santa María de Ipire'
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), id_ubicacion = VALUES(id_ubicacion);

INSERT INTO vacunas (codigo, nombre, esquema, dosis_requeridas) VALUES
    ('bcg', 'BCG (antituberculosa)', 'recién nacido · dosis única', 1),
    ('hepb', 'Hepatitis B', 'recién nacido · dosis única (o serie de 3 dosis)', 4),
    ('penta', 'Pentavalente (DPT + Hib + HB)', '2, 4 y 6 meses', 4),
    ('polio', 'Antipoliomielítica (Sabin)', '2, 4 y 6 meses · refuerzos a los 18 meses y 4–6 años', 5),
    ('srp', 'SRP (sarampión, rubéola, parotiditis)', '12 meses · refuerzo a los 4–6 años', 2)
ON DUPLICATE KEY UPDATE
    nombre = VALUES(nombre),
    esquema = VALUES(esquema),
    dosis_requeridas = VALUES(dosis_requeridas);

INSERT INTO vacunas_dosis (id_vacuna, etiqueta, orden)
SELECT v.id, d.etiqueta, d.orden
  FROM vacunas v
  JOIN (
      SELECT 'bcg' AS codigo, 'Dosis única' AS etiqueta, 1 AS orden
      UNION ALL SELECT 'hepb', 'Dosis única (recién nacido)', 1
      UNION ALL SELECT 'hepb', '1.ª dosis', 2
      UNION ALL SELECT 'hepb', '2.ª dosis', 3
      UNION ALL SELECT 'hepb', '3.ª dosis', 4
      UNION ALL SELECT 'penta', '1.ª dosis', 1
      UNION ALL SELECT 'penta', '2.ª dosis', 2
      UNION ALL SELECT 'penta', '3.ª dosis', 3
      UNION ALL SELECT 'penta', 'Refuerzo', 4
      UNION ALL SELECT 'polio', '1.ª dosis', 1
      UNION ALL SELECT 'polio', '2.ª dosis', 2
      UNION ALL SELECT 'polio', '3.ª dosis', 3
      UNION ALL SELECT 'polio', '1.er refuerzo', 4
      UNION ALL SELECT 'polio', '2.º refuerzo', 5
      UNION ALL SELECT 'srp', '1.ª dosis', 1
      UNION ALL SELECT 'srp', 'Refuerzo', 2
  ) d ON d.codigo = v.codigo
ON DUPLICATE KEY UPDATE orden = VALUES(orden);

CREATE TABLE IF NOT EXISTS factores_emision (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  material TEXT NOT NULL UNIQUE,
  kg_co2_por_kg REAL NOT NULL,
  reciclable INTEGER NOT NULL DEFAULT 1,
  color_contenedor TEXT NOT NULL,
  descripcion TEXT
);

CREATE TABLE IF NOT EXISTS eventos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL,
  asistentes INTEGER NOT NULL,
  duracion_horas REAL NOT NULL,
  fecha_creacion TEXT NOT NULL,
  residuos_json TEXT NOT NULL,
  huella_carbono_kg REAL NOT NULL,
  toneladas_totales REAL NOT NULL
);

-- Registros del personal de limpieza durante el evento
CREATE TABLE IF NOT EXISTS registros_limpieza (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  evento_id       INTEGER NOT NULL,
  zona            TEXT NOT NULL,          -- guardado siempre en UPPER CASE
  tipo_basura     TEXT NOT NULL,          -- PET | Organico | Aluminio | Vidrio | Carton | NoReciclable
  cantidad_bolsas INTEGER NOT NULL DEFAULT 1,
  kg_estimado     REAL NOT NULL,
  timestamp       TEXT NOT NULL,
  FOREIGN KEY (evento_id) REFERENCES eventos(id) ON DELETE CASCADE
);

-- Personal de intendencia y administradores del sistema
CREATE TABLE IF NOT EXISTS usuarios (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre_completo     TEXT    NOT NULL,
  usuario             TEXT    NOT NULL UNIQUE,
  password_hash       TEXT    NOT NULL,
  rol                 TEXT    NOT NULL CHECK(rol IN ('admin','intendente')),
  activo              INTEGER NOT NULL DEFAULT 1,
  fecha_alta          TEXT    NOT NULL,
  fecha_modificacion  TEXT
);

-- Cupones genéricos para invitados (creados por el admin)
CREATE TABLE IF NOT EXISTS cupones (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre            TEXT    NOT NULL,
  descripcion       TEXT,
  categoria         TEXT    NOT NULL DEFAULT 'evento_futuro',
  tipo_descuento    TEXT    NOT NULL CHECK(tipo_descuento IN ('porcentaje','monto','acceso')),
  valor             REAL    NOT NULL DEFAULT 0,
  evento_nombre     TEXT,
  evento_fecha      TEXT,
  evento_venue      TEXT,
  activo            INTEGER NOT NULL DEFAULT 1,
  cantidad_total    INTEGER NOT NULL DEFAULT 50,
  cantidad_usada    INTEGER NOT NULL DEFAULT 0,
  fecha_creacion    TEXT    NOT NULL,
  fecha_vencimiento TEXT
);

-- Sesiones anónimas de invitados (solo UUID — sin PII)
CREATE TABLE IF NOT EXISTS sesiones_invitado (
  session_id      TEXT    PRIMARY KEY,
  registros_count INTEGER NOT NULL DEFAULT 0,
  fecha_inicio    TEXT    NOT NULL,
  fecha_ultima    TEXT    NOT NULL
);

-- Registros de basura por sesión anónima (sin imagen, sin PII)
CREATE TABLE IF NOT EXISTS registros_invitado (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id     TEXT    NOT NULL,
  material       TEXT    NOT NULL,
  confianza      REAL    NOT NULL,
  bote_detectado INTEGER NOT NULL DEFAULT 0,
  timestamp      TEXT    NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sesiones_invitado(session_id)
);

-- Cupones canjeados por sesión
CREATE TABLE IF NOT EXISTS cupones_canjeados (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT    NOT NULL,
  cupon_id   INTEGER NOT NULL,
  codigo     TEXT    NOT NULL UNIQUE,
  timestamp  TEXT    NOT NULL,
  FOREIGN KEY (cupon_id) REFERENCES cupones(id)
);

-- Catálogo de precios de recicladoras en MXN/kg (2025)
CREATE TABLE IF NOT EXISTS precios_recicladoras (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  material         TEXT NOT NULL UNIQUE,
  precio_min_mxn   REAL NOT NULL,
  precio_max_mxn   REAL NOT NULL,
  precio_ref_mxn   REAL NOT NULL,
  recicladora_ref  TEXT NOT NULL,
  actualizado_en   TEXT NOT NULL
);

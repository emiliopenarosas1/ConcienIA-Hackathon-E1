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

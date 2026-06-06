const initSqlJs = require('sql.js');
const fs        = require('fs');
const path      = require('path');
const bcrypt    = require('bcryptjs');
const db        = require('./database');

const DB_PATH = path.join(__dirname, 'datacircular.db');

// Factores de emisión CO2 (kg CO2eq / kg residuo)
// Fuentes: SEMARNAT 2018, EPA WARM Tool 2023, International Aluminium Institute
// PET 6.0: ciclo de vida completo (producción 2.2 + carbono embebido 2.7 + disposición)
// Orgánico 0.5: descomposición anaerobia en relleno (CH4, GWP25); compostaje = 0.027
// Aluminio 8.2: ahorro por reciclaje conservador (producción primaria = 15.1 kg CO2/kg)
// Vidrio 0.85: validado vs. literatura (rango 0.09–0.92 según metodología)
// Cartón 1.1: validado vs. literatura (rango 0.94–1.53 cuna-tumba)
// NoReciclable 1.8: mezcla heterogénea — ajustado de 2.5 a 1.8 (Hub Residuos Circulares BID)
const FACTORES = [
  ['PET',          6.0,  1, 'azul',     'Botellas y envases de plástico PET'],
  ['Organico',     0.5,  1, 'verde',    'Residuos orgánicos compostables'],
  ['Aluminio',     8.2,  1, 'amarillo', 'Latas y envases de aluminio'],
  ['Vidrio',       0.85, 1, 'blanco',   'Botellas y envases de vidrio'],
  ['Carton',       1.1,  1, 'gris',     'Cartón y papel reciclable'],
  ['NoReciclable', 1.8,  0, 'negro',    'Residuos no reciclables (mezcla)'],
];

function buildWrapper(sqljs) {
  let _inTx = false;

  function save() {
    if (_inTx) return; // Never save mid-transaction
    fs.writeFileSync(DB_PATH, Buffer.from(sqljs.export()));
  }

  function makeStmt(sql) {
    return {
      run(...params) {
        const p = params.flat(Infinity).filter(v => v !== undefined);
        sqljs.run(sql, p.length ? p : []);

        // Use prepare+step (not exec) to avoid interfering with open transactions
        const s = sqljs.prepare('SELECT last_insert_rowid() AS id');
        s.step();
        const lastInsertRowid = s.getAsObject().id;
        s.free();

        const changes = sqljs.getRowsModified();
        save();
        return { lastInsertRowid, changes };
      },
      get(...params) {
        const p = params.flat(Infinity).filter(v => v !== undefined);
        const s = sqljs.prepare(sql);
        try {
          if (p.length) s.bind(p);
          return s.step() ? s.getAsObject() : undefined;
        } finally {
          s.free();
        }
      },
      all(...params) {
        const p = params.flat(Infinity).filter(v => v !== undefined);
        const s = sqljs.prepare(sql);
        const rows = [];
        try {
          if (p.length) s.bind(p);
          while (s.step()) rows.push(s.getAsObject());
        } finally {
          s.free();
        }
        return rows;
      },
    };
  }

  return {
    pragma: () => {},
    exec(sql) { sqljs.exec(sql); save(); },
    prepare(sql) { return makeStmt(sql); },
    transaction(fn) {
      return function (...args) {
        _inTx = true;
        sqljs.run('BEGIN');
        try {
          fn(...args);
          sqljs.run('COMMIT');
        } catch (origErr) {
          try { sqljs.run('ROLLBACK'); } catch (_) {}
          _inTx = false;
          throw origErr;
        }
        _inTx = false;
        save();
      };
    },
  };
}

async function initDatabase() {
  const SQL = await initSqlJs();

  let sqljs;
  if (fs.existsSync(DB_PATH)) {
    const data = fs.readFileSync(DB_PATH);
    sqljs = new SQL.Database(data);
  } else {
    sqljs = new SQL.Database();
  }

  Object.assign(db, buildWrapper(sqljs));

  // Create schema (multi-statement DDL)
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  sqljs.exec(schema);

  // Seed emission factors — use sqljs.run() directly to avoid wrapper complexity
  const row = db.prepare('SELECT COUNT(*) AS n FROM factores_emision').get();
  if (row.n === 0) {
    const ins = 'INSERT INTO factores_emision (material, kg_co2_por_kg, reciclable, color_contenedor, descripcion) VALUES (?, ?, ?, ?, ?)';
    for (const r of FACTORES) {
      sqljs.run(ins, r);
    }
    fs.writeFileSync(DB_PATH, Buffer.from(sqljs.export()));
    console.log('[DB] Factores de emisión SEMARNAT insertados.');
  }

  // Seed recycler prices (MXN/kg — fuentes: ECOCE, ALMEXA, Vitro, Smurfit, SEMARNAT 2025)
  const rowP = db.prepare('SELECT COUNT(*) AS n FROM precios_recicladoras').get();
  if (rowP.n === 0) {
    const insP = 'INSERT INTO precios_recicladoras (material, precio_min_mxn, precio_max_mxn, precio_ref_mxn, recicladora_ref, actualizado_en) VALUES (?, ?, ?, ?, ?, ?)';
    const PRECIOS = [
      ['PET',          3.50, 5.50, 4.50, 'ECOCE / PetStar',                      '2025-01-01'],
      ['Aluminio',     18.0, 26.0, 22.0, 'ALMEXA / ReciclaNet',                   '2025-01-01'],
      ['Vidrio',       0.50, 1.20, 0.80, 'Vitro Envases / OI México',             '2025-01-01'],
      ['Carton',       1.50, 2.80, 2.00, 'Smurfit Kappa / G.I. Cadena',           '2025-01-01'],
      ['Organico',     0.20, 0.80, 0.50, 'SIAP / Composta Urbana',                '2025-01-01'],
      ['NoReciclable', 0.00, 0.00, 0.00, 'N/A — disposición final (SEMOVI-CDMX)', '2025-01-01'],
    ];
    for (const r of PRECIOS) {
      sqljs.run(insP, r);
    }
    fs.writeFileSync(DB_PATH, Buffer.from(sqljs.export()));
    console.log('[DB] Precios de recicladoras insertados.');
  }

  // Migration: add categoria column to cupones (if missing)
  try {
    sqljs.exec("ALTER TABLE cupones ADD COLUMN categoria TEXT DEFAULT 'evento_futuro'");
    fs.writeFileSync(DB_PATH, Buffer.from(sqljs.export()));
  } catch (_) { /* column already exists — safe to ignore */ }

  // Seed multi-category coupons — run only if all 4 categories are missing
  const catCheck = db.prepare("SELECT COUNT(DISTINCT categoria) AS n FROM cupones WHERE activo = 1").get();
  if ((catCheck?.n || 0) < 4) {
    const insCup = `INSERT INTO cupones
      (nombre, descripcion, categoria, tipo_descuento, valor, evento_nombre, evento_fecha, evento_venue, activo, cantidad_total, cantidad_usada, fecha_creacion)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 0, ?)`;
    const NOW = new Date().toISOString();
    const CUPONES_MOCK = [
      // ── Eventos futuros ──────────────────────────────────────────────────────
      ['Corona Capital 2026',      '10% de descuento en tus boletos',         'evento_futuro', 'porcentaje', 10,  'Corona Capital 2026',             '2026-11-14', 'Autódromo Hermanos Rodríguez, CDMX', 100, NOW],
      ["Pa'l Norte 2026",          '8% descuento en preventa',                'evento_futuro', 'porcentaje', 8,   "Festival Pa'l Norte 2026",         '2026-03-27', 'Parque Fundidora, Monterrey',        75,  NOW],
      ['Vive Latino 2027',         '15% descuento en preventa exclusiva',     'evento_futuro', 'porcentaje', 15,  'Festival Vive Latino 2027',        '2027-03-20', 'Foro Sol, CDMX',                     60,  NOW],
      ['Semifinal Liguilla MX',    '$150 MXN de descuento en tu boleto',      'evento_futuro', 'monto',      150, 'Semifinal Liguilla MX 2026',       '2026-05-18', 'Estadio Azteca, CDMX',               200, NOW],
      ['FIL Guadalajara 2026',     'Acceso gratuito al recinto ferial',       'evento_futuro', 'acceso',     0,   'Feria Internacional del Libro 2026','2026-11-28', 'Expo Guadalajara',                   500, NOW],
      ['Cumbre Tajín 2026',        '12% descuento en compra de boletos',      'evento_futuro', 'porcentaje', 12,  'Cumbre Tajín 2026',                '2026-03-20', 'Papantla, Veracruz',                  80,  NOW],
      // ── Alimentos ────────────────────────────────────────────────────────────
      ['Refresco gratis',          'Un refresco de tu elección en el evento', 'alimentos',     'acceso',     0,   null, null, 'Stands de bebidas del recinto',   200, NOW],
      ['Snack gratis',             'Una botana/snack en cualquier stand',      'alimentos',     'acceso',     0,   null, null, 'Stands de alimentos del recinto', 200, NOW],
      ['15% en alimentos',         'Descuento en cualquier stand de comida',  'alimentos',     'porcentaje', 15,  null, null, 'Todos los stands de alimentos',   300, NOW],
      ['Combo bebida + snack',     'Bebida + snack a precio especial',        'alimentos',     'monto',      40,  null, null, 'Stand principal de alimentos',    150, NOW],
      // ── Merch ────────────────────────────────────────────────────────────────
      ['Camiseta ConciencIA gratis','T-shirt exclusiva del programa de reciclaje','merch',     'acceso',     0,   null, null, 'Stand del programa ConciencIA',   100, NOW],
      ['20% en merch oficial',     'Descuento en cualquier artículo de merch','merch',         'porcentaje', 20,  null, null, 'Stand de merch oficial del evento',150, NOW],
      ['Pin o parche gratis',      'Pin o parche conmemorativo del evento',   'merch',         'acceso',     0,   null, null, 'Stand de merch',                  250, NOW],
      // ── Descuentos inmediatos ─────────────────────────────────────────────────
      ['$50 de descuento general', 'Aplica en cualquier compra dentro del recinto','descuento','monto',     50,  null, null, 'Recinto del evento',              300, NOW],
      ['Estacionamiento gratis',   'Un boleto de estacionamiento sin costo',  'descuento',     'acceso',     0,   null, null, 'Estacionamiento del recinto',     200, NOW],
      ['10% en el recinto',        'Descuento general en compras del evento', 'descuento',     'porcentaje', 10,  null, null, 'Recinto del evento',              500, NOW],
    ];
    for (const c of CUPONES_MOCK) {
      sqljs.run(insCup, c);
    }
    fs.writeFileSync(DB_PATH, Buffer.from(sqljs.export()));
    console.log('[DB] Cupones de muestra (4 categorías) insertados.');
  }

  // Migration: add usuario_id to registros_limpieza (nullable, for new registrations)
  try {
    sqljs.exec('ALTER TABLE registros_limpieza ADD COLUMN usuario_id INTEGER REFERENCES usuarios(id)');
    fs.writeFileSync(DB_PATH, Buffer.from(sqljs.export()));
  } catch (_) { /* column already exists — safe to ignore */ }

  // Seed admin user if none exists
  const rowU = db.prepare("SELECT COUNT(*) AS n FROM usuarios WHERE rol = 'admin'").get();
  if (rowU.n === 0) {
    const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'admin123';
    const hash = bcrypt.hashSync(ADMIN_PASS, 10);
    sqljs.run(
      "INSERT INTO usuarios (nombre_completo, usuario, password_hash, rol, activo, fecha_alta) VALUES (?, ?, ?, 'admin', 1, ?)",
      ['Administrador', 'admin', hash, new Date().toISOString()]
    );
    fs.writeFileSync(DB_PATH, Buffer.from(sqljs.export()));
    console.log(`[DB] Admin creado — usuario: admin | contraseña: ${ADMIN_PASS}`);
  }

  console.log('[DB] Base de datos lista →', DB_PATH);
}

module.exports = { initDatabase };

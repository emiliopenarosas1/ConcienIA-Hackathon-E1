const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const db = require('./database');

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

  console.log('[DB] Base de datos lista →', DB_PATH);
}

module.exports = { initDatabase };

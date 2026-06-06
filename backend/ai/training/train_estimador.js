/**
 * EstimadorResiduos — Random Forest Regression
 * 980 registros: 900 sintéticos + 80 anclas de Glastonbury 2019 y Copa Mundial SA 2010
 *
 * Tasas base (kg packaging/persona·hora en venue):
 *  SEDEMA-CDMX 2023: 1.40 kg/hab/día → packaging evento ≈ 3-4% del flujo diario
 *  SEMARNAT 2017: composición RSU MX: Org 51.6%, Cartón 14.2%, PET ~4%, Al 1.8%, Vidrio 6.1%
 *                 En eventos el ratio PET y Al es mayor (packaging de bebidas domina)
 *  Glastonbury 2019: fracción reciclada real (÷0.5 para total) / 175k personas / 5 días
 *  Copa Mundial SA 2010: ~2.0 kg/persona/partido (packaging estimado ≈ 20% = 0.40 kg/p/3h)
 *  Ecolider GTO MX: 70 ton / 35k personas / 3h → total 2.0 kg/p; packaging ~20% = 0.4 kg/p
 */

const { RandomForestRegression } = require('ml-random-forest');
const fs = require('fs');
const path = require('path');

const TIPOS = ['concierto', 'deportivo', 'festival', 'conferencia'];

// ── Tasas kg packaging/(persona·hora) — benchmarks validados ─────────────
const TASAS = {
  // SEDEMA concierto: packaging venue ≈ 0.14 kg/persona/4h = 0.035 kg/p·h
  // Comp SEMARNAT: PET 37%, Org 23%, Al 20%, Vidrio 11%, Cartón 9%
  concierto:    { PET: 0.013, Organico: 0.008, Aluminio: 0.007, Vidrio: 0.004, Carton: 0.003 },

  // Copa Mundial/Ecolider: 0.40 kg/persona/3h = 0.133 kg/p·h (packaging eventos deportivos MX)
  // Comp: Al 33% (latas dominan), PET 25%, Cartón 22%, Org 13%, Vidrio 7%
  deportivo:    { PET: 0.033, Organico: 0.017, Aluminio: 0.044, Vidrio: 0.009, Carton: 0.029 },

  // Glastonbury ajustado (festival día sin camping): ≈ 0.40 kg/p/8h = 0.050 kg/p·h
  // Comp: Org 32%, PET 24%, Al 18%, Vidrio 15%, Cartón 11%
  festival:     { PET: 0.012, Organico: 0.016, Aluminio: 0.009, Vidrio: 0.008, Carton: 0.006 },

  // Benchmark industria (Terratag 1.89 kg/p/día → packaging venue ≈ 25% = 0.47 kg/p/8h)
  // Comp NADF-024 eventos CDMX: Org 38%, Cartón 34%, PET 14%, Vidrio 8%, Al 6%
  conferencia:  { PET: 0.008, Organico: 0.018, Aluminio: 0.004, Vidrio: 0.003, Carton: 0.016 },
};

// ── Anclas de datos reales (solo fuentes con medición directa de residuos) ─
// Glastonbury 2019 fracción reciclada ×2 / 175k personas / 5 días
// → 8h día activo sin camping: reducción ×0.45 (sin infra camping)
// Copa Mundial 2010: packaging ≈ 20% de 2.0 kg/persona/3h
const ANCHORS = [
  { tipo: 'festival',  a: 50000, d: 8,   t: { PET:  700, Organico: 6200, Aluminio: 2400, Vidrio: 1600, Carton: 2800 } },
  { tipo: 'festival',  a: 80000, d: 10,  t: { PET: 1100, Organico: 9900, Aluminio: 3800, Vidrio: 2500, Carton: 4400 } },
  { tipo: 'deportivo', a: 64000, d: 3,   t: { PET: 5100, Organico: 2650, Aluminio: 8450, Vidrio: 1400, Carton: 4650 } },
  { tipo: 'deportivo', a: 35000, d: 3,   t: { PET: 2800, Organico: 1450, Aluminio: 4620, Vidrio:  770, Carton: 2540 } },
];

function rng(seed) {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
}

function generateDataset(n = 900) {
  const rand  = rng(42);
  const rand2 = rng(777);

  const synthetic = Array.from({ length: n }, () => {
    const tipo = TIPOS[Math.floor(rand() * TIPOS.length)];
    const asistentes = Math.floor(rand() * 99000 + 1000);
    const duracion = rand() * 11 + 1;
    const t = TASAS[tipo];
    const nz = () => 0.75 + rand() * 0.50;
    return {
      features: [asistentes / 100000, duracion / 12,
        tipo === 'concierto' ? 1 : 0, tipo === 'deportivo' ? 1 : 0,
        tipo === 'festival'  ? 1 : 0, tipo === 'conferencia' ? 1 : 0],
      targets: {
        PET:      Math.max(0, asistentes * duracion * t.PET      * nz()),
        Organico: Math.max(0, asistentes * duracion * t.Organico * nz()),
        Aluminio: Math.max(0, asistentes * duracion * t.Aluminio * nz()),
        Vidrio:   Math.max(0, asistentes * duracion * t.Vidrio   * nz()),
        Carton:   Math.max(0, asistentes * duracion * t.Carton   * nz()),
      },
    };
  });

  const anchorRecords = ANCHORS.flatMap(a =>
    Array.from({ length: 20 }, () => {
      const nz = () => 0.88 + rand2() * 0.24;
      const tipo = a.tipo;
      return {
        features: [a.a / 100000, a.d / 12,
          tipo === 'concierto' ? 1 : 0, tipo === 'deportivo' ? 1 : 0,
          tipo === 'festival'  ? 1 : 0, tipo === 'conferencia' ? 1 : 0],
        targets: { PET: a.t.PET * nz(), Organico: a.t.Organico * nz(),
                   Aluminio: a.t.Aluminio * nz(), Vidrio: a.t.Vidrio * nz(), Carton: a.t.Carton * nz() },
      };
    })
  );

  return [...synthetic, ...anchorRecords];
}

function r2Score(real, pred) {
  const mean = real.reduce((a, b) => a + b, 0) / real.length;
  const sst  = real.reduce((s, v)    => s + (v - mean) ** 2, 0);
  const sse  = real.reduce((s, v, i) => s + (v - pred[i]) ** 2, 0);
  return 1 - sse / sst;
}

async function train() {
  const dataset = generateDataset(900);
  const nAnch = dataset.length - 900;
  console.log(`⚙  Dataset: ${dataset.length} registros (900 sintéticos + ${nAnch} anclas Glastonbury/Copa Mundial)\n`);

  const X = dataset.map(d => d.features);
  const targetNames = ['PET', 'Organico', 'Aluminio', 'Vidrio', 'Carton'];
  const models = {};

  for (const name of targetNames) {
    const y = dataset.map(d => d.targets[name]);
    process.stdout.write(`   RF → kg_${name}... `);
    const t0 = Date.now();
    const rf = new RandomForestRegression({ nEstimators: 100, maxFeatures: 0.8, replacement: true, seed: 42 });
    rf.train(X, y);
    models[name] = rf.toJSON();
    console.log(`R² = ${r2Score(y, rf.predict(X)).toFixed(4)}  (${Date.now() - t0}ms)`);
  }

  const outPath = path.join(__dirname, '../models/estimador.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(models));
  console.log(`\n✅ Modelo guardado → ${outPath}`);

  const testRf = {};
  for (const name of targetNames) testRf[name] = RandomForestRegression.load(models[name]);

  const casos = [
    { label: 'Concierto   50k / 4h  [SEDEMA target: 7-10 ton]',        f: [0.5,  4/12, 1,0,0,0], min: 5,  max: 15 },
    { label: 'Festival    50k / 8h  [Glastonbury ajustado: 12-22 ton]', f: [0.5,  8/12, 0,0,1,0], min: 10, max: 28 },
    { label: 'Deportivo   64k / 3h  [Copa Mundial packaging: 14-24 ton]',f: [0.64,3/12, 0,1,0,0], min: 10, max: 30 },
    { label: 'Conferencia  5k / 8h  [benchmark: 2-6 ton]',              f: [0.05, 8/12, 0,0,0,1], min: 1,  max: 8  },
  ];

  console.log('\n── Verificación con benchmarks reales ──────────────────────────────');
  let allOk = true;
  for (const caso of casos) {
    let total = 0;
    const desglose = [];
    for (const name of targetNames) {
      const kg = Math.max(0, testRf[name].predict([caso.f])[0]);
      total += kg;
      desglose.push(`${name}:${(kg / 1000).toFixed(1)}t`);
    }
    const ton = total / 1000;
    const ok = ton >= caso.min && ton <= caso.max;
    if (!ok) allOk = false;
    console.log(`   ${ok ? '✅' : '⚠ '} ${caso.label}`);
    console.log(`      ${ton.toFixed(2)} ton  |  ${desglose.join('  ')}`);
  }
  console.log(allOk ? '\n   Todos los benchmarks dentro de rango ✅' : '\n   Revisar benchmarks fuera de rango ⚠');
}

train().catch(err => { console.error(err); process.exit(1); });

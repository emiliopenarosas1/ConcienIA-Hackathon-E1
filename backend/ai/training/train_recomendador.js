/**
 * Entrenamiento del RecomendadorCircular (Multi-label Classifier + Scoring)
 * Dataset: 400 escenarios sintéticos
 * Labels: 8 categorías de recomendaciones circulares
 */
const { RandomForestClassifier } = require('ml-random-forest');
const fs = require('fs');
const path = require('path');

const LABELS = [
  'reciclaje_intensivo',
  'compostaje',
  'prohibir_plastico',
  'agua_refill',
  'embajadores',
  'contenedores_opt',
  'alianzas_recicladores',
  'educacion_ambiental',
];

function rng(seed) {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff; };
}

function generateScenarios(n = 400) {
  const rand = rng(99);
  const tipos = ['concierto', 'deportivo', 'festival', 'conferencia'];

  return Array.from({ length: n }, () => {
    const tipo = tipos[Math.floor(rand() * tipos.length)];
    const asistentes = rand() * 0.95 + 0.05;
    const pet_ratio = rand() * 0.5 + 0.1;
    const organico_ratio = rand() * 0.4 + 0.05;
    const aluminio_ratio = rand() * 0.25 + 0.03;
    const co2_norm = pet_ratio * 6.0 + organico_ratio * 0.5 + aluminio_ratio * 8.2;

    const features = [
      pet_ratio,
      organico_ratio,
      aluminio_ratio,
      asistentes,
      tipo === 'concierto'   ? 1 : 0,
      tipo === 'deportivo'   ? 1 : 0,
      tipo === 'festival'    ? 1 : 0,
      tipo === 'conferencia' ? 1 : 0,
      Math.min(co2_norm / 10, 1),
    ];

    // Reglas basadas en ratios para generar etiquetas realistas
    const labels = [
      pet_ratio > 0.25 ? 1 : 0,                              // reciclaje_intensivo
      organico_ratio > 0.20 ? 1 : 0,                         // compostaje
      pet_ratio > 0.35 ? 1 : 0,                              // prohibir_plastico
      tipo === 'deportivo' || tipo === 'festival' ? 1 : 0,   // agua_refill
      asistentes > 0.4 ? 1 : 0,                              // embajadores
      (pet_ratio + aluminio_ratio) > 0.3 ? 1 : 0,           // contenedores_opt
      co2_norm > 3.5 ? 1 : 0,                                // alianzas_recicladores
      tipo === 'conferencia' || rand() > 0.6 ? 1 : 0,       // educacion_ambiental
    ];

    return { features, labels };
  });
}

async function train() {
  console.log('⚙  Generando 400 escenarios de recomendaciones...');
  const scenarios = generateScenarios(400);
  const X = scenarios.map(s => s.features);
  const models = {};

  for (let i = 0; i < LABELS.length; i++) {
    const y = scenarios.map(s => s.labels[i]);
    const positivos = y.filter(v => v === 1).length;
    process.stdout.write(`   RF → ${LABELS[i].padEnd(22)}: ${positivos}/400 positivos... `);
    const t0 = Date.now();

    const rf = new RandomForestClassifier({
      nEstimators: 50,
      maxFeatures: 0.8,
      replacement: true,
      seed: 42 + i,
    });
    rf.train(X, y);
    models[LABELS[i]] = rf.toJSON();
    console.log(`✓ (${Date.now() - t0}ms)`);
  }

  const outPath = path.join(__dirname, '../models/recomendador.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify({ labels: LABELS, models }));
  console.log(`\n✅ Modelo guardado → ${outPath}`);
}

train().catch(err => { console.error(err); process.exit(1); });

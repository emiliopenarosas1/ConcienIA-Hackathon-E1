const express = require('express');
const router = express.Router();
const db = require('../db/database');
const estimador = require('../ai/inference/EstimadorService');

const TIPOS_VALIDOS = ['concierto', 'deportivo', 'festival', 'conferencia'];

// POST /api/estimar
router.post('/estimar', (req, res) => {
  try {
    const { nombre, tipo, asistentes, duracion_horas } = req.body;

    if (!nombre || !tipo || !asistentes || !duracion_horas)
      return res.status(400).json({ error: 'Campos requeridos: nombre, tipo, asistentes, duracion_horas' });

    if (!TIPOS_VALIDOS.includes(tipo))
      return res.status(400).json({ error: `Tipo debe ser: ${TIPOS_VALIDOS.join(', ')}` });

    if (asistentes < 1 || asistentes > 1000000)
      return res.status(400).json({ error: 'Asistentes debe estar entre 1 y 1,000,000' });

    const residuos = estimador.predict({
      asistentes: Number(asistentes),
      duracion_horas: Number(duracion_horas),
      tipo,
    });

    const factores = db.prepare('SELECT material, kg_co2_por_kg FROM factores_emision').all();
    let huella_carbono_kg = 0;
    for (const f of factores) {
      huella_carbono_kg += (residuos[`kg_${f.material}`] || 0) * f.kg_co2_por_kg;
    }

    const toneladas_totales = Object.values(residuos).reduce((s, v) => s + v, 0) / 1000;

    const { lastInsertRowid } = db.prepare(`
      INSERT INTO eventos (nombre, tipo, asistentes, duracion_horas, fecha_creacion, residuos_json, huella_carbono_kg, toneladas_totales)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      nombre.trim(), tipo, Number(asistentes), Number(duracion_horas),
      new Date().toISOString(),
      JSON.stringify(residuos),
      huella_carbono_kg,
      toneladas_totales,
    );

    res.json({ id: lastInsertRowid, residuos, huella_carbono_kg, toneladas_totales });
  } catch (err) {
    console.error('[/estimar]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/eventos
router.get('/eventos', (req, res) => {
  const eventos = db.prepare(
    'SELECT id, nombre, tipo, asistentes, duracion_horas, fecha_creacion, huella_carbono_kg, toneladas_totales FROM eventos ORDER BY id DESC LIMIT 50'
  ).all();
  res.json(eventos);
});

// GET /api/eventos/:id
router.get('/eventos/:id', (req, res) => {
  const evento = db.prepare('SELECT * FROM eventos WHERE id = ?').get(req.params.id);
  if (!evento) return res.status(404).json({ error: 'Evento no encontrado' });
  evento.residuos = JSON.parse(evento.residuos_json);
  res.json(evento);
});

// GET /api/estadisticas (datos agregados anónimos)
router.get('/estadisticas', (req, res) => {
  const stats = db.prepare(`
    SELECT
      COUNT(*) as total_eventos,
      AVG(toneladas_totales) as promedio_toneladas,
      SUM(toneladas_totales) as total_toneladas,
      AVG(huella_carbono_kg) as promedio_co2_kg,
      tipo,
      COUNT(*) as count_tipo
    FROM eventos GROUP BY tipo
  `).all();
  const total = db.prepare('SELECT COUNT(*) as n, SUM(toneladas_totales) as t FROM eventos').get();
  res.json({ total_eventos: total.n, total_toneladas: total.t || 0, por_tipo: stats });
});

module.exports = router;

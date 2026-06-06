const express = require('express');
const router = express.Router();
const db = require('../db/database');
const AIHub = require('../ai/inference/AIHub');

const TIPOS_VALIDOS = ['concierto', 'deportivo', 'festival', 'conferencia'];

// Niveles de impacto según huella CO2 (kg)
const MATERIALES_RECICLABLES = ['PET', 'Organico', 'Aluminio', 'Vidrio', 'Carton'];

function calcularImpacto(huella_carbono_kg, reciclable_kg) {
  let nivel, color;
  if (huella_carbono_kg < 5000)       { nivel = 'bajo';     color = '#22c55e'; }
  else if (huella_carbono_kg < 15000) { nivel = 'medio';    color = '#f59e0b'; }
  else if (huella_carbono_kg < 40000) { nivel = 'alto';     color = '#f97316'; }
  else                                { nivel = 'crítico';  color = '#ef4444'; }

  return {
    nivel,
    color,
    descripcion: `${huella_carbono_kg.toFixed(0)} kg CO₂eq generados por residuos no reciclables`,
    equivalencias: {
      vuelos_cdmx_mty: parseFloat((huella_carbono_kg / 120).toFixed(1)),
      km_en_auto:      parseFloat((huella_carbono_kg / 0.21).toFixed(0)),
      arboles_anio:    parseFloat((huella_carbono_kg / 20).toFixed(0)),
    },
    // CO2 evitable si todo lo reciclable se recicla (factor promedio ahorro = 2.8 kg CO2/kg)
    co2_evitable_kg: parseFloat((reciclable_kg * 2.8).toFixed(0)),
  };
}

// Cálculo compartido entre preview y guardar
function calcularEstimacionParams({ tipo, asistentes, duracion_horas }) {
  const residuos = AIHub.estimar({
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
  const reciclable_kg     = MATERIALES_RECICLABLES.reduce((s, m) => s + (residuos[`kg_${m}`] || 0), 0);
  const no_reciclable_kg  = Math.max(0, parseFloat((toneladas_totales * 1000 - reciclable_kg).toFixed(2)));
  const impacto           = calcularImpacto(huella_carbono_kg, reciclable_kg);
  return { residuos, huella_carbono_kg, toneladas_totales, reciclable_kg: parseFloat(reciclable_kg.toFixed(2)), no_reciclable_kg, impacto };
}

function validarBase(body) {
  const { tipo, asistentes, duracion_horas } = body;
  if (!tipo || !asistentes || !duracion_horas) return 'Campos requeridos: tipo, asistentes, duracion_horas';
  if (!TIPOS_VALIDOS.includes(tipo)) return `Tipo debe ser: ${TIPOS_VALIDOS.join(', ')}`;
  if (asistentes < 1 || asistentes > 1000000) return 'Asistentes debe estar entre 1 y 1,000,000';
  return null;
}

// POST /api/estimar/preview — calcula sin guardar en la base de datos
router.post('/estimar/preview', (req, res) => {
  try {
    const err = validarBase(req.body);
    if (err) return res.status(400).json({ error: err });
    res.json(calcularEstimacionParams(req.body));
  } catch (err) {
    console.error('[/estimar/preview]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/estimar — calcula Y guarda el evento en la base de datos
router.post('/estimar', (req, res) => {
  try {
    const { nombre, tipo, asistentes, duracion_horas } = req.body;

    if (!nombre?.trim()) return res.status(400).json({ error: 'El nombre del evento es requerido' });
    const baseErr = validarBase(req.body);
    if (baseErr) return res.status(400).json({ error: baseErr });

    const calc = calcularEstimacionParams({ tipo, asistentes, duracion_horas });

    const { lastInsertRowid } = db.prepare(`
      INSERT INTO eventos (nombre, tipo, asistentes, duracion_horas, fecha_creacion, residuos_json, huella_carbono_kg, toneladas_totales)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      nombre.trim(), tipo, Number(asistentes), Number(duracion_horas),
      new Date().toISOString(),
      JSON.stringify(calc.residuos),
      calc.huella_carbono_kg,
      calc.toneladas_totales,
    );

    res.json({ id: lastInsertRowid, ...calc });
  } catch (err) {
    console.error('[/estimar]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/eventos/:id — elimina un evento y sus registros asociados
router.delete('/eventos/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    const ev = db.prepare('SELECT id, nombre FROM eventos WHERE id = ?').get(id);
    if (!ev) return res.status(404).json({ error: 'Evento no encontrado' });

    db.prepare('DELETE FROM registros_limpieza WHERE evento_id = ?').run(id);
    db.prepare('DELETE FROM eventos WHERE id = ?').run(id);

    res.json({ ok: true, eliminado: ev.nombre });
  } catch (err) {
    console.error('[DELETE /eventos/:id]', err.message);
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

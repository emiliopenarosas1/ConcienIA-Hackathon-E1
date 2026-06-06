const express = require('express');
const router  = express.Router();
const db      = require('../db/database');
const AIHub   = require('../ai/inference/AIHub');

// GET /api/dashboard/historial
// Lista de eventos con conteo de registros — para el historial de logística
// IMPORTANTE: esta ruta debe ir ANTES de /dashboard/:evento_id
router.get('/dashboard/historial', (req, res) => {
  try {
    const eventos = db.prepare(`
      SELECT e.id, e.nombre, e.tipo, e.asistentes, e.duracion_horas,
             e.fecha_creacion, e.huella_carbono_kg,
             (SELECT COUNT(*) FROM registros_limpieza r WHERE r.evento_id = e.id) AS registros_count,
             (SELECT SUM(cantidad_bolsas) FROM registros_limpieza r WHERE r.evento_id = e.id) AS bolsas_registradas
      FROM eventos e ORDER BY e.id DESC LIMIT 50
    `).all();
    res.json(eventos);
  } catch (err) {
    console.error('[/dashboard/historial]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/zonas/:evento_id
// Ranking de zonas más sucias — dato clave para logística
router.get('/dashboard/zonas/:evento_id', (req, res) => {
  try {
    const evento = db.prepare('SELECT id, nombre FROM eventos WHERE id = ?').get(Number(req.params.evento_id));
    if (!evento) return res.status(404).json({ error: 'Evento no encontrado' });

    const registros = db.prepare(
      'SELECT zona, tipo_basura, kg_estimado, cantidad_bolsas FROM registros_limpieza WHERE evento_id = ?'
    ).all(Number(req.params.evento_id));

    if (!registros.length)
      return res.json({ evento_id: evento.id, nombre_evento: evento.nombre, zonas: [], zona_mas_sucia: null });

    const porZona = {};
    for (const reg of registros) {
      if (!porZona[reg.zona]) porZona[reg.zona] = { kg: 0, bolsas: 0, porTipo: {} };
      porZona[reg.zona].kg     += reg.kg_estimado;
      porZona[reg.zona].bolsas += reg.cantidad_bolsas;
      porZona[reg.zona].porTipo[reg.tipo_basura] =
        (porZona[reg.zona].porTipo[reg.tipo_basura] || 0) + reg.kg_estimado;
    }

    const total_kg = Object.values(porZona).reduce((s, z) => s + z.kg, 0);

    const zonas = Object.entries(porZona).map(([zona, data]) => ({
      zona,
      kg:                parseFloat(data.kg.toFixed(2)),
      pct:               total_kg > 0 ? parseFloat((data.kg / total_kg * 100).toFixed(2)) : 0,
      bolsas:            data.bolsas,
      tipo_predominante: Object.entries(data.porTipo).sort(([,a],[,b]) => b - a)[0]?.[0] || 'N/A',
      desglose_tipos:    data.porTipo,
    })).sort((a, b) => b.kg - a.kg);

    res.json({
      evento_id:    evento.id,
      nombre_evento: evento.nombre,
      total_kg:     parseFloat(total_kg.toFixed(2)),
      zonas,
      zona_mas_sucia: zonas[0] || null,
    });
  } catch (err) {
    console.error('[/dashboard/zonas]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dashboard/:evento_id
// Dashboard completo de un evento: datos, conteo y comparativa histórica
router.get('/dashboard/:evento_id', (req, res) => {
  try {
    const evento = db.prepare('SELECT * FROM eventos WHERE id = ?').get(Number(req.params.evento_id));
    if (!evento) return res.status(404).json({ error: 'Evento no encontrado' });

    evento.residuos = JSON.parse(evento.residuos_json);
    delete evento.residuos_json;

    const registros = db.prepare(
      'SELECT * FROM registros_limpieza WHERE evento_id = ?'
    ).all(Number(req.params.evento_id));

    const conteo = registros.length ? AIHub.contar(evento, registros) : null;

    // Últimos 5 eventos del mismo tipo para comparativa
    const historial_previo = db.prepare(`
      SELECT id, nombre, tipo, asistentes, duracion_horas,
             toneladas_totales, huella_carbono_kg, fecha_creacion
      FROM eventos WHERE tipo = ? AND id != ?
      ORDER BY id DESC LIMIT 5
    `).all(evento.tipo, evento.id);

    res.json({
      evento,
      conteo,
      historial_previo,
    });
  } catch (err) {
    console.error('[/dashboard/:evento_id]', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

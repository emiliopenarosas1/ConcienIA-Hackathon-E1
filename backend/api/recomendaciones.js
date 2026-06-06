const express = require('express');
const router = express.Router();
const db = require('../db/database');
const recomendador = require('../ai/inference/RecomendadorService');

// GET /api/recomendaciones/:id
router.get('/recomendaciones/:id', (req, res) => {
  try {
    const evento = db.prepare('SELECT * FROM eventos WHERE id = ?').get(req.params.id);
    if (!evento) return res.status(404).json({ error: 'Evento no encontrado' });

    const residuos = JSON.parse(evento.residuos_json);
    const total_kg = Object.values(residuos).reduce((s, v) => s + v, 0) || 1;

    const features = {
      pet_ratio:       (residuos.kg_PET      || 0) / total_kg,
      organico_ratio:  (residuos.kg_Organico || 0) / total_kg,
      aluminio_ratio:  (residuos.kg_Aluminio || 0) / total_kg,
      asistentes_norm: evento.asistentes / 100000,
      tipo:            evento.tipo,
      co2_total_norm:  evento.huella_carbono_kg / 10000,
    };

    const recomendaciones = recomendador.recommend(features);

    res.json({
      evento_id:      evento.id,
      nombre_evento:  evento.nombre,
      toneladas:      evento.toneladas_totales,
      co2_kg:         evento.huella_carbono_kg,
      recomendaciones,
    });
  } catch (err) {
    console.error('[/recomendaciones]', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

const express = require('express');
const router  = express.Router();
const db      = require('../db/database');
const AIHub   = require('../ai/inference/AIHub');

// POST /api/contar/:evento_id
// Procesa todos los registros_limpieza del evento y devuelve el análisis completo
router.post('/contar/:evento_id', (req, res) => {
  try {
    const evento = db.prepare('SELECT * FROM eventos WHERE id = ?').get(Number(req.params.evento_id));
    if (!evento) return res.status(404).json({ error: 'Evento no encontrado' });

    const registros = db.prepare(
      'SELECT * FROM registros_limpieza WHERE evento_id = ?'
    ).all(Number(req.params.evento_id));

    if (!registros.length)
      return res.status(422).json({ error: 'El evento no tiene registros de limpieza aún' });

    const resultado = AIHub.contar(evento, registros);
    res.json(resultado);
  } catch (err) {
    console.error('[POST /contar]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/contar/:evento_id
// Igual que POST pero sin side effects — calcula sobre registros existentes
router.get('/contar/:evento_id', (req, res) => {
  try {
    const evento = db.prepare('SELECT * FROM eventos WHERE id = ?').get(Number(req.params.evento_id));
    if (!evento) return res.status(404).json({ error: 'Evento no encontrado' });

    const registros = db.prepare(
      'SELECT * FROM registros_limpieza WHERE evento_id = ?'
    ).all(Number(req.params.evento_id));

    if (!registros.length)
      return res.json({ mensaje: 'Sin registros de limpieza aún', evento_id: evento.id, nombre_evento: evento.nombre });

    const resultado = AIHub.contar(evento, registros);
    res.json(resultado);
  } catch (err) {
    console.error('[GET /contar]', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

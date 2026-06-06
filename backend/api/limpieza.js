const express   = require('express');
const router    = express.Router();
const db        = require('../db/database');
const AIHub     = require('../ai/inference/AIHub');
const { softAuth } = require('../middleware/auth');

// Peso promedio por bolsa según tipo (kg) — referencia SEMARNAT/operadores de evento
const KG_POR_BOLSA = {
  PET:          1.2,
  Organico:     3.0,
  Aluminio:     0.8,
  Vidrio:       4.5,
  Carton:       2.0,
  NoReciclable: 2.5,
};
const TIPOS_VALIDOS = Object.keys(KG_POR_BOLSA);

// POST /api/limpieza/registro
// Registra bolsas de residuos por tipo y zona para un evento
router.post('/limpieza/registro', softAuth, (req, res) => {
  try {
    const { evento_id, zona, registros } = req.body;

    if (!evento_id || !zona || !Array.isArray(registros) || !registros.length)
      return res.status(400).json({ error: 'Campos requeridos: evento_id, zona, registros[]' });

    const evento = db.prepare('SELECT id FROM eventos WHERE id = ?').get(Number(evento_id));
    if (!evento) return res.status(404).json({ error: 'Evento no encontrado' });

    // Zona siempre en mayúsculas para estandarizar
    const zona_norm = zona.trim().toUpperCase();
    const ts        = new Date().toISOString();

    const usuario_id = req.user?.id || null;
    const ins = db.prepare(
      'INSERT INTO registros_limpieza (evento_id, zona, tipo_basura, cantidad_bolsas, kg_estimado, timestamp, usuario_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );

    let insertados = 0;
    const rechazados = [];

    for (const r of registros) {
      if (!TIPOS_VALIDOS.includes(r.tipo_basura)) {
        rechazados.push(r.tipo_basura);
        continue;
      }
      const bolsas = Math.max(1, parseInt(r.cantidad_bolsas) || 1);
      const kg     = parseFloat((bolsas * KG_POR_BOLSA[r.tipo_basura]).toFixed(2));
      ins.run(Number(evento_id), zona_norm, r.tipo_basura, bolsas, kg, ts, usuario_id);
      insertados++;
    }

    res.json({ insertados, zona_normalizada: zona_norm, timestamp: ts, rechazados });
  } catch (err) {
    console.error('[/limpieza/registro]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/limpieza/identificar
// Identifica el tipo de residuo a partir de una imagen — usa modelo Identificar
router.post('/limpieza/identificar', async (req, res) => {
  try {
    const { imagen_base64 } = req.body;
    if (!imagen_base64)
      return res.status(400).json({ error: 'Falta imagen_base64' });
    if (!imagen_base64.startsWith('data:image/'))
      return res.status(400).json({ error: 'Formato inválido. Usa base64 con prefijo data:image/' });

    const t0       = Date.now();
    const resultado = await AIHub.identificar(imagen_base64);
    resultado.tiempo_ms = Date.now() - t0;

    res.json(resultado);
  } catch (err) {
    console.error('[/limpieza/identificar]', err.message);
    res.status(500).json({ error: 'Error al identificar imagen', detalle: err.message });
  }
});

// GET /api/limpieza/:evento_id?solo_mios=1
// Devuelve registros del evento; con ?solo_mios=1 y JWT, filtra por usuario
router.get('/limpieza/:evento_id', softAuth, (req, res) => {
  try {
    const eventoId  = Number(req.params.evento_id);
    const soloMios  = req.query.solo_mios === '1' && req.user;
    const registros = soloMios
      ? db.prepare('SELECT * FROM registros_limpieza WHERE evento_id = ? AND usuario_id = ? ORDER BY timestamp DESC')
          .all(eventoId, req.user.id)
      : db.prepare('SELECT * FROM registros_limpieza WHERE evento_id = ? ORDER BY timestamp DESC')
          .all(eventoId);
    res.json(registros);
  } catch (err) {
    console.error('[/limpieza/:evento_id]', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

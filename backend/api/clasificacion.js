const express = require('express');
const router = express.Router();
const clasificador = require('../ai/inference/IdentificarService');

// POST /api/clasificar  { imagen_base64: "data:image/jpeg;base64,..." }
// Imágenes procesadas en memoria — NO se persiste ningún dato de imagen (LFPDPPP)
router.post('/clasificar', async (req, res) => {
  try {
    const { imagen_base64 } = req.body;
    if (!imagen_base64) return res.status(400).json({ error: 'Falta imagen_base64' });

    if (!imagen_base64.startsWith('data:image/'))
      return res.status(400).json({ error: 'Formato inválido. Usa base64 con prefijo data:image/' });

    const t0 = Date.now();
    const resultado = await clasificador.classify(imagen_base64);
    resultado.tiempo_ms = Date.now() - t0;

    res.json(resultado);
  } catch (err) {
    console.error('[/clasificar]', err.message);
    res.status(500).json({ error: 'Error al clasificar imagen', detalle: err.message });
  }
});

module.exports = router;

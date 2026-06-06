const express = require('express');
const router  = express.Router();
const db      = require('../db/database');
const Jimp    = require('jimp');
const clasificador = require('../ai/inference/IdentificarService');

const PUNTOS_PARA_CUPON = 3;

// Heurística: foto tomada desde arriba dentro del bote → los bordes son más oscuros que el centro
async function detectarBote(base64) {
  try {
    const b64 = base64.replace(/^data:image\/\w+;base64,/, '');
    const buf = Buffer.from(b64, 'base64');
    const img = await Jimp.read(buf);
    img.resize(64, 64);

    const cx = 32, cy = 32;
    let cLum = 0, cCnt = 0;
    let eLum = 0, eCnt = 0;

    img.scan(0, 0, 64, 64, function (x, y, off) {
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      const lum  = (this.bitmap.data[off] + this.bitmap.data[off + 1] + this.bitmap.data[off + 2]) / 3;
      if      (dist < 16) { cLum += lum; cCnt++; }
      else if (dist > 25) { eLum += lum; eCnt++; }
    });

    const centerAvg = cLum / cCnt;
    const edgeAvg   = eLum / eCnt;
    // Bote detectado si los bordes son al menos 12% más oscuros que el centro
    return edgeAvg < centerAvg * 0.88;
  } catch {
    return false;
  }
}

// POST /api/invitado/clasificar
// Body: { session_id, imagen_base64 }
router.post('/invitado/clasificar', async (req, res) => {
  const { session_id, imagen_base64 } = req.body;
  if (!session_id || !imagen_base64)
    return res.status(400).json({ error: 'Falta session_id o imagen_base64' });
  if (!imagen_base64.startsWith('data:image/'))
    return res.status(400).json({ error: 'Formato inválido: usa base64 con prefijo data:image/' });

  try {
    const t0 = Date.now();
    const [clasificacion, boteDetectado] = await Promise.all([
      clasificador.classify(imagen_base64),
      detectarBote(imagen_base64),
    ]);
    const tiempo_ms = Date.now() - t0;

    if (!boteDetectado) {
      return res.json({
        ok: false,
        bote_detectado: false,
        clasificacion,
        tiempo_ms,
        mensaje: 'No se detectó el bote. Toma la foto desde arriba apuntando al interior del contenedor.',
      });
    }

    const now = new Date().toISOString();

    // Obtener o crear sesión
    let sesion = db.prepare('SELECT * FROM sesiones_invitado WHERE session_id = ?').get(session_id);
    if (!sesion) {
      db.prepare('INSERT INTO sesiones_invitado (session_id, registros_count, fecha_inicio, fecha_ultima) VALUES (?, 0, ?, ?)')
        .run(session_id, now, now);
      sesion = { session_id, registros_count: 0 };
    }

    // Registrar (sin imagen, sin PII)
    db.prepare('INSERT INTO registros_invitado (session_id, material, confianza, bote_detectado, timestamp) VALUES (?, ?, ?, 1, ?)')
      .run(session_id, clasificacion.categoria, clasificacion.confianza, now);

    const nuevoCount = sesion.registros_count + 1;
    db.prepare('UPDATE sesiones_invitado SET registros_count = ?, fecha_ultima = ? WHERE session_id = ?')
      .run(nuevoCount, now, session_id);

    // Cupón desbloqueado cuando se alcanza un múltiplo de PUNTOS_PARA_CUPON
    const cupon_desbloqueado = nuevoCount % PUNTOS_PARA_CUPON === 0;

    res.json({
      ok: true,
      bote_detectado: true,
      clasificacion,
      tiempo_ms,
      registros_count: nuevoCount,
      cupon_desbloqueado,
    });
  } catch (err) {
    console.error('[/invitado/clasificar]', err.message);
    res.status(500).json({ error: 'Error al procesar la imagen', detalle: err.message });
  }
});

// GET /api/invitado/sesion/:session_id
router.get('/invitado/sesion/:session_id', (req, res) => {
  const { session_id } = req.params;
  const sesion   = db.prepare('SELECT * FROM sesiones_invitado WHERE session_id = ?').get(session_id);
  const registros = db.prepare('SELECT id, material, confianza, timestamp FROM registros_invitado WHERE session_id = ? ORDER BY timestamp DESC LIMIT 20').all(session_id);
  const canjeados = db.prepare('SELECT COUNT(*) AS n FROM cupones_canjeados WHERE session_id = ?').get(session_id)?.n || 0;

  const count    = sesion?.registros_count || 0;
  const ganados  = Math.floor(count / PUNTOS_PARA_CUPON);
  const disponibles = ganados - canjeados;

  res.json({
    registros_count:   count,
    cupones_canjeados: canjeados,
    cupones_ganados:   ganados,
    cupon_disponible:  disponibles > 0,
    registros,
  });
});

// GET /api/cupones  — cupones activos (público para invitados)
router.get('/cupones', (req, res) => {
  const cupones = db.prepare(`
    SELECT * FROM cupones
    WHERE activo = 1 AND (cantidad_total = 0 OR cantidad_usada < cantidad_total)
    ORDER BY fecha_creacion DESC
  `).all();
  res.json(cupones);
});

// POST /api/invitado/canjear
// Body: { session_id, cupon_id }
router.post('/invitado/canjear', (req, res) => {
  const { session_id, cupon_id } = req.body;
  if (!session_id || !cupon_id)
    return res.status(400).json({ error: 'Falta session_id o cupon_id' });

  const sesion   = db.prepare('SELECT * FROM sesiones_invitado WHERE session_id = ?').get(session_id);
  if (!sesion)   return res.status(404).json({ error: 'Sesión no encontrada' });

  const canjeados = db.prepare('SELECT COUNT(*) AS n FROM cupones_canjeados WHERE session_id = ?').get(session_id)?.n || 0;
  const ganados   = Math.floor(sesion.registros_count / PUNTOS_PARA_CUPON);

  if (canjeados >= ganados)
    return res.status(403).json({ error: 'No tienes cupones disponibles para canjear' });

  const cupon = db.prepare('SELECT * FROM cupones WHERE id = ? AND activo = 1').get(Number(cupon_id));
  if (!cupon)   return res.status(404).json({ error: 'Cupón no encontrado o inactivo' });
  if (cupon.cantidad_total > 0 && cupon.cantidad_usada >= cupon.cantidad_total)
    return res.status(409).json({ error: 'Cupón agotado' });

  // Generar código único alfanumérico (sin O, 0, I, 1)
  const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let codigo = 'CI-';
  for (let i = 0; i < 8; i++) codigo += CHARS[Math.floor(Math.random() * CHARS.length)];

  const now = new Date().toISOString();
  db.prepare('INSERT INTO cupones_canjeados (session_id, cupon_id, codigo, timestamp) VALUES (?, ?, ?, ?)')
    .run(session_id, cupon.id, codigo, now);
  db.prepare('UPDATE cupones SET cantidad_usada = cantidad_usada + 1 WHERE id = ?').run(cupon.id);

  res.json({ ok: true, codigo, cupon });
});

module.exports = router;

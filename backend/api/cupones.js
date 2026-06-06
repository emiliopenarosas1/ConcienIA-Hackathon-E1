const express = require('express');
const router  = express.Router();
const db      = require('../db/database');
const { auth } = require('../middleware/auth');

// GET /api/admin/cupones — lista completa para admin
router.get('/admin/cupones', auth(['admin']), (req, res) => {
  const cupones = db.prepare('SELECT * FROM cupones ORDER BY fecha_creacion DESC').all();
  res.json(cupones);
});

// POST /api/admin/cupones — crear cupón
router.post('/admin/cupones', auth(['admin']), (req, res) => {
  const { nombre, descripcion, categoria, tipo_descuento, valor, evento_nombre, evento_fecha, evento_venue, cantidad_total, fecha_vencimiento } = req.body;
  if (!nombre?.trim() || !tipo_descuento)
    return res.status(400).json({ error: 'nombre y tipo_descuento son requeridos' });

  const r = db.prepare(`
    INSERT INTO cupones
      (nombre, descripcion, categoria, tipo_descuento, valor, evento_nombre, evento_fecha, evento_venue, cantidad_total, fecha_creacion, fecha_vencimiento)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    nombre.trim(),
    descripcion    || null,
    categoria      || 'evento_futuro',
    tipo_descuento,
    Number(valor)  || 0,
    evento_nombre  || null,
    evento_fecha   || null,
    evento_venue   || null,
    Number(cantidad_total) || 50,
    new Date().toISOString(),
    fecha_vencimiento || null,
  );

  res.json({ ok: true, id: r.lastInsertRowid });
});

// PUT /api/admin/cupones/:id — editar cupón
router.put('/admin/cupones/:id', auth(['admin']), (req, res) => {
  const id = Number(req.params.id);
  const { nombre, descripcion, tipo_descuento, valor, evento_nombre, evento_fecha, evento_venue, cantidad_total, fecha_vencimiento } = req.body;

  if (!db.prepare('SELECT id FROM cupones WHERE id = ?').get(id))
    return res.status(404).json({ error: 'Cupón no encontrado' });

  const { categoria } = req.body;
  db.prepare(`
    UPDATE cupones
    SET nombre=?, descripcion=?, categoria=?, tipo_descuento=?, valor=?, evento_nombre=?, evento_fecha=?, evento_venue=?, cantidad_total=?, fecha_vencimiento=?
    WHERE id=?
  `).run(
    nombre?.trim() || '',
    descripcion    || null,
    categoria      || 'evento_futuro',
    tipo_descuento,
    Number(valor)  || 0,
    evento_nombre  || null,
    evento_fecha   || null,
    evento_venue   || null,
    Number(cantidad_total) || 50,
    fecha_vencimiento || null,
    id,
  );

  res.json({ ok: true });
});

// PATCH /api/admin/cupones/:id/estado — toggle activo
router.patch('/admin/cupones/:id/estado', auth(['admin']), (req, res) => {
  const id = Number(req.params.id);
  const c  = db.prepare('SELECT id, activo FROM cupones WHERE id = ?').get(id);
  if (!c) return res.status(404).json({ error: 'Cupón no encontrado' });

  const nuevoEstado = c.activo ? 0 : 1;
  db.prepare('UPDATE cupones SET activo = ? WHERE id = ?').run(nuevoEstado, id);
  res.json({ ok: true, activo: Boolean(nuevoEstado) });
});

module.exports = router;

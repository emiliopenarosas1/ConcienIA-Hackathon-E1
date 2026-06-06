const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const db      = require('../db/database');
const { auth } = require('../middleware/auth');


// GET /api/intendentes — listar todo el personal
router.get('/intendentes', auth(['admin']), (req, res) => {
  try {
    const intendentes = db.prepare(
      "SELECT id, nombre_completo, usuario, activo, fecha_alta, fecha_modificacion FROM usuarios WHERE rol = 'intendente' ORDER BY nombre_completo ASC"
    ).all();
    res.json(intendentes);
  } catch (err) {
    console.error('[GET /intendentes]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/intendentes — dar de alta nuevo intendente
// El campo "identificador" se usa directamente como usuario de login.
// "nombre_completo" es opcional; si no se provee, se usa el identificador.
router.post('/intendentes', auth(['admin']), (req, res) => {
  try {
    const { identificador, nombre_completo, password } = req.body;
    if (!identificador?.trim() || !password)
      return res.status(400).json({ error: 'identificador y password son requeridos' });
    if (password.length < 4)
      return res.status(400).json({ error: 'La contraseña debe tener al menos 4 caracteres' });

    const usuario = identificador.trim().toLowerCase().replace(/\s+/g, '_');

    if (db.prepare('SELECT id FROM usuarios WHERE usuario = ?').get(usuario))
      return res.status(409).json({ error: `El identificador '${usuario}' ya está en uso` });

    const nombre      = nombre_completo?.trim() || identificador.trim();
    const hash        = bcrypt.hashSync(password, 10);
    const fecha_alta  = new Date().toISOString();

    const { lastInsertRowid } = db.prepare(
      "INSERT INTO usuarios (nombre_completo, usuario, password_hash, rol, activo, fecha_alta) VALUES (?, ?, ?, 'intendente', 1, ?)"
    ).run(nombre, usuario, hash, fecha_alta);

    res.status(201).json({ id: lastInsertRowid, nombre_completo: nombre, usuario, activo: 1, fecha_alta });
  } catch (err) {
    console.error('[POST /intendentes]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/intendentes/:id — modificar nombre y/o contraseña
router.put('/intendentes/:id', auth(['admin']), (req, res) => {
  try {
    const id = Number(req.params.id);
    const intendente = db.prepare("SELECT * FROM usuarios WHERE id = ? AND rol = 'intendente'").get(id);
    if (!intendente) return res.status(404).json({ error: 'Intendente no encontrado' });

    const { nombre_completo, password } = req.body;
    const now = new Date().toISOString();

    if (nombre_completo?.trim()) {
      db.prepare('UPDATE usuarios SET nombre_completo = ?, fecha_modificacion = ? WHERE id = ?')
        .run(nombre_completo.trim(), now, id);
    }
    if (password) {
      if (password.length < 4)
        return res.status(400).json({ error: 'La contraseña debe tener al menos 4 caracteres' });
      db.prepare('UPDATE usuarios SET password_hash = ?, fecha_modificacion = ? WHERE id = ?')
        .run(bcrypt.hashSync(password, 10), now, id);
    }

    const updated = db.prepare('SELECT id, nombre_completo, usuario, activo, fecha_alta, fecha_modificacion FROM usuarios WHERE id = ?').get(id);
    res.json(updated);
  } catch (err) {
    console.error('[PUT /intendentes/:id]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/intendentes/:id/estado — baja o reactivar
router.patch('/intendentes/:id/estado', auth(['admin']), (req, res) => {
  try {
    const id = Number(req.params.id);
    const intendente = db.prepare("SELECT * FROM usuarios WHERE id = ? AND rol = 'intendente'").get(id);
    if (!intendente) return res.status(404).json({ error: 'Intendente no encontrado' });

    const nuevoEstado = intendente.activo ? 0 : 1;
    db.prepare('UPDATE usuarios SET activo = ?, fecha_modificacion = ? WHERE id = ?')
      .run(nuevoEstado, new Date().toISOString(), id);

    res.json({ id, activo: nuevoEstado });
  } catch (err) {
    console.error('[PATCH /intendentes/:id/estado]', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

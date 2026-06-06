const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const db      = require('../db/database');
const { auth, SECRET } = require('../middleware/auth');

// POST /api/auth/login
router.post('/auth/login', (req, res) => {
  try {
    const { usuario, password } = req.body;
    if (!usuario || !password)
      return res.status(400).json({ error: 'Usuario y contraseña requeridos' });

    const user = db.prepare(
      'SELECT * FROM usuarios WHERE usuario = ? AND activo = 1'
    ).get(usuario.trim().toLowerCase());

    if (!user || !bcrypt.compareSync(password, user.password_hash))
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });

    const token = jwt.sign(
      { id: user.id, usuario: user.usuario, rol: user.rol, nombre: user.nombre_completo },
      SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      rol:    user.rol,
      nombre: user.nombre_completo,
      usuario: user.usuario,
    });
  } catch (err) {
    console.error('[/auth/login]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me — verifica token y devuelve datos del usuario
router.get('/auth/me', auth(), (req, res) => {
  res.json({
    id:      req.user.id,
    usuario: req.user.usuario,
    nombre:  req.user.nombre,
    rol:     req.user.rol,
  });
});

module.exports = router;

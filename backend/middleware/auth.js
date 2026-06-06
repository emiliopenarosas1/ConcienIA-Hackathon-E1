const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'conciencia-jwt-secret-2026';

// Verifica token. roles = [] acepta cualquier rol autenticado.
function auth(roles = []) {
  return (req, res, next) => {
    const header = req.headers.authorization || '';
    const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'No autorizado' });
    try {
      const payload = jwt.verify(token, SECRET);
      if (roles.length && !roles.includes(payload.rol))
        return res.status(403).json({ error: 'Sin permisos suficientes' });
      req.user = payload;
      next();
    } catch {
      res.status(401).json({ error: 'Sesión inválida o expirada' });
    }
  };
}

// Extrae usuario del token si existe, pero no bloquea si no hay token.
function softAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    try { req.user = jwt.verify(token, SECRET); } catch (_) {}
  }
  next();
}

module.exports = { auth, softAuth, SECRET };

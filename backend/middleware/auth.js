/**
 * @file auth.js
 * @description Middleware de autenticación y autorización basado en JSON Web Tokens (JWT).
 * Proporciona políticas de control de acceso por roles para rutas Express.
 */

const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'conciencia-jwt-secret-2026';

/**
 * Middleware para requerir autenticación y opcionalmente validar roles.
 * 
 * @param {Array<string>} [roles=[]] - Lista de roles permitidos. Si está vacío, permite cualquier usuario autenticado.
 * @returns {function(Object, Object, function): void} Middleware de Express.
 */
function auth(roles = []) {
  return (req, res, next) => {
    const header = req.headers.authorization || '';
    const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
      return res.status(401).json({ error: 'No autorizado' });
    }
    try {
      const payload = jwt.verify(token, SECRET);
      if (roles.length && !roles.includes(payload.rol)) {
        return res.status(403).json({ error: 'Sin permisos suficientes' });
      }
      req.user = payload;
      next();
    } catch {
      res.status(401).json({ error: 'Sesión inválida o expirada' });
    }
  };
}

/**
 * Middleware de autenticación suave. Extrae el usuario si el token es válido, 
 * pero no bloquea la petición si el token no existe o es inválido.
 * 
 * @param {Object} req - Objeto de solicitud de Express.
 * @param {Object} res - Objeto de respuesta de Express.
 * @param {function} next - Callback para continuar con el siguiente middleware.
 */
function softAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    try { 
      req.user = jwt.verify(token, SECRET); 
    } catch (_) {}
  }
  next();
}

module.exports = { auth, softAuth, SECRET };

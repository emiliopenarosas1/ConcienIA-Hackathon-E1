const BASE = '/api';

function token() {
  return localStorage.getItem('ci_token') || '';
}

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' };
  const t = token();
  if (t) headers['Authorization'] = `Bearer ${t}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  // ── Auth ──────────────────────────────────────────────────────────────────
  login:   (usuario, password) => request('POST', '/auth/login', { usuario, password }),
  me:      ()                  => request('GET',  '/auth/me'),

  // ── Intendentes (admin) ───────────────────────────────────────────────────
  getIntendentes:     ()      => request('GET',   '/intendentes'),
  crearIntendente:    (body)  => request('POST',  '/intendentes', body),
  editarIntendente:   (id, b) => request('PUT',   `/intendentes/${id}`, b),
  toggleIntendente:   (id)    => request('PATCH', `/intendentes/${id}/estado`),

  // ── Eventos ───────────────────────────────────────────────────────────────
  estimarPreview: (body) => request('POST', '/estimar/preview', body),
  estimar:        (body) => request('POST', '/estimar', body),
  eliminarEvento: (id)   => request('DELETE', `/eventos/${id}`),
  getEventos:   ()     => request('GET',  '/eventos'),
  getEvento:    (id)   => request('GET',  `/eventos/${id}`),
  getEstadisticas: ()  => request('GET',  '/estadisticas'),

  // ── Dashboard / historial ─────────────────────────────────────────────────
  getHistorial:  ()   => request('GET', '/dashboard/historial'),
  getDashboard:  (id) => request('GET', `/dashboard/${id}`),
  getZonas:      (id) => request('GET', `/dashboard/zonas/${id}`),
  getConteo:     (id) => request('GET', `/contar/${id}`),

  // ── Limpieza (intendentes) ────────────────────────────────────────────────
  registrarLimpieza: (body)   => request('POST', '/limpieza/registro', body),
  identificar:       (base64) => request('POST', '/limpieza/identificar', { imagen_base64: base64 }),
  getMisRegistros:   (eventoId) => request('GET', `/limpieza/${eventoId}?solo_mios=1`),
  getRegistros:      (eventoId) => request('GET', `/limpieza/${eventoId}`),

  // ── Chat ──────────────────────────────────────────────────────────────────
  chat: (mensaje) => request('POST', '/chat', { mensaje }),

  // ── Privacidad ────────────────────────────────────────────────────────────
  eliminarDatos: () => request('DELETE', '/eliminar-datos'),

  // ── Invitado (anónimo) ────────────────────────────────────────────────────
  invitadoClasificar: (body)      => request('POST', '/invitado/clasificar', body),
  invitadoSesion:     (sessionId) => request('GET',  `/invitado/sesion/${sessionId}`),
  invitadoCanjear:    (body)      => request('POST', '/invitado/canjear', body),

  // ── Cupones ───────────────────────────────────────────────────────────────
  getCupones:     ()        => request('GET',   '/cupones'),
  getAdminCupones: ()       => request('GET',   '/admin/cupones'),
  crearCupon:     (body)    => request('POST',  '/admin/cupones', body),
  editarCupon:    (id, body) => request('PUT',  `/admin/cupones/${id}`, body),
  toggleCupon:    (id)      => request('PATCH', `/admin/cupones/${id}/estado`),
};

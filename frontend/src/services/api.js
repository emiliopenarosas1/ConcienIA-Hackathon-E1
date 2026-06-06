const BASE = '/api';

async function request(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  estimar:           (body)  => request('POST', '/estimar', body),
  getEventos:        ()      => request('GET',  '/eventos'),
  getEvento:         (id)    => request('GET',  `/eventos/${id}`),
  getEstadisticas:   ()      => request('GET',  '/estadisticas'),
  clasificar:        (b64)   => request('POST', '/clasificar', { imagen_base64: b64 }),
  getRecomendaciones:(id)    => request('GET',  `/recomendaciones/${id}`),
  getAvisoPrivacidad:()      => request('GET',  '/aviso-privacidad'),
  getMisDatos:       ()      => request('GET',  '/mis-datos'),
  eliminarDatos:     ()      => request('DELETE','/eliminar-datos'),
};

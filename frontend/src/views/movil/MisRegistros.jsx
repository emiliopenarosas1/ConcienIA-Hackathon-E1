import { useState, useEffect } from 'react';
import { api } from '../../services/api.js';

const MAT_LABEL = {
  PET: 'PET', Organico: 'Orgánico', Aluminio: 'Aluminio',
  Vidrio: 'Vidrio', Carton: 'Cartón', NoReciclable: 'No reciclable'
};
const TIPO_COLOR = {
  PET: 'badge-blue', Organico: 'badge-green', Aluminio: 'badge-orange',
  Vidrio: 'badge-gray', Carton: 'badge-gray', NoReciclable: 'badge-red'
};

function agruparSesiones(registros) {
  const map = {};
  for (const r of registros) {
    const key = `${r.timestamp}||${r.zona}`;
    if (!map[key]) map[key] = { zona: r.zona, timestamp: r.timestamp, items: [], totalKg: 0, totalBolsas: 0 };
    map[key].items.push(r);
    map[key].totalKg     += r.kg_estimado     || 0;
    map[key].totalBolsas += r.cantidad_bolsas || 0;
  }
  return Object.values(map);
}

export default function MovilHistorial({ user }) {
  const [eventos,    setEventos]    = useState([]);
  const [eventoSel,  setEventoSel]  = useState(null);
  const [registros,  setRegistros]  = useState([]);
  const [loadingEv,  setLoadingEv]  = useState(true);
  const [loadingReg, setLoadingReg] = useState(false);

  useEffect(() => {
    api.getEventos()
      .then(data => {
        setEventos(data.slice(0, 8));
        if (data.length > 0) cargarRegistros(data[0]);
      })
      .finally(() => setLoadingEv(false));
  }, []);

  const cargarRegistros = async (ev) => {
    setEventoSel(ev);
    setLoadingReg(true);
    try {
      const data = await api.getMisRegistros(ev.id);
      setRegistros(data);
    } finally {
      setLoadingReg(false);
    }
  };

  const sesiones  = agruparSesiones(registros);
  const totalBolsas = registros.reduce((s, r) => s + (r.cantidad_bolsas || 0), 0);

  return (
    <div>
      <h2 style={{ marginBottom: '.3rem' }}>Mis registros</h2>
      <p style={{ marginBottom: '1rem' }}>Historial de recolecciones registradas por ti</p>

      {loadingEv ? (
        <div className="spinner-page"><div className="spinner" /></div>
      ) : (
        <div style={{ marginBottom: '1rem' }}>
          <label className="form-label">Evento</label>
          <select
            className="form-select"
            value={eventoSel?.id || ''}
            onChange={e => {
              const ev = eventos.find(x => x.id === Number(e.target.value));
              if (ev) cargarRegistros(ev);
            }}
          >
            {eventos.map(ev => (
              <option key={ev.id} value={ev.id}>{ev.nombre}</option>
            ))}
          </select>
        </div>
      )}

      {eventoSel && !loadingReg && (
        <div style={{ display: 'flex', gap: '.6rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <span className="badge badge-gray">{sesiones.length} sesión{sesiones.length !== 1 ? 'es' : ''}</span>
          <span className="badge badge-green">{totalBolsas} bolsas total</span>
        </div>
      )}

      {loadingReg ? (
        <div className="spinner-page"><div className="spinner" /></div>
      ) : sesiones.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">☷</div>
          <h3>Sin registros</h3>
          <p>No has registrado residuos para este evento todavía</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
          {sesiones.map((s, i) => (
            <div key={i} className="card" style={{ padding: '.75rem 1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.5rem' }}>
                <span className="font-semibold" style={{ fontSize: '.875rem' }}>Zona: {s.zona}</span>
                <span className="text-xs text-muted">
                  {s.timestamp
                    ? new Date(s.timestamp).toLocaleString('es-MX', {
                        month: 'short', day: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })
                    : ''}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '.3rem' }}>
                {s.items.map((r, j) => (
                  <div key={j} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className={`badge ${TIPO_COLOR[r.tipo_basura] || 'badge-gray'}`}>
                      {MAT_LABEL[r.tipo_basura] || r.tipo_basura}
                    </span>
                    <span className="text-sm text-muted">
                      {r.cantidad_bolsas} bolsas
                    </span>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: '1px solid var(--border)', marginTop: '.5rem', paddingTop: '.4rem', display: 'flex', justifyContent: 'flex-end' }}>
                <span className="text-sm font-medium">{s.totalBolsas} bolsas</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

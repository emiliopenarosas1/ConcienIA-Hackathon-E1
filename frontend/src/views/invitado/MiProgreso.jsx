import { useState, useEffect } from 'react';
import { api } from '../../services/api.js';

const MAT_LABEL = {
  PET: 'PET', Organico: 'Orgánico', Aluminio: 'Aluminio',
  Vidrio: 'Vidrio', Carton: 'Cartón', NoReciclable: 'No reciclable',
};

export default function MiProgreso({ sessionId, count, onCountUpdate }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.invitadoSesion(sessionId)
      .then(d => { setData(d); onCountUpdate?.(d.registros_count); })
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) return <div className="spinner-page"><div className="spinner" /></div>;

  const total    = data?.registros_count  || 0;
  const ganados  = data?.cupones_ganados  || 0;
  const canjeados = data?.cupones_canjeados || 0;
  const cyclePos = total % 3 === 0 && total > 0 ? 3 : total % 3;
  const faltan   = cyclePos === 3 ? 0 : 3 - cyclePos;

  return (
    <div>
      <div className="admin-page-header">
        <h1>Mi Progreso</h1>
        <p>Historial de tus contribuciones al reciclaje</p>
      </div>

      <div className="stat-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-card-label">Basuras registradas</div>
          <div className="stat-card-value">{total}</div>
          <div className="stat-card-unit">en este dispositivo</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Cupones ganados</div>
          <div className="stat-card-value">{ganados}</div>
          <div className="stat-card-unit">{canjeados} canjeado{canjeados !== 1 ? 's' : ''}</div>
        </div>
      </div>

      {/* Progreso hacia siguiente cupón */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-header"><h2>Siguiente cupón</h2></div>
        <div className="card-body" style={{ textAlign: 'center' }}>
          <div className="inv-progress" style={{ justifyContent: 'center', gap: '1.5rem' }}>
            {[1, 2, 3].map(n => (
              <div key={n} className={`inv-progress-dot ${n <= cyclePos ? 'done' : ''}`} style={{ width: 44, height: 44, fontSize: '.95rem' }}>
                {n <= cyclePos ? '✓' : n}
              </div>
            ))}
          </div>
          <p style={{ marginTop: '.75rem', fontSize: '.875rem', color: 'var(--text-3)' }}>
            {cyclePos === 3
              ? '¡Tienes un cupón disponible! Ve a Mis Cupones.'
              : total === 0
                ? 'Registra tu primera basura para empezar'
                : `${faltan} basura${faltan !== 1 ? 's' : ''} más para tu siguiente cupón`}
          </p>

          {data?.cupon_disponible && (
            <div className="alert alert-success" style={{ marginTop: '.75rem', textAlign: 'left' }}>
              ¡Tienes {ganados - canjeados} cupón{(ganados - canjeados) !== 1 ? 'es' : ''} sin canjear!
            </div>
          )}
        </div>
      </div>

      {/* Historial reciente */}
      {data?.registros?.length > 0 ? (
        <div className="card">
          <div className="card-header"><h2>Historial reciente</h2></div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Material</th>
                  <th>Confianza</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {data.registros.map(r => (
                  <tr key={r.id}>
                    <td className="font-medium">{MAT_LABEL[r.material] || r.material}</td>
                    <td>{(r.confianza * 100).toFixed(0)}%</td>
                    <td className="text-sm text-muted">
                      {r.timestamp?.slice(0, 16).replace('T', ' ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">♻</div>
          <h3>Sin registros aún</h3>
          <p>Ve a Registrar y toma tu primera foto</p>
        </div>
      )}
    </div>
  );
}

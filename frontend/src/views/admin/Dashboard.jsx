import { useState, useEffect } from 'react';
import { api } from '../../services/api.js';

const TIPO_LABEL = { concierto: 'Concierto', deportivo: 'Deportivo', festival: 'Festival', conferencia: 'Conferencia' };
const TIPO_COLOR = { concierto: 'badge-blue', deportivo: 'badge-orange', festival: 'badge-green', conferencia: 'badge-gray' };

export default function AdminDashboard({ onNavigate }) {
  const [stats,    setStats]    = useState(null);
  const [historial, setHistorial] = useState([]);
  const [cupones,  setCupones]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  useEffect(() => {
    Promise.all([
      api.getEstadisticas(),
      api.getHistorial(),
      api.getAdminCupones(),
    ])
      .then(([s, h, c]) => { setStats(s); setHistorial(h); setCupones(c); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="spinner-page">
      <div className="spinner" />
      Cargando datos...
    </div>
  );

  if (error) return <div className="alert alert-error">{error}</div>;

  const total      = stats?.total_eventos || 0;
  const ultimosEv  = historial.slice(0, 6);
  const bolsasTotal = historial.reduce((s, e) => s + (e.bolsas_registradas || 0), 0);
  const sesionesTotal = historial.reduce((s, e) => s + (e.registros_count || 0), 0);

  const cuponesActivos  = cupones.filter(c => c.activo).length;
  const cuponesTotal    = cupones.length;
  const cuponesCanjeados = cupones.reduce((s, c) => s + (c.cantidad_usada || 0), 0);
  const disponibilidad  = cupones.reduce((s, c) => s + Math.max(0, c.cantidad_total - c.cantidad_usada), 0);

  return (
    <div>
      <div className="admin-page-header">
        <h1>Resumen general</h1>
        <p>Estado actual del sistema de gestión de residuos y programa de reciclaje</p>
      </div>

      {/* Eventos stat cards */}
      <p style={{ fontSize: '.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--text-3)', marginBottom: '.6rem' }}>
        Eventos
      </p>
      <div className="stat-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-card-label">Eventos registrados</div>
          <div className="stat-card-value">{total}</div>
          <div className="stat-card-unit">en total</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Bolsas recolectadas</div>
          <div className="stat-card-value">{bolsasTotal.toLocaleString('es-MX')}</div>
          <div className="stat-card-unit">en campo por intendentes</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Sesiones de limpieza</div>
          <div className="stat-card-value">{sesionesTotal.toLocaleString('es-MX')}</div>
          <div className="stat-card-unit">registros de campo totales</div>
        </div>
      </div>

      {/* Cupones stat cards */}
      <p style={{ fontSize: '.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--text-3)', marginBottom: '.6rem' }}>
        Programa de cupones
      </p>
      <div className="stat-grid" style={{ marginBottom: '1.75rem' }}>
        <div className="stat-card" style={{ borderLeftColor: 'var(--green-400)' }}>
          <div className="stat-card-label">Cupones activos</div>
          <div className="stat-card-value">{cuponesActivos}</div>
          <div className="stat-card-unit">de {cuponesTotal} en catálogo</div>
        </div>
        <div className="stat-card" style={{ borderLeftColor: 'var(--green-400)' }}>
          <div className="stat-card-label">Canjeados por invitados</div>
          <div className="stat-card-value">{cuponesCanjeados}</div>
          <div className="stat-card-unit">cupones redimidos</div>
        </div>
        <div className="stat-card" style={{ borderLeftColor: 'var(--green-400)' }}>
          <div className="stat-card-label">Disponibles</div>
          <div className="stat-card-value">{disponibilidad}</div>
          <div className="stat-card-unit">unidades restantes</div>
        </div>
      </div>

      {/* Últimos eventos */}
      <div className="card">
        <div className="card-header">
          <h2>Últimos eventos</h2>
          <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('historial')}>
            Ver todos
          </button>
        </div>

        {historial.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">☷</div>
            <h3>Sin eventos registrados</h3>
            <p>Crea el primer evento desde "Nuevo Evento"</p>
          </div>
        ) : (
          <div className="table-wrap" style={{ borderRadius: '0 0 10px 10px', border: 'none' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Nombre</th>
                  <th>Tipo</th>
                  <th>Asistentes</th>
                  <th>Bolsas</th>
                  <th>Sesiones</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {ultimosEv.map(ev => (
                  <tr key={ev.id}>
                    <td className="text-muted text-sm">{ev.id}</td>
                    <td className="font-medium">{ev.nombre}</td>
                    <td>
                      <span className={`badge ${TIPO_COLOR[ev.tipo] || 'badge-gray'}`}>
                        {TIPO_LABEL[ev.tipo] || ev.tipo}
                      </span>
                    </td>
                    <td>{(ev.asistentes || 0).toLocaleString('es-MX')}</td>
                    <td>{(ev.bolsas_registradas || 0).toLocaleString('es-MX')}</td>
                    <td>{ev.registros_count || 0}</td>
                    <td className="text-sm text-muted">{ev.fecha_creacion?.slice(0,10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={() => onNavigate('eventos')}>
          + Nuevo evento
        </button>
        <button className="btn btn-secondary" onClick={() => onNavigate('analytics')}>
          ◉ Analítica
        </button>
        <button className="btn btn-secondary" onClick={() => onNavigate('intendencia')}>
          Intendencia
        </button>
        <button className="btn btn-secondary" onClick={() => onNavigate('cupones')}>
          ◈ Gestionar cupones
        </button>
      </div>
    </div>
  );
}

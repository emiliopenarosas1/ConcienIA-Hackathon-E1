import { useState, useEffect } from 'react';
import { api } from '../../services/api.js';

const TIPO_COLOR = { concierto: 'badge-blue', deportivo: 'badge-orange', festival: 'badge-green', conferencia: 'badge-gray' };
const TIPO_LABEL = { concierto: 'Concierto', deportivo: 'Deportivo', festival: 'Festival', conferencia: 'Conferencia' };
const MAT_LABEL  = { PET: 'PET', Organico: 'Orgánico', Aluminio: 'Aluminio', Vidrio: 'Vidrio', Carton: 'Cartón', NoReciclable: 'No reciclable' };

function DetalleModal({ eventoId, onClose }) {
  const [data,   setData]   = useState(null);
  const [zonas,  setZonas]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getDashboard(eventoId), api.getZonas(eventoId)])
      .then(([d, z]) => { setData(d); setZonas(z.zonas || []); })
      .finally(() => setLoading(false));
  }, [eventoId]);

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: 600 }}>
        <div className="modal-header">
          <h2>{data ? `#${data.evento?.id} ${data.evento?.nombre}` : 'Cargando...'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {loading ? (
          <div className="spinner-page"><div className="spinner" /></div>
        ) : (
          <div className="modal-body">
            {/* Evento base */}
            <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              <span className={`badge ${TIPO_COLOR[data.evento?.tipo] || 'badge-gray'}`}>
                {TIPO_LABEL[data.evento?.tipo]}
              </span>
              <span className="badge badge-gray">{(data.evento?.asistentes || 0).toLocaleString('es-MX')} asistentes</span>
              <span className="badge badge-gray">{data.evento?.duracion_horas}h</span>
              <span className="badge badge-gray">{data.evento?.fecha_creacion?.slice(0,10)}</span>
            </div>

            {/* Conteo real */}
            {data.conteo ? (
              <>
                <h3 style={{ marginBottom: '.75rem' }}>Análisis de residuos reales</h3>
                {(() => {
                  const desglose = data.conteo.desglose || [];
                  const totalBol = desglose.reduce((s, d) => s + d.bolsas, 0);
                  const recBol   = desglose.filter(d => d.reciclable).reduce((s, d) => s + d.bolsas, 0);
                  const recPct   = totalBol > 0 ? ((recBol / totalBol) * 100).toFixed(0) : 0;
                  return (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '.75rem', marginBottom: '1rem' }}>
                      {[
                        { label: 'Bolsas totales', value: totalBol, unit: 'recolectadas en campo' },
                        { label: 'Reciclable', value: `${recPct}%`, unit: `${recBol} bolsas aprovechables` },
                        { label: 'Ingreso reciclaje', value: `$${(data.conteo.resumen?.ingreso_esperado_mxn || 0).toFixed(0)}`, unit: 'MXN estimado' },
                        { label: 'Camiones estimados', value: data.conteo.resumen?.camiones_estimados || 0, unit: 'compactadores' },
                      ].map(c => (
                        <div key={c.label} className="stat-card" style={{ borderLeftColor: 'var(--green-300)' }}>
                          <div className="stat-card-label">{c.label}</div>
                          <div className="stat-card-value" style={{ fontSize: '1.2rem' }}>{c.value}</div>
                          <div className="stat-card-unit">{c.unit}</div>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* Top zones */}
                {zonas.length > 0 && (
                  <>
                    <h4 style={{ marginBottom: '.4rem' }}>Zonas — ranking por bolsas</h4>
                    <div className="table-wrap" style={{ marginBottom: '1rem' }}>
                      <table className="table">
                        <thead><tr><th>Pos.</th><th>Zona</th><th>Bolsas</th><th>Tipo predominante</th></tr></thead>
                        <tbody>
                          {zonas.slice(0,5).map((z, i) => (
                            <tr key={z.zona}>
                              <td className="text-muted text-sm">{i+1}</td>
                              <td className="font-medium">{z.zona}</td>
                              <td>{z.bolsas}</td>
                              <td><span className="badge badge-gray">{MAT_LABEL[z.tipo_predominante] || z.tipo_predominante}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="alert alert-info">Este evento aún no tiene registros de limpieza.</div>
            )}

            {/* Historial comparativo */}
            {data.historial_previo?.length > 0 && (
              <>
                <h4 style={{ marginBottom: '.4rem', marginTop: '.5rem' }}>
                  Comparativa — últimos {TIPO_LABEL[data.evento?.tipo]?.toLowerCase()}s
                </h4>
                <div className="table-wrap">
                  <table className="table">
                    <thead><tr><th>#</th><th>Nombre</th><th>Asistentes</th></tr></thead>
                    <tbody>
                      {data.historial_previo.map(e => (
                        <tr key={e.id}>
                          <td className="text-muted text-sm">{e.id}</td>
                          <td>{e.nombre}</td>
                          <td>{(e.asistentes || 0).toLocaleString('es-MX')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        <div className="modal-footer">
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}


export default function AdminHistorial() {
  const [eventos,   setEventos]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [filtro,    setFiltro]    = useState('');
  const [detalle,   setDetalle]   = useState(null);
  const [confirmDel, setConfirmDel] = useState(null); // evento a eliminar
  const [deleting,  setDeleting]  = useState(false);

  const cargar = () => {
    setLoading(true);
    api.getHistorial().then(setEventos).finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  const handleEliminar = async () => {
    if (!confirmDel) return;
    setDeleting(true);
    try {
      await api.eliminarEvento(confirmDel.id);
      setConfirmDel(null);
      cargar();
    } catch (err) {
      alert('Error al eliminar: ' + err.message);
    } finally {
      setDeleting(false);
    }
  };

  const filtrados = filtro ? eventos.filter(e => e.tipo === filtro) : eventos;

  if (loading) return <div className="spinner-page"><div className="spinner" />Cargando historial...</div>;

  return (
    <div>
      <div className="admin-page-header">
        <h1>Historial de eventos</h1>
        <p>Todos los eventos registrados con sus datos de residuos</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {['', 'concierto', 'festival', 'deportivo', 'conferencia'].map(t => (
          <button
            key={t}
            className={`btn btn-sm ${filtro === t ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFiltro(t)}
          >
            {t ? TIPO_LABEL[t] : 'Todos'}
          </button>
        ))}
      </div>

      <div className="table-wrap">
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
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <tr><td colSpan="9" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-3)' }}>Sin eventos</td></tr>
            ) : filtrados.map(ev => (
              <tr key={ev.id}>
                <td className="text-muted text-sm">{ev.id}</td>
                <td className="font-medium">{ev.nombre}</td>
                <td><span className={`badge ${TIPO_COLOR[ev.tipo] || 'badge-gray'}`}>{TIPO_LABEL[ev.tipo]}</span></td>
                <td>{(ev.asistentes || 0).toLocaleString('es-MX')}</td>
                <td>{(ev.bolsas_registradas || 0).toLocaleString('es-MX')}</td>
                <td>{ev.registros_count || 0}</td>
                <td className="text-sm text-muted">{ev.fecha_creacion?.slice(0,10)}</td>
                <td style={{ display: 'flex', gap: '.4rem', alignItems: 'center' }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setDetalle(ev.id)}>
                    Detalle
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--red)' }}
                    onClick={() => setConfirmDel(ev)}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detalle && <DetalleModal eventoId={detalle} onClose={() => setDetalle(null)} />}

      {/* Modal confirmación de eliminación */}
      {confirmDel && (
        <div className="modal-backdrop" onClick={() => !deleting && setConfirmDel(null)}>
          <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Eliminar evento</h2>
              <button className="modal-close" onClick={() => setConfirmDel(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '.75rem' }}>
                ¿Eliminar permanentemente <strong>#{confirmDel.id} {confirmDel.nombre}</strong>?
              </p>
              <div className="alert alert-error" style={{ fontSize: '.82rem' }}>
                Se eliminarán también todos los registros de limpieza asociados a este evento. Esta acción no se puede deshacer.
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDel(null)} disabled={deleting}>Cancelar</button>
              <button
                className="btn btn-sm"
                style={{ background: 'var(--red)', color: '#fff', border: 'none' }}
                onClick={handleEliminar}
                disabled={deleting}
              >
                {deleting ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

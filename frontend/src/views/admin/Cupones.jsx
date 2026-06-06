import { useState, useEffect } from 'react';
import { api } from '../../services/api.js';

const TIPO_COLOR = { porcentaje: 'badge-green', monto: 'badge-blue', acceso: 'badge-orange' };
const CAT_LABEL  = { evento_futuro: '🎫 Evento', alimentos: '🍔 Alimentos', merch: '👕 Merch', descuento: '🏷️ Descuento' };

function valorLabel(c) {
  if (c.tipo_descuento === 'acceso')     return 'Acceso gratis';
  if (c.tipo_descuento === 'porcentaje') return `${c.valor}%`;
  return `$${c.valor} MXN`;
}

function ModalCupon({ cupon, onClose, onSave }) {
  const [form, setForm] = useState({
    nombre:            cupon?.nombre            || '',
    descripcion:       cupon?.descripcion       || '',
    categoria:         cupon?.categoria         || 'evento_futuro',
    tipo_descuento:    cupon?.tipo_descuento    || 'porcentaje',
    valor:             cupon?.valor             ?? '',
    evento_nombre:     cupon?.evento_nombre     || '',
    evento_fecha:      cupon?.evento_fecha      || '',
    evento_venue:      cupon?.evento_venue      || '',
    cantidad_total:    cupon?.cantidad_total    ?? 50,
    fecha_vencimiento: cupon?.fecha_vencimiento || '',
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre.trim()) { setError('El nombre es requerido'); return; }
    setLoading(true);
    setError('');
    try {
      await onSave({
        ...form,
        valor:          Number(form.valor)         || 0,
        cantidad_total: Number(form.cantidad_total) || 50,
      });
      onClose();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: 540 }}>
        <div className="modal-header">
          <h2>{cupon ? 'Editar cupón' : 'Nuevo cupón'}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {error && <div className="alert alert-error">{error}</div>}

            <div className="form-group">
              <label className="form-label">Nombre del cupón</label>
              <input className="form-input" value={form.nombre} onChange={e => set('nombre', e.target.value)} placeholder="Ej. Corona Capital 2026 — 10%" />
            </div>

            <div className="form-group">
              <label className="form-label">Descripción</label>
              <input className="form-input" value={form.descripcion} onChange={e => set('descripcion', e.target.value)} placeholder="Descripción breve del beneficio" />
            </div>

            <div className="form-group">
              <label className="form-label">Categoría</label>
              <select className="form-select" value={form.categoria} onChange={e => set('categoria', e.target.value)}>
                <option value="evento_futuro">🎫 Evento futuro</option>
                <option value="alimentos">🍔 Alimentos</option>
                <option value="merch">👕 Merch</option>
                <option value="descuento">🏷️ Descuento inmediato</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'start' }}>
              <div className="form-group" style={{ marginTop: 0 }}>
                <label className="form-label">Tipo de descuento</label>
                <select className="form-select" value={form.tipo_descuento} onChange={e => set('tipo_descuento', e.target.value)}>
                  <option value="porcentaje">Porcentaje (%)</option>
                  <option value="monto">Monto fijo (MXN)</option>
                  <option value="acceso">Acceso gratuito</option>
                </select>
              </div>
              {form.tipo_descuento !== 'acceso' && (
                <div className="form-group" style={{ marginTop: 0 }}>
                  <label className="form-label">
                    {form.tipo_descuento === 'porcentaje' ? 'Porcentaje (%)' : 'Monto ($MXN)'}
                  </label>
                  <input
                    className="form-input"
                    type="number" min="0"
                    value={form.valor}
                    onChange={e => set('valor', e.target.value)}
                    placeholder={form.tipo_descuento === 'porcentaje' ? 'Ej. 10' : 'Ej. 150'}
                  />
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Nombre del evento asociado</label>
              <input className="form-input" value={form.evento_nombre} onChange={e => set('evento_nombre', e.target.value)} placeholder="Ej. Festival Pa'l Norte 2026" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'start' }}>
              <div className="form-group" style={{ marginTop: 0 }}>
                <label className="form-label">Fecha del evento</label>
                <input className="form-input" type="date" value={form.evento_fecha} onChange={e => set('evento_fecha', e.target.value)} />
              </div>
              <div className="form-group" style={{ marginTop: 0 }}>
                <label className="form-label">Venue / lugar</label>
                <input className="form-input" value={form.evento_venue} onChange={e => set('evento_venue', e.target.value)} placeholder="Ej. Foro Sol, CDMX" />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'start' }}>
              <div className="form-group" style={{ marginTop: 0 }}>
                <label className="form-label">Cantidad disponible</label>
                <input className="form-input" type="number" min="1" value={form.cantidad_total} onChange={e => set('cantidad_total', e.target.value)} />
              </div>
              <div className="form-group" style={{ marginTop: 0 }}>
                <label className="form-label">Vence el (opcional)</label>
                <input className="form-input" type="date" value={form.fecha_vencimiento} onChange={e => set('fecha_vencimiento', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
              {loading ? 'Guardando...' : (cupon ? 'Guardar cambios' : 'Crear cupón')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminCupones() {
  const [cupones, setCupones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [modal,   setModal]   = useState(null); // null | 'new' | cuponObj

  const cargar = () => {
    setLoading(true);
    setError('');
    api.getAdminCupones()
      .then(setCupones)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  const handleSave = async (body) => {
    if (modal && modal !== 'new') {
      await api.editarCupon(modal.id, body);
    } else {
      await api.crearCupon(body);
    }
    cargar();
  };

  const handleToggle = async (c) => {
    await api.toggleCupon(c.id);
    cargar();
  };

  if (loading) return <div className="spinner-page"><div className="spinner" /></div>;
  if (error)   return <div className="alert alert-error" style={{ margin: '2rem' }}>{error}</div>;

  const activos   = cupones.filter(c => c.activo).length;
  const totalUsados = cupones.reduce((s, c) => s + (c.cantidad_usada || 0), 0);

  return (
    <div>
      <div className="admin-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Cupones</h1>
          <p>Beneficios para asistentes que participan en el programa de reciclaje</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setModal('new')}>
          + Nuevo cupón
        </button>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-card-label">Cupones activos</div>
          <div className="stat-card-value">{activos}</div>
          <div className="stat-card-unit">de {cupones.length} total</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Canjeados</div>
          <div className="stat-card-value">{totalUsados}</div>
          <div className="stat-card-unit">por invitados</div>
        </div>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              <th>Nombre</th>
              <th>Categoría</th>
              <th>Evento</th>
              <th>Descuento</th>
              <th>Estado</th>
              <th>Canjeados</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {cupones.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-3)' }}>
                  Sin cupones. Crea el primero con el botón de arriba.
                </td>
              </tr>
            ) : cupones.map(c => (
              <tr key={c.id}>
                <td className="text-muted text-sm">{c.id}</td>
                <td>
                  <div className="font-medium">{c.nombre}</div>
                  {c.descripcion && <div className="text-xs text-muted">{c.descripcion}</div>}
                </td>
                <td className="text-sm text-muted">{CAT_LABEL[c.categoria] || c.categoria || '—'}</td>
                <td>
                  <div className="text-sm">{c.evento_nombre || '—'}</div>
                  {c.evento_fecha && (
                    <div className="text-xs text-muted">{c.evento_fecha?.slice(0, 10)}</div>
                  )}
                </td>
                <td>
                  <span className={`badge ${TIPO_COLOR[c.tipo_descuento] || 'badge-gray'}`}>
                    {valorLabel(c)}
                  </span>
                </td>
                <td>
                  <span className={`badge ${c.activo ? 'badge-green' : 'badge-gray'}`}>
                    {c.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="text-sm">
                  <span style={{ fontWeight: 600 }}>{c.cantidad_usada}</span>
                  <span className="text-muted"> / {c.cantidad_total}</span>
                </td>
                <td>
                  <div className="table-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => setModal(c)}>
                      Editar
                    </button>
                    <button
                      className={`btn btn-sm ${c.activo ? 'btn-danger' : 'btn-secondary'}`}
                      onClick={() => handleToggle(c)}
                    >
                      {c.activo ? 'Pausar' : 'Activar'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <ModalCupon
          cupon={modal !== 'new' ? modal : null}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

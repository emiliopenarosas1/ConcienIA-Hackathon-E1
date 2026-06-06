import { useState, useEffect } from 'react';
import { api } from '../../services/api.js';

function ModalForm({ intendente, onClose, onSave }) {
  const esNuevo = !intendente;
  const [form, setForm] = useState({
    identificador:   esNuevo ? '' : intendente.usuario,
    nombre_completo: intendente?.nombre_completo || '',
    password:        '',
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const previewId = form.identificador.trim().toLowerCase().replace(/\s+/g, '_') || '…';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (esNuevo && !form.identificador.trim()) { setError('El identificador es requerido.'); return; }
    if (esNuevo && !form.password)             { setError('La contraseña es requerida.');    return; }
    if (form.password && form.password.length < 4) { setError('Mínimo 4 caracteres.'); return; }

    setLoading(true);
    setError('');
    try {
      let saved;
      if (esNuevo) {
        saved = await api.crearIntendente({
          identificador:   form.identificador.trim(),
          nombre_completo: form.nombre_completo.trim() || undefined,
          password:        form.password,
        });
        onSave(saved);
      } else {
        saved = await api.editarIntendente(intendente.id, {
          nombre_completo: form.nombre_completo.trim() || undefined,
          password:        form.password || undefined,
        });
        onSave(saved);
        onClose();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-header">
          <h2>{esNuevo ? 'Nuevo intendente' : `Editar — ${intendente.usuario}`}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {error && <div className="alert alert-error">{error}</div>}

            {/* Identificador (solo en alta) */}
            {esNuevo ? (
              <div className="form-group">
                <label className="form-label">Identificador de acceso</label>
                <input
                  className="form-input"
                  value={form.identificador}
                  onChange={e => setForm(f => ({ ...f, identificador: e.target.value }))}
                  placeholder="Ej. LIM-001, garcia, 12345"
                  autoFocus
                />
                <span className="form-hint">
                  Será su usuario de login en la app: <strong style={{ color: 'var(--primary)', fontFamily: 'monospace' }}>{previewId}</strong>
                </span>
              </div>
            ) : (
              <div className="alert alert-info">
                Usuario de login: <strong style={{ fontFamily: 'monospace' }}>{intendente.usuario}</strong>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Nombre / descripción (opcional)</label>
              <input
                className="form-input"
                value={form.nombre_completo}
                onChange={e => setForm(f => ({ ...f, nombre_completo: e.target.value }))}
                placeholder="Ej. Equipo Norte, Turno Mañana, María García"
              />
            </div>

            <div className="form-group">
              <label className="form-label">{esNuevo ? 'Contraseña' : 'Nueva contraseña (opcional)'}</label>
              <input
                className="form-input"
                type="password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder={esNuevo ? 'Mínimo 4 caracteres' : 'Dejar vacío para no cambiar'}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary btn-sm" disabled={loading}>
              {loading ? 'Guardando...' : esNuevo ? 'Crear intendente' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ConfirmModal({ mensaje, onConfirm, onClose }) {
  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: 360 }}>
        <div className="modal-header"><h2>Confirmar acción</h2><button className="modal-close" onClick={onClose}>✕</button></div>
        <div className="modal-body"><p>{mensaje}</p></div>
        <div className="modal-footer">
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancelar</button>
          <button className="btn btn-danger btn-sm" onClick={onConfirm}>Confirmar</button>
        </div>
      </div>
    </div>
  );
}

function SuccessModal({ intendente, onClose }) {
  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: 400 }}>
        <div className="modal-header"><h2>Intendente creado</h2><button className="modal-close" onClick={onClose}>✕</button></div>
        <div className="modal-body">
          <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
            Intendente registrado correctamente.
          </div>
          <div style={{ background: 'var(--cream-50)', border: '1px solid var(--green-200)', borderRadius: 'var(--radius)', padding: '1rem', textAlign: 'center', marginBottom: '.75rem' }}>
            <div style={{ fontSize: '.72rem', color: 'var(--text-3)', marginBottom: '.2rem', textTransform: 'uppercase', letterSpacing: '.05em' }}>Identificador de acceso</div>
            <div style={{ fontFamily: 'monospace', fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary)', letterSpacing: '.05em' }}>{intendente.usuario}</div>
          </div>
          {intendente.nombre_completo !== intendente.usuario && (
            <p className="text-sm text-muted" style={{ textAlign: 'center', marginBottom: '.5rem' }}>
              {intendente.nombre_completo}
            </p>
          )}
          <p className="text-sm text-muted" style={{ textAlign: 'center' }}>
            Comparte este identificador con el intendente para que inicie sesión en la app móvil.
          </p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-primary btn-sm" onClick={onClose}>Entendido</button>
        </div>
      </div>
    </div>
  );
}

export default function AdminIntendencia() {
  const [intendentes, setIntendentes] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(null); // null | 'create' | 'edit' | 'confirm' | 'success'
  const [selected, setSelected] = useState(null);
  const [nuevoReg, setNuevoReg] = useState(null);
  const [buscando, setBuscando] = useState('');

  const cargar = () => {
    setLoading(true);
    api.getIntendentes().then(setIntendentes).finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  const handleCreado = (nuevo) => {
    setNuevoReg(nuevo);
    setModal('success');
    cargar();
  };

  const handleEditado = (actualizado) => {
    setIntendentes(prev => prev.map(i => i.id === actualizado.id ? actualizado : i));
  };

  const handleToggle = async () => {
    try {
      const res = await api.toggleIntendente(selected.id);
      setIntendentes(prev => prev.map(i => i.id === selected.id ? { ...i, activo: res.activo } : i));
    } catch { /* ignore */ }
    setModal(null);
    setSelected(null);
  };

  const filtrados = buscando
    ? intendentes.filter(i => i.nombre_completo.toLowerCase().includes(buscando.toLowerCase()) || i.usuario.includes(buscando.toLowerCase()))
    : intendentes;

  const activos = intendentes.filter(i => i.activo).length;

  if (loading) return <div className="spinner-page"><div className="spinner" />Cargando personal...</div>;

  return (
    <div>
      <div className="admin-page-header">
        <h1>Personal de intendencia</h1>
        <p>Alta, baja, consulta y modificación del personal</p>
      </div>

      {/* Summary + actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '.75rem' }}>
        <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center' }}>
          <span className="badge badge-green badge-dot">{activos} activos</span>
          <span className="badge badge-gray">{intendentes.length} total</span>
          <input
            className="form-input"
            style={{ width: 220 }}
            placeholder="Buscar por nombre o usuario..."
            value={buscando}
            onChange={e => setBuscando(e.target.value)}
          />
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setModal('create')}>
          + Nuevo intendente
        </button>
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Nombre completo</th>
              <th>Usuario</th>
              <th>Estado</th>
              <th>Fecha de alta</th>
              <th>Última modificación</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-3)' }}>Sin registros</td></tr>
            ) : filtrados.map(i => (
              <tr key={i.id}>
                <td className="font-medium">{i.nombre_completo}</td>
                <td className="text-sm" style={{ fontFamily: 'monospace', color: 'var(--green-700)' }}>{i.usuario}</td>
                <td>
                  <span className={`badge badge-dot ${i.activo ? 'badge-green' : 'badge-red'}`}>
                    {i.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="text-sm text-muted">{i.fecha_alta?.slice(0,10)}</td>
                <td className="text-sm text-muted">{i.fecha_modificacion?.slice(0,10) || '—'}</td>
                <td>
                  <div className="table-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => { setSelected(i); setModal('edit'); }}>
                      Editar
                    </button>
                    <button
                      className={`btn btn-sm ${i.activo ? 'btn-danger' : 'btn-secondary'}`}
                      onClick={() => { setSelected(i); setModal('confirm'); }}
                    >
                      {i.activo ? 'Dar de baja' : 'Reactivar'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal === 'create' && (
        <ModalForm
          intendente={null}
          onClose={() => setModal(null)}
          onSave={handleCreado}
        />
      )}
      {modal === 'edit' && selected && (
        <ModalForm
          intendente={selected}
          onClose={() => { setModal(null); setSelected(null); }}
          onSave={handleEditado}
        />
      )}
      {modal === 'confirm' && selected && (
        <ConfirmModal
          mensaje={`¿Confirmas ${selected.activo ? 'dar de baja' : 'reactivar'} a ${selected.nombre_completo}?`}
          onConfirm={handleToggle}
          onClose={() => { setModal(null); setSelected(null); }}
        />
      )}
      {modal === 'success' && nuevoReg && (
        <SuccessModal
          intendente={nuevoReg}
          onClose={() => { setModal(null); setNuevoReg(null); }}
        />
      )}
    </div>
  );
}

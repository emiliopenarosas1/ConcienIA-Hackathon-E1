import { useState } from 'react';
import { api } from '../services/api.js';

function normalizeId(val) {
  return val.trim().toLowerCase().replace(/\s+/g, '_');
}

const ROLES = [
  { id: 'admin',    label: 'Administración' },
  { id: 'limpieza', label: 'Limpieza'       },
  { id: 'invitado', label: 'Invitado'       },
];

export default function Login({ onLogin }) {
  const [rol,      setRol]      = useState('admin');
  const [form,     setForm]     = useState({ usuario: '', identificador: '', password: '' });
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (rol === 'invitado') {
      window.location.hash = '#invitado';
      return;
    }

    const usuario  = rol === 'limpieza'
      ? normalizeId(form.identificador)
      : form.usuario.trim();
    const password = form.password;

    if (!usuario || !password) {
      setError(rol === 'limpieza' ? 'Ingresa tu identificador y contraseña.' : 'Ingresa usuario y contraseña.');
      return;
    }

    setLoading(true);
    try {
      const data = await api.login(usuario, password);
      localStorage.setItem('ci_token', data.token);
      localStorage.setItem('ci_user',  JSON.stringify({ nombre: data.nombre, rol: data.rol, usuario: data.usuario }));
      onLogin(data);
    } catch {
      setError(rol === 'limpieza' ? 'Identificador o contraseña incorrectos.' : 'Usuario o contraseña incorrectos.');
    } finally {
      setLoading(false);
    }
  };

  const isInvitado = rol === 'invitado';

  return (
    <div className="login-page">
      <div className="login-card">

        {/* Brand */}
        <div className="login-brand">
          <img src="/logo_trazza.jpeg" alt="Trazza" style={{ width: 64, height: 64, borderRadius: 14, objectFit: 'cover', marginBottom: '.5rem', display: 'block', margin: '0 auto .5rem' }} />
          <h1>Trazza</h1>
          <p>Gestión de Residuos en Eventos</p>
        </div>

        {/* Rol selector */}
        <div style={{
          display: 'flex',
          background: 'var(--cream-100)',
          borderRadius: 'var(--radius)',
          padding: '3px',
          gap: '2px',
          marginBottom: '1.5rem',
          border: '1px solid var(--border)',
        }}>
          {ROLES.map(r => (
            <button
              key={r.id}
              type="button"
              onClick={() => { setRol(r.id); setError(''); }}
              style={{
                flex: 1,
                padding: '.45rem .5rem',
                fontSize: '.8rem',
                fontWeight: rol === r.id ? 600 : 400,
                border: 'none',
                borderRadius: 'calc(var(--radius) - 2px)',
                background: rol === r.id ? '#fff' : 'transparent',
                color: rol === r.id ? 'var(--primary)' : 'var(--text-3)',
                cursor: 'pointer',
                boxShadow: rol === r.id ? 'var(--shadow-xs)' : 'none',
                transition: 'all 120ms',
              }}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Form */}
        {error && <div className="login-error" style={{ marginBottom: '.75rem' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          {rol === 'admin' && (
            <div className="form-group">
              <label className="form-label" htmlFor="usuario">Usuario</label>
              <input
                id="usuario"
                className="form-input"
                type="text"
                autoComplete="username"
                autoFocus
                value={form.usuario}
                onChange={e => set('usuario', e.target.value)}
                placeholder="admin"
              />
            </div>
          )}

          {rol === 'limpieza' && (
            <div className="form-group">
              <label className="form-label" htmlFor="identificador">Identificador</label>
              <input
                id="identificador"
                className="form-input"
                type="text"
                autoComplete="username"
                autoFocus
                value={form.identificador}
                onChange={e => set('identificador', e.target.value)}
                placeholder="Ej. LIM-001"
              />
            </div>
          )}

          {!isInvitado && (
            <div className="form-group">
              <label className="form-label" htmlFor="password">Contraseña</label>
              <input
                id="password"
                className="form-input"
                type="password"
                autoComplete="current-password"
                value={form.password}
                onChange={e => set('password', e.target.value)}
                placeholder="••••••"
              />
            </div>
          )}

          {isInvitado && (
            <p style={{ fontSize: '.82rem', color: 'var(--text-3)', textAlign: 'center', margin: '.5rem 0 1rem' }}>
              Accede sin cuenta para participar<br />en el programa de reciclaje
            </p>
          )}

          <button
            type="submit"
            className={`btn btn-full btn-lg ${isInvitado ? 'btn-secondary' : 'btn-primary'}`}
            style={{ marginTop: isInvitado ? 0 : '1.25rem' }}
            disabled={loading}
          >
            {loading        ? 'Verificando...'
             : isInvitado   ? '♻ Entrar como invitado'
             : 'Iniciar sesión'}
          </button>
        </form>

      </div>
    </div>
  );
}

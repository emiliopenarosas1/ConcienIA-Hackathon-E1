import { useState, useRef } from 'react';
import ChatBot          from './ChatBot.jsx';
import AdminDashboard   from '../views/admin/Dashboard.jsx';
import AdminEventos     from '../views/admin/Eventos.jsx';
import AdminHistorial   from '../views/admin/Historial.jsx';
import AdminIntendencia from '../views/admin/Intendencia.jsx';
import AdminCupones     from '../views/admin/Cupones.jsx';
import AdminAnalytics   from '../views/admin/Analytics.jsx';

const NAV = [
  { id: 'dashboard',   icon: '▤', label: 'Dashboard'   },
  { id: 'analytics',   icon: '◉', label: 'Analítica'   },
  { id: 'eventos',     icon: '＋', label: 'Nuevo Evento' },
  { id: 'historial',   icon: '☰', label: 'Historial'   },
  { id: 'intendencia', icon: '⊞', label: 'Intendencia' },
  { id: 'cupones',     icon: '◈', label: 'Cupones'     },
];

export default function AdminApp({ user, onLogout }) {
  const [view, setView] = useState('dashboard');
  // Mensaje para abrir el chat con contexto específico
  const chatRef = useRef(null);

  const triggerChat = (mensaje) => {
    chatRef.current?.openWith(mensaje);
  };

  const currentLabel = NAV.find(n => n.id === view)?.label || '';

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img src="/logo_trazza.jpeg" alt="Trazza" style={{ width: 38, height: 38, borderRadius: 8, objectFit: 'cover', marginBottom: '.35rem', display: 'block' }} />
          <div className="sidebar-brand-name">Trazza</div>
          <div className="sidebar-brand-sub">Gestión de Residuos</div>
        </div>

        <nav className="sidebar-nav">
          {NAV.map(item => (
            <button
              key={item.id}
              className={`sidebar-nav-item ${view === item.id ? 'active' : ''}`}
              onClick={() => setView(item.id)}
            >
              <span className="sidebar-nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            Sesión iniciada como<br />
            <span className="sidebar-user-name">{user.nombre}</span>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            style={{ color: 'var(--green-300)', width: '100%' }}
            onClick={onLogout}
          >
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="admin-main">
        <header className="admin-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
            {view !== 'dashboard' && (
              <button
                className="btn btn-ghost btn-sm"
                style={{ padding: '.3rem .6rem', color: 'var(--text-2)' }}
                onClick={() => setView('dashboard')}
                title="Volver al dashboard"
              >
                ← Inicio
              </button>
            )}
            <span className="admin-topbar-title">{currentLabel}</span>
          </div>
          <span className="text-sm text-muted">{user.usuario}</span>
        </header>

        <div className="admin-content">
          {view === 'dashboard'   && <AdminDashboard onNavigate={setView} />}
          {view === 'analytics'   && <AdminAnalytics />}
          {view === 'eventos'     && <AdminEventos onNavigate={setView} onAskChat={triggerChat} />}
          {view === 'historial'   && <AdminHistorial />}
          {view === 'intendencia' && <AdminIntendencia />}
          {view === 'cupones'     && <AdminCupones />}
        </div>
      </div>

      <ChatBot ref={chatRef} />
    </div>
  );
}

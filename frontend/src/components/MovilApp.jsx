import { useState } from 'react';
import MovilRegistro    from '../views/movil/Registro.jsx';
import MovilIdentificar from '../views/movil/Identificar.jsx';
import MovilHistorial   from '../views/movil/MisRegistros.jsx';
import PrivacyModal, { PRIVACY_ACCEPTED_KEY, PrivacyLink } from './PrivacyModal.jsx';

const TABS = [
  { id: 'registro',    icon: '✎', label: 'Registro'    },
  { id: 'identificar', icon: '⊙', label: 'Identificar' },
  { id: 'historial',   icon: '☰', label: 'Mis registros' },
];

export default function MovilApp({ user, onLogout }) {
  const [tab, setTab] = useState('registro');

  /* ── Privacy state ── */
  const [showPrivacy, setShowPrivacy] = useState(
    () => !localStorage.getItem(PRIVACY_ACCEPTED_KEY)
  );
  const [reviewPrivacy, setReviewPrivacy] = useState(false);

  const handleAccept = () => {
    localStorage.setItem(PRIVACY_ACCEPTED_KEY, '1');
    setShowPrivacy(false);
  };

  const nombre = user.nombre?.split(' ')[0] || user.usuario;

  return (
    <div className="movil-layout">
      {/* First-run privacy gate */}
      {showPrivacy && <PrivacyModal onAccept={handleAccept} />}

      {/* Manual review modal */}
      {reviewPrivacy && (
        <PrivacyModal onAccept={handleAccept} onClose={() => setReviewPrivacy(false)} />
      )}

      <header className="movil-topbar">
        <span className="movil-topbar-brand">♻ Trazza</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
          <span className="movil-topbar-user">Hola, {nombre}</span>
          <button
            style={{ background: 'none', border: 'none', color: 'var(--green-300)', fontSize: '.75rem', cursor: 'pointer' }}
            onClick={onLogout}
          >
            Salir
          </button>
        </div>
      </header>

      <main className="movil-content">
        {tab === 'registro'    && <MovilRegistro user={user} />}
        {tab === 'identificar' && <MovilIdentificar />}
        {tab === 'historial'   && <MovilHistorial user={user} />}

        {/* Re-activate link at the bottom of every view */}
        <PrivacyLink onOpen={() => setReviewPrivacy(true)} />
      </main>

      <nav className="movil-nav">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`movil-nav-btn ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <span className="movil-nav-icon">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

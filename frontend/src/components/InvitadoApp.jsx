import { useState } from 'react';
import CamaraBasura from '../views/invitado/CamaraBasura.jsx';
import MiProgreso   from '../views/invitado/MiProgreso.jsx';
import MisCupones   from '../views/invitado/MisCupones.jsx';
import PrivacyModal, { PRIVACY_ACCEPTED_KEY, PrivacyLink } from './PrivacyModal.jsx';

function getSessionId() {
  let id = localStorage.getItem('ci_session_id');
  if (!id) {
    id = 'ci-' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
    localStorage.setItem('ci_session_id', id);
  }
  return id;
}

const TABS = [
  { id: 'registrar', icon: '♻', label: 'Registrar'   },
  { id: 'progreso',  icon: '▲', label: 'Mi Progreso' },
  { id: 'cupones',   icon: '◈', label: 'Mis Cupones' },
];

export default function InvitadoApp({ onExit }) {
  const [tab,       setTab]       = useState('registrar');
  const [sessionId]               = useState(getSessionId);
  const [count,     setCount]     = useState(0);

  /* ── Privacy state ── */
  const [showPrivacy, setShowPrivacy] = useState(
    () => !localStorage.getItem(PRIVACY_ACCEPTED_KEY)
  );
  const [reviewPrivacy, setReviewPrivacy] = useState(false);

  const handleAccept = () => {
    localStorage.setItem(PRIVACY_ACCEPTED_KEY, '1');
    setShowPrivacy(false);
  };

  const handleRegistro = (nuevoCount) => {
    setCount(nuevoCount);
    if (nuevoCount > 0 && nuevoCount % 3 === 0) {
      setTimeout(() => setTab('cupones'), 1200);
    }
  };

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
          {count > 0 && (
            <span className="movil-topbar-user">{count} basura{count !== 1 ? 's' : ''}</span>
          )}
          <button
            style={{ background: 'none', border: 'none', color: 'var(--green-300)', fontSize: '.75rem', cursor: 'pointer' }}
            onClick={onExit}
          >
            Salir
          </button>
        </div>
      </header>

      <main className="movil-content">
        {tab === 'registrar' && (
          <CamaraBasura sessionId={sessionId} onRegistro={handleRegistro} />
        )}
        {tab === 'progreso' && (
          <MiProgreso sessionId={sessionId} count={count} onCountUpdate={setCount} />
        )}
        {tab === 'cupones' && (
          <MisCupones sessionId={sessionId} count={count} />
        )}

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

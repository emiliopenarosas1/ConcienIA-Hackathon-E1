import { useState } from 'react';
import CamaraBasura from '../views/invitado/CamaraBasura.jsx';
import MiProgreso   from '../views/invitado/MiProgreso.jsx';
import MisCupones   from '../views/invitado/MisCupones.jsx';
import PrivacyModal, { PRIVACY_ACCEPTED_KEY, PrivacyLink } from './PrivacyModal.jsx';

/**
 * @file InvitadoApp.jsx
 * @description Componente principal para el flujo de usuario Invitado/Asistente.
 * Administra el estado de navegación, las sesiones anónimas y el flujo del aviso de privacidad.
 */

/**
 * Genera u obtiene un identificador único de sesión anónima (UUID) almacenado en localStorage.
 * 
 * @returns {string} Identificador único de sesión.
 */
function getSessionId() {
  let id = localStorage.getItem('ci_session_id');
  if (!id) {
    id = 'ci-' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
    localStorage.setItem('ci_session_id', id);
  }
  return id;
}

/**
 * Pestañas o secciones disponibles para la aplicación del asistente.
 * @type {Array<{id: string, icon: string, label: string}>}
 */
const TABS = [
  { id: 'registrar', icon: '♻', label: 'Registrar'   },
  { id: 'progreso',  icon: '▲', label: 'Mi Progreso' },
  { id: 'cupones',   icon: '◈', label: 'Mis Cupones' },
];

/**
 * Componente principal para el flujo de invitados.
 * 
 * @param {Object} props - Propiedades del componente.
 * @param {function} props.onExit - Función callback para salir del modo invitado.
 * @returns {JSX.Element} Elemento JSX que renderiza la interfaz del asistente.
 */
export default function InvitadoApp({ onExit }) {
  const [tab, setTab] = useState('registrar');
  const [sessionId] = useState(getSessionId);
  const [count, setCount] = useState(0);

  const [showPrivacy, setShowPrivacy] = useState(
    () => !localStorage.getItem(PRIVACY_ACCEPTED_KEY)
  );
  const [reviewPrivacy, setReviewPrivacy] = useState(false);

  /**
   * Almacena la aceptación del aviso de privacidad y oculta el modal correspondiente.
   */
  const handleAccept = () => {
    localStorage.setItem(PRIVACY_ACCEPTED_KEY, '1');
    setShowPrivacy(false);
  };

  /**
   * Maneja el registro de un residuo clasificado y redirige a la pestaña de cupones cada 3 registros.
   * 
   * @param {number} nuevoCount - Número acumulado de residuos registrados.
   */
  const handleRegistro = (nuevoCount) => {
    setCount(nuevoCount);
    if (nuevoCount > 0 && nuevoCount % 3 === 0) {
      setTimeout(() => setTab('cupones'), 1200);
    }
  };

  return (
    <div className="movil-layout">
      {showPrivacy && <PrivacyModal onAccept={handleAccept} />}

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

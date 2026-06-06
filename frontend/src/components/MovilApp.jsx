import { useState } from 'react';
import MovilRegistro    from '../views/movil/Registro.jsx';
import MovilIdentificar from '../views/movil/Identificar.jsx';
import MovilHistorial   from '../views/movil/MisRegistros.jsx';
import PrivacyModal, { PRIVACY_ACCEPTED_KEY, PrivacyLink } from './PrivacyModal.jsx';

/**
 * @file MovilApp.jsx
 * @description Componente principal para la interfaz móvil del Personal de Intendencia / Operadores.
 * Permite registrar residuos, clasificarlos usando IA y consultar el historial, gestionando la privacidad obligatoria.
 */

/**
 * Pestañas o secciones disponibles para la aplicación de intendencia.
 * @type {Array<{id: string, icon: string, label: string}>}
 */
const TABS = [
  { id: 'registro',    icon: '✎', label: 'Registro'    },
  { id: 'identificar', icon: '⊙', label: 'Identificar' },
  { id: 'historial',   icon: '☰', label: 'Mis registros' },
];

/**
 * Componente principal para el flujo móvil de intendencia.
 * 
 * @param {Object} props - Propiedades del componente.
 * @param {Object} props.user - Objeto que representa los datos del usuario autenticado.
 * @param {string} props.user.nombre - Nombre completo del usuario.
 * @param {string} props.user.usuario - Nombre de usuario único.
 * @param {function} props.onLogout - Función callback para cerrar la sesión actual.
 * @returns {JSX.Element} Elemento JSX que representa la aplicación móvil de intendencia.
 */
export default function MovilApp({ user, onLogout }) {
  const [tab, setTab] = useState('registro');

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

  const nombre = user.nombre?.split(' ')[0] || user.usuario;

  return (
    <div className="movil-layout">
      {showPrivacy && <PrivacyModal onAccept={handleAccept} />}

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

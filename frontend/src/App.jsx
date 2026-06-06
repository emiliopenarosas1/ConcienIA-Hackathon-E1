import { useState, useEffect } from 'react';
import PrivacyModal from './components/PrivacyModal.jsx';
import Dashboard from './components/Dashboard.jsx';
import EventoForm from './components/EventoForm.jsx';
import Clasificador from './components/Clasificador.jsx';
import Recomendaciones from './components/Recomendaciones.jsx';
import ARCOPanel from './components/ARCOPanel.jsx';
import './styles/global.css';
import './styles/glassmorphism.css';
import './styles/animations.css';

const TABS = [
  { id: 'dashboard',       label: 'Dashboard',           icon: '📊' },
  { id: 'estimar',         label: 'Estimar Evento',      icon: '⚡' },
  { id: 'clasificar',      label: 'Clasificar Residuos', icon: '🔍' },
  { id: 'recomendaciones', label: 'Recomendaciones',     icon: '💡' },
  { id: 'privacidad',      label: 'Privacidad',          icon: '🔒' },
];

export default function App() {
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentEvento, setCurrentEvento] = useState(null);

  useEffect(() => {
    if (localStorage.getItem('privacy_accepted') === 'true') setPrivacyAccepted(true);
  }, []);

  const handlePrivacyAccept = () => {
    localStorage.setItem('privacy_accepted', 'true');
    setPrivacyAccepted(true);
  };

  const navigateTo = (tab, evento) => {
    if (evento) setCurrentEvento(evento);
    setActiveTab(tab);
  };

  return (
    <div className="app">
      {!privacyAccepted && <PrivacyModal onAccept={handlePrivacyAccept} />}

      <header className="app-header">
        <div className="header-brand">
          <span className="brand-icon">♻</span>
          <h1>Data Circular</h1>
          <span className="brand-subtitle">Optimización de Residuos · IA Local</span>
        </div>

        <nav className="app-nav">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`nav-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              title={tab.label}
            >
              <span style={{ marginRight: '0.3rem' }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="app-main">
        {activeTab === 'dashboard' && (
          <Dashboard onNavigate={(tab) => setActiveTab(tab)} />
        )}
        {activeTab === 'estimar' && (
          <EventoForm
            onEventoCreado={(ev) => navigateTo('recomendaciones', ev)}
          />
        )}
        {activeTab === 'clasificar' && <Clasificador />}
        {activeTab === 'recomendaciones' && (
          <Recomendaciones eventoId={currentEvento?.id} />
        )}
        {activeTab === 'privacidad' && <ARCOPanel />}
      </main>
    </div>
  );
}

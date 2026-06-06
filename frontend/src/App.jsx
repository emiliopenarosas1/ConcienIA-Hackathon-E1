import { useState, useEffect } from 'react';
import Login       from './components/Login.jsx';
import AdminApp    from './components/AdminApp.jsx';
import MovilApp    from './components/MovilApp.jsx';
import InvitadoApp from './components/InvitadoApp.jsx';
import './styles/main.css';

function getStoredUser() {
  try {
    const raw = localStorage.getItem('ci_user');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function isInvitadoHash() {
  return window.location.hash === '#invitado';
}

export default function App() {
  const [user,        setUser]        = useState(getStoredUser);
  const [invitadoMode, setInvitadoMode] = useState(isInvitadoHash);

  useEffect(() => {
    if (!localStorage.getItem('ci_token')) setUser(null);
  }, []);

  useEffect(() => {
    const handler = () => setInvitadoMode(isInvitadoHash());
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  const handleLogin = (data) => {
    setUser({ nombre: data.nombre, rol: data.rol, usuario: data.usuario });
  };

  const handleLogout = () => {
    localStorage.removeItem('ci_token');
    localStorage.removeItem('ci_user');
    setUser(null);
  };

  const handleExitInvitado = () => {
    window.location.hash = '';
  };

  if (invitadoMode) return <InvitadoApp onExit={handleExitInvitado} />;
  if (!user)              return <Login onLogin={handleLogin} />;
  if (user.rol === 'admin') return <AdminApp user={user} onLogout={handleLogout} />;
  return <MovilApp user={user} onLogout={handleLogout} />;
}

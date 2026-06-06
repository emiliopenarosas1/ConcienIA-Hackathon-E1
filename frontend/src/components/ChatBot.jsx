import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { api } from '../services/api.js';

const SUGERENCIAS = [
  'Lista los eventos',
  'Estadísticas del sistema',
  '¿Cómo se calculan las estimaciones?',
];

const ChatBot = forwardRef(function ChatBot(_, ref) {
  const [abierto,   setAbierto]   = useState(false);
  const [mensajes,  setMensajes]  = useState([
    { rol: 'bot', texto: 'Hola, soy MARE, el asistente de Trazza.\n¿En qué puedo ayudarte?' },
  ]);
  const [input,    setInput]    = useState('');
  const [cargando, setCargando] = useState(false);
  const bottomRef = useRef(null);

  // Permite que AdminApp abra el chat y envíe un mensaje desde fuera
  useImperativeHandle(ref, () => ({
    openWith(mensaje) {
      setAbierto(true);
      // Pequeño delay para que el panel monte antes de enviar
      setTimeout(() => enviar(mensaje), 80);
    },
  }));

  useEffect(() => {
    if (abierto) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes, abierto]);

  async function enviar(texto) {
    const msg = (typeof texto === 'string' ? texto : input).trim();
    if (!msg || cargando) return;
    setInput('');
    setMensajes(prev => [...prev, { rol: 'user', texto: msg }]);
    setCargando(true);
    try {
      const data = await api.chat(msg);
      setMensajes(prev => [...prev, { rol: 'bot', texto: data.respuesta }]);
    } catch {
      setMensajes(prev => [...prev, { rol: 'bot', texto: 'Error al conectar con el servidor.' }]);
    } finally {
      setCargando(false);
    }
  }

  return (
    <>
      {abierto && (
        <div className="chat-panel" role="dialog" aria-label="MARE">
          <header className="chat-header">
            <span className="chat-title">MARE</span>
            <button className="chat-close" onClick={() => setAbierto(false)} aria-label="Cerrar">✕</button>
          </header>

          <div className="chat-messages">
            {mensajes.map((m, i) => (
              <div key={i} className={`chat-msg chat-msg--${m.rol}`}>
                <pre className="chat-msg-text">{m.texto}</pre>
              </div>
            ))}
            {cargando && (
              <div className="chat-msg chat-msg--bot">
                <div className="chat-msg-text chat-typing">
                  <span /><span /><span />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="chat-sugerencias">
            {SUGERENCIAS.map(s => (
              <button key={s} className="chat-chip" onClick={() => enviar(s)}>{s}</button>
            ))}
          </div>

          <form className="chat-input-row" onSubmit={e => { e.preventDefault(); enviar(); }}>
            <input
              className="chat-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Escribe tu consulta..."
              disabled={cargando}
            />
            <button
              type="submit"
              className="chat-send"
              disabled={!input.trim() || cargando}
              aria-label="Enviar"
            >
              →
            </button>
          </form>
        </div>
      )}

      <button
        className={`chat-fab ${abierto ? 'chat-fab--active' : ''}`}
        onClick={() => setAbierto(v => !v)}
        aria-label="Abrir asistente"
      >
        {abierto ? '✕' : '♻'}
      </button>
    </>
  );
});

export default ChatBot;

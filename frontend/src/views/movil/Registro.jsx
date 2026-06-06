import { useState, useEffect } from 'react';
import { api } from '../../services/api.js';

const TIPOS = [
  { key: 'PET',          label: 'PET / Plástico',   kg: 1.2 },
  { key: 'Organico',     label: 'Orgánico',          kg: 3.0 },
  { key: 'Aluminio',     label: 'Aluminio',          kg: 0.8 },
  { key: 'Vidrio',       label: 'Vidrio',            kg: 4.5 },
  { key: 'Carton',       label: 'Cartón',            kg: 2.0 },
  { key: 'NoReciclable', label: 'No reciclable',     kg: 2.5 },
];

const initBolsas = () => Object.fromEntries(TIPOS.map(t => [t.key, 0]));

export default function MovilRegistro({ user }) {
  const [step,      setStep]      = useState('evento'); // 'evento' | 'registro'
  const [eventos,   setEventos]   = useState([]);
  const [loadingEv, setLoadingEv] = useState(true);
  const [evento,    setEvento]    = useState(null);
  const [zona,      setZona]      = useState('');
  const [bolsas,    setBolsas]    = useState(initBolsas);
  const [submitting, setSubmitting] = useState(false);
  const [success,   setSuccess]   = useState('');
  const [error,     setError]     = useState('');

  useEffect(() => {
    api.getEventos()
      .then(data => setEventos(data.slice(0, 8)))
      .finally(() => setLoadingEv(false));
  }, []);

  const adj = (tipo, delta) => setBolsas(b => ({ ...b, [tipo]: Math.max(0, b[tipo] + delta) }));

  const totalBolsas = Object.values(bolsas).reduce((s, v) => s + v, 0);
  const totalKg     = TIPOS.reduce((s, t) => s + bolsas[t.key] * t.kg, 0);

  const handleRegistrar = async () => {
    if (!zona.trim())         { setError('Indica la zona de trabajo.'); return; }
    if (totalBolsas === 0)    { setError('Agrega al menos una bolsa.'); return; }

    const registros = TIPOS
      .filter(t => bolsas[t.key] > 0)
      .map(t => ({ tipo_basura: t.key, cantidad_bolsas: bolsas[t.key] }));

    setSubmitting(true);
    setError('');
    try {
      const res = await api.registrarLimpieza({ evento_id: evento.id, zona, registros });
      setSuccess(`Registro guardado: ${res.insertados} tipo(s), zona ${res.zona_normalizada}`);
      setZona('');
      setBolsas(initBolsas());
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Step 1 — Select event
  if (step === 'evento') {
    return (
      <div>
        <h2 style={{ marginBottom: '.3rem' }}>¿En qué evento trabajas hoy?</h2>
        <p style={{ marginBottom: '1rem' }}>Selecciona el evento para registrar residuos</p>

        {loadingEv ? (
          <div className="spinner-page"><div className="spinner" /></div>
        ) : eventos.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">☷</div>
            <h3>Sin eventos disponibles</h3>
            <p>El administrador debe crear un evento primero</p>
          </div>
        ) : (
          <div className="event-list">
            {eventos.map(ev => (
              <div
                key={ev.id}
                className={`event-item ${evento?.id === ev.id ? 'selected' : ''}`}
                onClick={() => { setEvento(ev); setStep('registro'); }}
              >
                <div className="event-item-name">{ev.nombre}</div>
                <div className="event-item-meta">
                  {ev.tipo} · {(ev.asistentes || 0).toLocaleString('es-MX')} personas · {ev.duracion_horas}h
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Step 2 — Register waste
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', marginBottom: '1rem' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => { setStep('evento'); setSuccess(''); setError(''); }}>
          ← Cambiar evento
        </button>
        <span className="badge badge-green">{evento.nombre}</span>
      </div>

      {success && (
        <div className="alert alert-success" style={{ marginBottom: '1rem' }}>
          {success}
        </div>
      )}
      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {/* Zone */}
      <div className="form-group" style={{ marginBottom: '1rem' }}>
        <label className="form-label">Zona de trabajo</label>
        <input
          className="form-input"
          value={zona}
          onChange={e => setZona(e.target.value)}
          placeholder="Ej. ESCENARIO PRINCIPAL"
          style={{ fontSize: '1rem', padding: '.65rem .85rem' }}
        />
      </div>

      {/* Waste steppers */}
      <div className="section-title">Bolsas recolectadas</div>
      <div className="waste-list">
        {TIPOS.map(t => (
          <div key={t.key} className="waste-row">
            <div>
              <div className="waste-row-label">{t.label}</div>
              <div className="waste-row-meta">bolsas</div>
            </div>
            <div className="stepper">
              <button className="stepper-btn" onClick={() => adj(t.key, -1)} disabled={bolsas[t.key] === 0}>−</button>
              <span className="stepper-value">{bolsas[t.key]}</span>
              <button className="stepper-btn" onClick={() => adj(t.key, +1)}>+</button>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      {totalBolsas > 0 && (
        <div style={{ background: 'var(--green-50)', border: '1px solid var(--green-100)', borderRadius: 'var(--radius)', padding: '.75rem 1rem', marginTop: '1rem', fontSize: '.875rem', color: 'var(--green-700)' }}>
          Total: <strong>{totalBolsas} bolsas</strong>
        </div>
      )}

      <button
        className="btn btn-primary btn-full btn-lg"
        style={{ marginTop: '1.25rem' }}
        onClick={handleRegistrar}
        disabled={submitting || totalBolsas === 0 || !zona.trim()}
      >
        {submitting ? 'Guardando...' : 'Registrar recolección'}
      </button>
    </div>
  );
}

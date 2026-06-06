import { useState, useEffect } from 'react';
import GlassCard from './GlassCard.jsx';
import { api } from '../services/api.js';

const DIFICULTAD_COLOR = {
  baja:  { bg: 'hsla(128,55%,42%,0.15)', color: 'hsl(128,55%,60%)', border: 'hsla(128,55%,42%,0.3)' },
  media: { bg: 'hsla(44,90%,52%,0.15)',  color: 'hsl(44,90%,62%)',  border: 'hsla(44,90%,52%,0.3)' },
  alta:  { bg: 'hsla(0,70%,50%,0.15)',   color: 'hsl(0,70%,62%)',   border: 'hsla(0,70%,50%,0.3)' },
};

const IMPACTO_BADGE = {
  'muy alto': 'badge badge-muy-alto',
  'alto':     'badge badge-alto',
  'medio':    'badge badge-medio',
  'bajo':     'badge badge-bajo',
};

export default function Recomendaciones({ eventoId }) {
  const [eventos, setEventos] = useState([]);
  const [selectedId, setSelectedId] = useState(eventoId || null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getEventos().then(setEventos).catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedId) loadRecomendaciones(selectedId);
  }, [selectedId]);

  const loadRecomendaciones = async (id) => {
    setLoading(true); setError(null); setData(null);
    try {
      const res = await api.getRecomendaciones(id);
      setData(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const totalReduccion = data?.recomendaciones?.reduce((s, r) => s + (r.reduccion_co2_kg || 0), 0) || 0;

  return (
    <div className="page-enter">
      <h2 className="section-title">Recomendaciones de Economía Circular</h2>

      {/* Selector de evento */}
      <GlassCard style={{ padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label className="form-label" style={{ marginBottom: '0.4rem', display: 'block' }}>Seleccionar evento</label>
            <select
              className="form-select"
              value={selectedId || ''}
              onChange={e => setSelectedId(e.target.value)}
            >
              <option value="">— Elige un evento —</option>
              {eventos.map(ev => (
                <option key={ev.id} value={ev.id}>
                  #{ev.id} · {ev.nombre} ({ev.tipo}, {Number(ev.asistentes).toLocaleString()} asistentes)
                </option>
              ))}
            </select>
          </div>
          {data && (
            <div style={{ display: 'flex', gap: '1.5rem', flexShrink: 0 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--accent-glow)' }}>{data.recomendaciones.length}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>recomendaciones</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'hsl(128,55%,55%)' }}>{(totalReduccion / 1000).toFixed(1)}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>ton CO₂ evitables</div>
              </div>
            </div>
          )}
        </div>
      </GlassCard>

      {!selectedId && (
        <div className="empty-state">
          <div className="empty-icon">💡</div>
          <p>Selecciona un evento para ver las recomendaciones de la IA</p>
        </div>
      )}

      {loading && (
        <div className="empty-state"><span className="spinner" style={{ width: 32, height: 32 }} /></div>
      )}

      {error && (
        <div className="glass-flat" style={{ padding: '1rem', color: 'hsl(0,70%,65%)', marginBottom: '1rem', borderLeft: '3px solid hsl(0,70%,50%)' }}>
          ⚠ {error}
        </div>
      )}

      {data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }} className="stagger">
          {data.recomendaciones.map((rec, i) => {
            const dif = DIFICULTAD_COLOR[rec.dificultad] || DIFICULTAD_COLOR.media;
            const impactoPct = Math.min(100, (rec.prioridad / 4) * 100);
            return (
              <GlassCard key={rec.id} className="rec-card hover-lift">
                <div className="rec-icon">{rec.icono}</div>
                <div className="rec-body">
                  <div className="rec-title">
                    <span style={{ color: 'var(--text-3)', marginRight: '0.4rem', fontSize: '0.78rem' }}>#{i + 1}</span>
                    {rec.titulo}
                  </div>
                  <div className="rec-desc">{rec.descripcion}</div>

                  {/* Impact bar */}
                  <div style={{ marginBottom: '0.6rem' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginBottom: '0.2rem' }}>Prioridad de impacto</div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${impactoPct}%`, background: `linear-gradient(90deg, var(--accent-dim), var(--accent-glow))` }} />
                    </div>
                  </div>

                  <div className="rec-footer">
                    <span className={IMPACTO_BADGE[rec.impacto] || 'badge badge-medio'}>
                      {rec.impacto}
                    </span>
                    <span
                      style={{
                        padding: '0.2rem 0.6rem', borderRadius: '99px', fontSize: '0.7rem', fontWeight: 600,
                        background: dif.bg, color: dif.color, border: `1px solid ${dif.border}`,
                      }}
                    >
                      Dificultad: {rec.dificultad}
                    </span>
                    <span className="rec-co2">
                      ↓ {rec.reduccion_co2_kg.toLocaleString()} kg CO₂ evitables
                    </span>
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}

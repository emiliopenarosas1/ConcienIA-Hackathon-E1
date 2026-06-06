import { useState } from 'react';
import GlassCard from './GlassCard.jsx';
import DonutChart from './DonutChart.jsx';
import { api } from '../services/api.js';

const TIPOS = [
  { value: 'concierto',   label: '🎵 Concierto' },
  { value: 'deportivo',   label: '⚽ Evento Deportivo' },
  { value: 'festival',    label: '🎪 Festival' },
  { value: 'conferencia', label: '📋 Conferencia' },
];

const MAT_LABELS = { PET: 'PET', Organico: 'Orgánico', Aluminio: 'Aluminio', Vidrio: 'Vidrio', Carton: 'Cartón' };
const MAT_COLORS = {
  PET: 'var(--c-pet)', Organico: 'var(--c-organico)', Aluminio: 'var(--c-aluminio)',
  Vidrio: 'var(--c-vidrio)', Carton: 'var(--c-carton)',
};

export default function EventoForm({ onEventoCreado }) {
  const [form, setForm] = useState({ nombre: '', tipo: 'festival', asistentes: 10000, duracion_horas: 6 });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError(null); setResult(null);
    try {
      const data = await api.estimar({ ...form, asistentes: Number(form.asistentes), duracion_horas: Number(form.duracion_horas) });
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const totalKg = result ? Object.values(result.residuos).reduce((s, v) => s + v, 0) : 0;

  return (
    <div className="page-enter">
      <h2 className="section-title">Estimar Residuos del Evento</h2>

      <div style={{ display: 'grid', gridTemplateColumns: result ? '1fr 1.2fr' : '1fr', gap: '1.5rem', maxWidth: result ? '100%' : '560px' }}>
        {/* Form */}
        <GlassCard style={{ padding: '1.75rem' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label">Nombre del evento</label>
              <input
                className="form-input"
                placeholder="Ej. Festival Música Verde 2024"
                value={form.nombre}
                onChange={e => set('nombre', e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Tipo de evento</label>
              <select className="form-select" value={form.tipo} onChange={e => set('tipo', e.target.value)}>
                {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Asistentes estimados: <strong style={{ color: 'var(--accent-glow)' }}>{Number(form.asistentes).toLocaleString()}</strong></label>
              <input
                type="range" min="500" max="200000" step="500"
                value={form.asistentes}
                onChange={e => set('asistentes', e.target.value)}
                style={{ width: '100%', accentColor: 'var(--accent)' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-3)' }}>
                <span>500</span><span>200,000</span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Duración: <strong style={{ color: 'var(--accent-glow)' }}>{form.duracion_horas}h</strong></label>
              <input
                type="range" min="1" max="24" step="0.5"
                value={form.duracion_horas}
                onChange={e => set('duracion_horas', e.target.value)}
                style={{ width: '100%', accentColor: 'var(--accent)' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-3)' }}>
                <span>1h</span><span>24h</span>
              </div>
            </div>

            {error && (
              <div className="glass-flat" style={{ padding: '0.85rem', color: 'hsl(0,70%,65%)', fontSize: '0.82rem', borderLeft: '3px solid hsl(0,70%,50%)' }}>
                ⚠ {error}
              </div>
            )}

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ justifyContent: 'center' }}>
              {loading ? <><span className="spinner" /> Estimando con IA...</> : '⚡ Estimar Residuos'}
            </button>
          </form>
        </GlassCard>

        {/* Resultado */}
        {result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} className="result-reveal">
            <GlassCard accent style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total estimado</div>
                  <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--accent-glow)', lineHeight: 1 }}>
                    {(totalKg / 1000).toFixed(2)}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-2)' }}>toneladas de residuos</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>CO₂ equivalente</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'hsl(30,80%,60%)' }}>
                    {(result.huella_carbono_kg / 1000).toFixed(1)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>ton CO₂eq</div>
                </div>
              </div>
              <DonutChart residuos={result.residuos} />
            </GlassCard>

            <GlassCard style={{ padding: '1.25rem' }}>
              <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-2)', marginBottom: '0.85rem' }}>
                Desglose por material
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {Object.entries(result.residuos).map(([key, kg]) => {
                  const mat = key.replace('kg_', '');
                  const pct = totalKg > 0 ? (kg / totalKg) * 100 : 0;
                  return (
                    <div key={key}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.25rem' }}>
                        <span style={{ color: MAT_COLORS[mat] || 'var(--text-2)', fontWeight: 500 }}>{MAT_LABELS[mat] || mat}</span>
                        <span style={{ color: 'var(--text-2)' }}>{(kg / 1000).toFixed(2)} ton ({pct.toFixed(1)}%)</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${pct}%`, background: MAT_COLORS[mat] || 'var(--accent)' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </GlassCard>

            <button
              className="btn btn-primary"
              style={{ justifyContent: 'center' }}
              onClick={() => onEventoCreado(result)}
            >
              💡 Ver Recomendaciones Circulares →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

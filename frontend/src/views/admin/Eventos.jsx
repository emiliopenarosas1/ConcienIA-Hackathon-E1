import { useState } from 'react';
import { api } from '../../services/api.js';

const TIPOS = ['concierto', 'festival', 'deportivo', 'conferencia', 'otro'];
const MATERIALES = ['PET', 'Organico', 'Aluminio', 'Vidrio', 'Carton', 'NoReciclable'];
const MAT_LABEL  = { PET: 'PET / Plástico', Organico: 'Orgánico', Aluminio: 'Aluminio', Vidrio: 'Vidrio', Carton: 'Cartón', NoReciclable: 'No reciclable' };
const RECICLABLES = ['PET', 'Organico', 'Aluminio', 'Vidrio', 'Carton'];
const IMPACTO_COLOR = { bajo: 'badge-green', medio: 'badge-orange', alto: 'badge-orange', crítico: 'badge-red' };

const MODOS = [
  { id: 'simulacion', icon: '⊙', label: 'Simulación',    desc: 'Proyecta qué podría generarse. No crea ningún registro.' },
  { id: 'evento',     icon: '✓', label: 'Crear evento',  desc: 'Registra el evento real. Los intendentes podrán reportar.' },
];

/* ── Componente de resultado compartido ─────────────────────────────────────── */
function PreviewResult({ preview, modo, form, setForm, saving, onGuardar, onReset, onAskChat }) {
  const residuos      = preview.residuos || {};
  const residuoTotal  = Object.values(residuos).reduce((s, v) => s + v, 0);
  const pctReciclable = residuoTotal > 0
    ? ((RECICLABLES.reduce((s, m) => s + (residuos[`kg_${m}`] || 0), 0) / residuoTotal) * 100).toFixed(0)
    : 0;

  // CO₂ equivalencias
  const co2 = preview.huella_carbono_kg || 0;
  const co2Ton     = (co2 / 1000).toFixed(2);
  const vuelos     = Math.round(co2 / 145);
  const arboles    = Math.round(co2 / 22);
  const co2Evit    = preview.impacto?.co2_evitable_kg || 0;

  return (
    <div className="card" style={{ marginTop: '1.5rem' }}>
      <div className="card-header">
        <h2>Resultado de simulación</h2>
        <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
          <span style={{ fontSize: '.7rem', fontWeight: 600, padding: '.2rem .6rem', borderRadius: 99, background: 'var(--cream-200)', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
            Solo estimación
          </span>
          <span className={`badge ${IMPACTO_COLOR[preview.impacto?.nivel] || 'badge-gray'}`}>
            Impacto {preview.impacto?.nivel}
          </span>
          <button className="btn btn-ghost btn-sm" onClick={() => onAskChat?.('¿Cómo se calculan las estimaciones de residuos?')}>
            ¿Cómo se calcula?
          </button>
        </div>
      </div>

      <div className="card-body">
        {/* KPIs sin kg */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="stat-card">
            <div className="stat-card-label">Proporción reciclable</div>
            <div className="stat-card-value" style={{ color: 'var(--green-600)', fontSize: '1.4rem' }}>{pctReciclable}%</div>
            <div className="stat-card-unit">del total estimado</div>
          </div>
          <div className="stat-card" style={{ borderLeftColor: 'var(--red)' }}>
            <div className="stat-card-label">CO₂ a relleno sanitario</div>
            <div className="stat-card-value" style={{ color: 'var(--red)', fontSize: '1.4rem' }}>{co2Ton}</div>
            <div className="stat-card-unit">ton CO₂eq estimadas</div>
          </div>
          <div className="stat-card" style={{ borderLeftColor: '#0891B2' }}>
            <div className="stat-card-label">CO₂ evitable reciclando</div>
            <div className="stat-card-value" style={{ color: '#0891B2', fontSize: '1.4rem' }}>{(co2Evit / 1000).toFixed(2)}</div>
            <div className="stat-card-unit">ton CO₂eq evitables</div>
          </div>
        </div>

        {/* Equivalencias */}
        {co2 > 0 && (
          <div style={{ background: 'var(--green-50)', border: '1px solid var(--green-100)', borderRadius: 'var(--radius)', padding: '.75rem 1rem', marginBottom: '1.25rem', fontSize: '.85rem', color: 'var(--green-700)' }}>
            {preview.impacto?.descripcion} — equivale a{' '}
            <strong>{vuelos}</strong> vuelo{vuelos !== 1 ? 's' : ''} CDMX‑MTY o{' '}
            <strong>{arboles.toLocaleString('es-MX')}</strong> árbol{arboles !== 1 ? 'es' : ''} absorbiendo CO₂ durante un año.
          </div>
        )}

        {/* Desglose por material (% no kg) */}
        <h4 style={{ marginBottom: '.6rem' }}>Distribución por material</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.3rem', marginBottom: '1rem' }}>
          {MATERIALES.map(m => {
            const val = residuos[`kg_${m}`];
            if (!val) return null;
            const pct = residuoTotal > 0 ? ((val / residuoTotal) * 100).toFixed(1) : 0;
            const rec = RECICLABLES.includes(m);
            return (
              <div key={m} style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
                <div style={{ width: 110, fontSize: '.76rem', color: 'var(--text-2)', textAlign: 'right', flexShrink: 0 }}>
                  {MAT_LABEL[m]}
                </div>
                <div style={{ flex: 1, background: 'var(--cream-200)', borderRadius: 4, height: 12, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: rec ? 'var(--green-500)' : 'var(--red)', borderRadius: 4 }} />
                </div>
                <div style={{ width: 42, fontSize: '.76rem', color: 'var(--text-2)', textAlign: 'right', flexShrink: 0 }}>
                  {pct}%
                </div>
                <span className={`badge ${rec ? 'badge-green' : 'badge-red'}`} style={{ fontSize: '.65rem', flexShrink: 0 }}>
                  {rec ? 'Rec.' : 'No rec.'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer — solo "Crear evento" muestra la opción de guardar */}
      {modo === 'evento' && (
        <div className="card-footer">
          <div style={{ display: 'flex', gap: '.75rem', alignItems: 'flex-end', flexWrap: 'wrap', width: '100%' }}>
            <div className="form-group" style={{ flex: 1, minWidth: 200, margin: 0 }}>
              <label className="form-label">Nombre del evento</label>
              <input
                className="form-input"
                value={form.nombre}
                onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                placeholder="Ej. Festival Primavera 2026"
              />
            </div>
            <button className="btn btn-primary btn-sm" onClick={onGuardar} disabled={saving}>
              {saving ? 'Guardando...' : '✓ Crear evento real'}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={onReset}>Descartar</button>
          </div>
          <p style={{ fontSize: '.75rem', color: 'var(--text-3)', marginTop: '.5rem' }}>
            Al crear el evento, los intendentes podrán registrar residuos reales. El modelo <strong>CONTAR</strong> procesará esos datos.
          </p>
        </div>
      )}

      {modo === 'simulacion' && (
        <div className="card-footer" style={{ justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost btn-sm" onClick={onReset}>Nueva simulación</button>
        </div>
      )}
    </div>
  );
}

/* ── Componente principal ────────────────────────────────────────────────────── */
export default function AdminEventos({ onNavigate, onAskChat }) {
  const [modo,    setModo]    = useState('simulacion');
  const [form,    setForm]    = useState({ nombre: '', tipo: 'concierto', tipoCustom: '', asistentes: '', duracion_horas: '' });
  const [preview, setPreview] = useState(null);
  const [saved,   setSaved]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleCambioModo = (id) => {
    setModo(id);
    setPreview(null);
    setSaved(null);
    setError('');
  };

  const tipoResuelto = form.tipo === 'otro' ? form.tipoCustom.trim() : form.tipo;

  const handlePreview = async (e) => {
    e.preventDefault();
    if (!tipoResuelto) {
      setError(form.tipo === 'otro' ? 'Ingresa el nombre del tipo de evento.' : 'Tipo, asistentes y duración son requeridos.');
      return;
    }
    if (!form.asistentes || !form.duracion_horas) {
      setError('Asistentes y duración son requeridos.');
      return;
    }
    setLoading(true);
    setError('');
    setPreview(null);
    setSaved(null);
    try {
      const data = await api.estimarPreview({
        tipo: tipoResuelto,
        asistentes: Number(form.asistentes),
        duracion_horas: Number(form.duracion_horas),
      });
      setPreview(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGuardar = async () => {
    if (!form.nombre.trim()) {
      setError('Ingresa un nombre para el evento.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const data = await api.estimar({
        nombre: form.nombre,
        tipo: tipoResuelto,
        asistentes: Number(form.asistentes),
        duracion_horas: Number(form.duracion_horas),
      });
      setSaved(data);
      setPreview(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const resetAll = () => {
    setPreview(null);
    setSaved(null);
    setError('');
    setForm({ nombre: '', tipo: 'concierto', tipoCustom: '', asistentes: '', duracion_horas: '' });
  };

  const modoActivo = MODOS.find(m => m.id === modo);

  return (
    <div style={{ maxWidth: 720 }}>

      {/* ── Selector de modo ───────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.75rem' }}>
        {MODOS.map(m => (
          <button
            key={m.id}
            onClick={() => handleCambioModo(m.id)}
            style={{
              flex: 1,
              padding: '1rem 1.1rem',
              borderRadius: 'var(--radius-md)',
              border: `2px solid ${modo === m.id ? 'var(--primary)' : 'var(--border)'}`,
              background: modo === m.id ? 'var(--primary-light)' : 'var(--surface)',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 140ms',
            }}
          >
            <div style={{ fontSize: '1.1rem', marginBottom: '.25rem' }}>{m.icon}</div>
            <div style={{ fontWeight: 700, fontSize: '.9rem', color: modo === m.id ? 'var(--primary)' : 'var(--text)' }}>
              {m.label}
            </div>
            <div style={{ fontSize: '.75rem', color: 'var(--text-3)', marginTop: '.15rem' }}>
              {m.desc}
            </div>
          </button>
        ))}
      </div>

      {/* ── Cabecera dinámica ──────────────────────────────────────────────── */}
      <div className="admin-page-header">
        <h1>{modo === 'simulacion' ? 'Simulación de residuos' : 'Crear evento real'}</h1>
        <p>
          {modo === 'simulacion'
            ? 'Proyecta qué podría generarse en un evento a partir de su tipo y tamaño. Solo planificación — no crea ningún registro en el sistema.'
            : 'Crea el evento en el sistema. Los intendentes lo verán en su app y podrán registrar residuos reales. El modelo CONTAR procesará y analizará esos datos.'}
        </p>
      </div>

      {/* ── Formulario ────────────────────────────────────────────────────── */}
      {!saved && (
        <div className="card">
          <div className="card-header">
            <h2>Parámetros</h2>
            {modo === 'evento' && (
              <span className="badge badge-green" style={{ fontSize: '.7rem' }}>Modelo CONTAR activo en campo</span>
            )}
            {modo === 'simulacion' && (
              <span className="badge badge-gray" style={{ fontSize: '.7rem' }}>Modelo Estimador — sin guardar</span>
            )}
          </div>
          <div className="card-body">
            {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

            <form onSubmit={handlePreview}>
              {/* Nombre solo en modo evento */}
              {modo === 'evento' && (
                <div className="form-group" style={{ marginBottom: '1rem' }}>
                  <label className="form-label">Nombre del evento</label>
                  <input
                    className="form-input"
                    value={form.nombre}
                    onChange={e => set('nombre', e.target.value)}
                    placeholder="Ej. Festival Primavera 2026"
                  />
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', alignItems: 'start' }}>
                <div className="form-group" style={{ marginTop: 0 }}>
                  <label className="form-label">Tipo de evento</label>
                  <select className="form-select" value={form.tipo} onChange={e => set('tipo', e.target.value)}>
                    {TIPOS.map(t => (
                      <option key={t} value={t}>
                        {t === 'otro' ? 'Otro...' : t.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ marginTop: 0 }}>
                  <label className="form-label">Duración (horas)</label>
                  <input className="form-input" type="number" min="1" max="72"
                    value={form.duracion_horas} onChange={e => set('duracion_horas', e.target.value)}
                    placeholder="Ej. 6" />
                </div>
              </div>

              {form.tipo === 'otro' && (
                <div className="form-group" style={{ marginTop: '1rem' }}>
                  <label className="form-label">Nombre del tipo de evento</label>
                  <input
                    className="form-input"
                    value={form.tipoCustom}
                    onChange={e => set('tipoCustom', e.target.value.toUpperCase())}
                    placeholder="Ej. CARNAVAL, EXPO, CONGRESO..."
                    autoFocus
                    style={{ textTransform: 'uppercase' }}
                  />
                </div>
              )}

              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label className="form-label">Asistentes estimados</label>
                <input className="form-input" type="number" min="1" max="1000000"
                  value={form.asistentes} onChange={e => set('asistentes', e.target.value)}
                  placeholder="Ej. 25000" />
              </div>

              <div style={{ display: 'flex', gap: '.75rem', marginTop: '1.25rem' }}>
                {modo === 'simulacion' ? (
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Calculando...' : '⊙ Calcular simulación'}
                  </button>
                ) : (
                  <>
                    <button type="submit" className="btn btn-secondary" disabled={loading}>
                      {loading ? 'Calculando...' : '⊙ Vista previa'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={loading || saving}
                      onClick={async (e) => {
                        if (!form.nombre.trim()) { setError('Ingresa un nombre para el evento.'); return; }
                        if (!tipoResuelto) { setError(form.tipo === 'otro' ? 'Ingresa el nombre del tipo de evento.' : 'Completa todos los campos.'); return; }
                        if (!form.asistentes || !form.duracion_horas) { setError('Completa todos los campos.'); return; }
                        setSaving(true); setError('');
                        try {
                          const data = await api.estimar({ nombre: form.nombre, tipo: tipoResuelto, asistentes: Number(form.asistentes), duracion_horas: Number(form.duracion_horas) });
                          setSaved(data);
                          setPreview(null);
                        } catch (err) { setError(err.message); }
                        finally { setSaving(false); }
                      }}
                    >
                      {saving ? 'Creando...' : '✓ Crear evento real'}
                    </button>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Resultado de estimación ───────────────────────────────────────── */}
      {preview && !saved && (
        <PreviewResult
          preview={preview}
          modo={modo}
          form={form}
          setForm={setForm}
          saving={saving}
          onGuardar={handleGuardar}
          onReset={resetAll}
          onAskChat={onAskChat}
        />
      )}

      {/* ── Evento creado ─────────────────────────────────────────────────── */}
      {saved && (
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: '2rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '.5rem', color: 'var(--green-600)' }}>✓</div>
            <h2 style={{ marginBottom: '.3rem' }}>Evento creado</h2>
            <p style={{ marginBottom: '.5rem' }}>
              <strong>#{saved.id} — {form.nombre}</strong> está activo en el sistema.
            </p>
            <p style={{ fontSize: '.85rem', color: 'var(--text-3)', marginBottom: '1.5rem' }}>
              Los intendentes ya lo ven en su app. Cuando registren residuos, la sección <strong>Analítica</strong> mostrará los datos procesados por el modelo CONTAR.
            </p>
            <div style={{ display: 'flex', gap: '.75rem', justifyContent: 'center' }}>
              <button className="btn btn-primary btn-sm" onClick={() => onNavigate('historial')}>Ver en historial</button>
              <button className="btn btn-secondary btn-sm" onClick={() => onNavigate('analytics')}>Ver analítica</button>
              <button className="btn btn-ghost btn-sm" onClick={resetAll}>Nuevo</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

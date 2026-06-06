import { useState, useRef } from 'react';
import { api } from '../../services/api.js';

const CONTENEDOR = {
  PET:          { color: '#2563EB', nombre: 'Bote azul — PET / Plástico' },
  Organico:     { color: '#16A34A', nombre: 'Bote verde — Orgánico' },
  Aluminio:     { color: '#CA8A04', nombre: 'Bote amarillo — Aluminio' },
  Vidrio:       { color: '#64748B', nombre: 'Bote blanco — Vidrio' },
  Carton:       { color: '#6B7280', nombre: 'Bote gris — Cartón' },
  NoReciclable: { color: '#1F2937', nombre: 'Bote negro — No reciclable' },
};

const PUNTOS_CUPON = 3;

function ProgressBar({ count }) {
  const pos  = count % PUNTOS_CUPON;
  const pct  = (pos / PUNTOS_CUPON) * 100;
  return (
    <div style={{ width: '100%', margin: '.5rem 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.72rem', color: 'var(--text-3)', marginBottom: '.3rem' }}>
        <span>Progreso hacia el próximo cupón</span>
        <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{pos} / {PUNTOS_CUPON}</span>
      </div>
      <div style={{ height: 8, background: 'var(--cream-300)', borderRadius: 999, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: 'var(--primary)', borderRadius: 999, transition: 'width 400ms ease' }} />
      </div>
    </div>
  );
}

export default function CamaraBasura({ sessionId, onRegistro }) {
  const [step,    setStep]    = useState('idle');
  const [preview, setPreview] = useState(null);
  const [result,  setResult]  = useState(null);
  const [error,   setError]   = useState('');
  const inputRef = useRef(null);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setPreview(previewUrl);
    setStep('loading');
    setResult(null);
    setError('');

    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = await api.invitadoClasificar({
          session_id:    sessionId,
          imagen_base64: ev.target.result,
        });
        setResult(data);
        if (data.bote_detectado) {
          setStep('success');
          onRegistro?.(data.registros_count);
        } else {
          setStep('fail_bote');
        }
      } catch (err) {
        setError(err.message);
        setStep('error');
      }
    };
    reader.readAsDataURL(file);
    // Reset input so the same photo can be re-selected after a fail
    e.target.value = '';
  };

  const reset = () => {
    setStep('idle');
    setPreview(null);
    setResult(null);
    setError('');
  };

  // ── IDLE ────────────────────────────────────────────────────────────────────
  if (step === 'idle') {
    return (
      <div>
        <div className="admin-page-header">
          <h1>Registrar basura</h1>
          <p>Tira la basura al bote y toma una foto para ganar puntos</p>
        </div>

        <div className="card" style={{ marginBottom: '1rem' }}>
          <div className="card-body">
            <label style={{ display: 'block', cursor: 'pointer' }}>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
                onChange={handleFile}
              />
              <div className="upload-zone" style={{ pointerEvents: 'none' }}>
                <div className="upload-icon">📷</div>
                <div className="upload-text" style={{ fontWeight: 600 }}>Tomar foto</div>
                <div className="upload-hint">
                  Apunta desde arriba al interior del bote mientras tiras la basura
                </div>
              </div>
            </label>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <p style={{ fontSize: '.8rem', fontWeight: 600, marginBottom: '.75rem', color: 'var(--text-2)' }}>
              ¿Cómo funciona?
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '.5rem', textAlign: 'center', fontSize: '.78rem', color: 'var(--text-3)' }}>
              <div>
                <div style={{ fontSize: '1.4rem', marginBottom: '.2rem' }}>📸</div>
                Tira al bote y toma la foto desde arriba
              </div>
              <div>
                <div style={{ fontSize: '1.4rem', marginBottom: '.2rem' }}>✅</div>
                El sistema valida que esté dentro del contenedor
              </div>
              <div>
                <div style={{ fontSize: '1.4rem', marginBottom: '.2rem' }}>🎫</div>
                10 basuras = 1 cupón para eventos
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── LOADING ─────────────────────────────────────────────────────────────────
  if (step === 'loading') {
    return (
      <div>
        {preview && (
          <img
            src={preview}
            alt="Foto capturada"
            style={{ width: '100%', maxHeight: '40vh', objectFit: 'cover', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}
          />
        )}
        <div className="spinner-page">
          <div className="spinner" />
          Analizando imagen...
        </div>
      </div>
    );
  }

  // ── FAIL: BOTE NO DETECTADO ─────────────────────────────────────────────────
  if (step === 'fail_bote') {
    return (
      <div>
        {preview && (
          <img
            src={preview}
            alt="Foto capturada"
            style={{ width: '100%', maxHeight: '35vh', objectFit: 'cover', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}
          />
        )}
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '.5rem' }}>🗑️</div>
            <h2 style={{ color: 'var(--red)', marginBottom: '.5rem' }}>No detectamos el bote</h2>
            <p style={{ fontSize: '.875rem', marginBottom: '1.25rem' }}>
              Asegúrate de apuntar la cámara hacia <strong>adentro del contenedor</strong> mientras tiras la basura. Los bordes del bote deben ser visibles en la foto.
            </p>
            {result?.clasificacion && (
              <div className="alert alert-info" style={{ marginBottom: '1rem', textAlign: 'left' }}>
                Material identificado: <strong>{result.clasificacion.categoria}</strong>
                {' '}({(result.clasificacion.confianza * 100).toFixed(0)}% confianza)
              </div>
            )}
            <button className="btn btn-primary btn-full" onClick={reset}>
              Intentar de nuevo
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── SUCCESS ─────────────────────────────────────────────────────────────────
  if (step === 'success' && result) {
    const cat      = result.clasificacion.categoria;
    const cont     = CONTENEDOR[cat] || { color: '#6B7280', nombre: cat };
    const count    = result.registros_count;
    const ganadoCupon = result.cupon_desbloqueado;
    const cyclePos = count % PUNTOS_CUPON;
    const faltan   = PUNTOS_CUPON - cyclePos;

    return (
      <div>
        {preview && (
          <img
            src={preview}
            alt="Foto capturada"
            style={{ width: '100%', maxHeight: '35vh', objectFit: 'cover', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}
          />
        )}
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '.4rem' }}>
              {ganadoCupon ? '🎉' : '✅'}
            </div>
            <h2 style={{ color: ganadoCupon ? 'var(--green-700)' : 'var(--green-700)', marginBottom: '.25rem' }}>
              {ganadoCupon ? '¡Cupón desbloqueado!' : '¡Registrado correctamente!'}
            </h2>

            {/* Material badge */}
            <div style={{ margin: '.75rem 0' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '.4rem',
                padding: '.35rem 1rem', borderRadius: 999,
                background: cont.color + '18',
                color: cont.color,
                border: `1px solid ${cont.color}40`,
                fontWeight: 600, fontSize: '.875rem',
              }}>
                {cat}
                <span style={{ fontSize: '.72rem', opacity: .7 }}>
                  {(result.clasificacion.confianza * 100).toFixed(0)}%
                </span>
              </span>
            </div>
            <div style={{ fontSize: '.75rem', color: 'var(--text-3)', marginBottom: '.75rem' }}>{cont.nombre}</div>

            <ProgressBar count={count} />
            <p style={{ fontSize: '.8rem', color: 'var(--text-3)', marginTop: '.4rem' }}>
              {ganadoCupon
                ? '¡Ve a Mis Cupones para elegir tu beneficio!'
                : `${faltan} basura${faltan !== 1 ? 's' : ''} más para ganar un cupón`}
            </p>

            <button className="btn btn-primary btn-full" style={{ marginTop: '1.25rem' }} onClick={reset}>
              Registrar otra basura
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── ERROR ────────────────────────────────────────────────────────────────────
  return (
    <div className="card">
      <div className="card-body" style={{ textAlign: 'center' }}>
        <p style={{ color: 'var(--red)', marginBottom: '1rem' }}>Error: {error}</p>
        <button className="btn btn-primary" onClick={reset}>Reintentar</button>
      </div>
    </div>
  );
}

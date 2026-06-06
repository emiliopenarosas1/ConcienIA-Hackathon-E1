import { useState, useRef } from 'react';
import { api } from '../../services/api.js';

const TIPO_DESC = {
  PET:          'Botellas y envases de plástico — contenedor azul',
  Organico:     'Restos de comida y materiales compostables — contenedor verde',
  Aluminio:     'Latas y envases de aluminio — contenedor amarillo',
  Vidrio:       'Botellas y envases de vidrio — contenedor blanco',
  Carton:       'Cajas, cartón y papel — contenedor gris',
  NoReciclable: 'Residuos mezclados sin valor de reciclaje — contenedor negro',
};

const RECICLABLE = ['PET', 'Organico', 'Aluminio', 'Vidrio', 'Carton'];

export default function MovilIdentificar() {
  const [preview,   setPreview]   = useState(null);
  const [resultado, setResultado] = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [camVivo,   setCamVivo]   = useState(false);

  const inputRef  = useRef();
  const videoRef  = useRef();
  const streamRef = useRef(null);

  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target.result;
      setPreview(base64);
      setResultado(null);
      setError('');
      setLoading(true);
      try {
        const res = await api.identificar(base64);
        setResultado(res);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const abrirCamara = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      setCamVivo(true);
      // Assign after React re-render mounts the <video>
      requestAnimationFrame(() => {
        if (videoRef.current) videoRef.current.srcObject = stream;
      });
    } catch {
      // getUserMedia not available or denied — fall back to native file picker
      inputRef.current?.click();
    }
  };

  const capturar = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width  = video.videoWidth  || 1280;
    canvas.height = video.videoHeight || 720;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob(blob => {
      cerrarCamara();
      handleFile(new File([blob], 'captura.jpg', { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.92);
  };

  const cerrarCamara = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCamVivo(false);
  };

  const reset = () => {
    cerrarCamara();
    setPreview(null);
    setResultado(null);
    setError('');
  };

  /* ── Camera live view ──────────────────────────────────────────────────────── */
  if (camVivo) {
    return (
      <div>
        <h2 style={{ marginBottom: '.75rem' }}>Tomar foto</h2>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: '100%',
            borderRadius: 'var(--radius-md)',
            background: '#000',
            maxHeight: 360,
            objectFit: 'cover',
            display: 'block',
          }}
        />
        <div style={{ display: 'flex', gap: '.75rem', marginTop: '1rem' }}>
          <button className="btn btn-secondary" style={{ flexShrink: 0 }} onClick={cerrarCamara}>
            Cancelar
          </button>
          <button className="btn btn-primary btn-full" onClick={capturar}>
            📷 Capturar
          </button>
        </div>
      </div>
    );
  }

  /* ── Upload / result view ──────────────────────────────────────────────────── */
  return (
    <div>
      <h2 style={{ marginBottom: '.3rem' }}>Identificar residuo</h2>
      <p style={{ marginBottom: '1.25rem' }}>Fotografía el residuo para clasificarlo automáticamente</p>

      {!preview ? (
        <>
          {/* Hidden input as fallback when getUserMedia is unavailable */}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={e => handleFile(e.target.files[0])}
          />
          <div className="upload-zone" role="button" tabIndex={0}
            onClick={abrirCamara}
            onKeyDown={e => e.key === 'Enter' && abrirCamara()}>
            <div className="upload-icon">📷</div>
            <div className="upload-text">Toca para abrir la cámara</div>
          </div>
          {error && <div className="alert alert-error" style={{ marginTop: '1rem' }}>{error}</div>}
        </>
      ) : (
        <div>
          <img
            src={preview}
            alt="Imagen capturada"
            style={{ width: '100%', maxHeight: 260, objectFit: 'cover', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginBottom: '1rem' }}
          />

          {loading && (
            <div className="spinner-page">
              <div className="spinner" />
              Analizando imagen...
            </div>
          )}

          {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

          {resultado && !loading && (() => {
            const cat = resultado.categoria || resultado.tipo_residuo;
            const esReciclable = RECICLABLE.includes(cat);
            const cont = resultado.contenedor;
            return (
              <div className="result-card">
                <div className="result-card-top">
                  <div className="result-card-tipo">{cat}</div>
                  <div className="result-card-conf">
                    Confianza: {(resultado.confianza * 100).toFixed(0)}%
                    &nbsp;·&nbsp;
                    <span style={{ color: esReciclable ? 'var(--green-600)' : 'var(--red)' }}>
                      {esReciclable ? 'Reciclable' : 'No reciclable'}
                    </span>
                  </div>
                </div>
                <div className="result-card-body">
                  {TIPO_DESC[cat] && (
                    <div className="result-detail-row">
                      <span className="text-muted">Descripción</span>
                      <span>{TIPO_DESC[cat]}</span>
                    </div>
                  )}
                  {cont && (
                    <div className="result-detail-row">
                      <span className="text-muted">Contenedor</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                        <span style={{ width: 12, height: 12, borderRadius: '50%', background: cont.hex, display: 'inline-block', border: '1px solid var(--border)' }} />
                        {cont.color.charAt(0).toUpperCase() + cont.color.slice(1)}
                      </span>
                    </div>
                  )}
                  {resultado.tiempo_ms && (
                    <div className="result-detail-row">
                      <span className="text-muted">Tiempo</span>
                      <span>{resultado.tiempo_ms} ms</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          <button className="btn btn-secondary btn-full" style={{ marginTop: '1rem' }} onClick={reset}>
            Analizar otra imagen
          </button>
        </div>
      )}
    </div>
  );
}

import { useState, useRef, useCallback } from 'react';
import GlassCard from './GlassCard.jsx';
import { api } from '../services/api.js';

const CONTENEDOR_COLOR = {
  azul:     { bg: 'hsla(210,80%,40%,0.25)', border: 'hsl(210,80%,58%)', text: 'hsl(210,80%,75%)' },
  verde:    { bg: 'hsla(128,55%,30%,0.25)', border: 'hsl(128,55%,45%)', text: 'hsl(128,55%,65%)' },
  amarillo: { bg: 'hsla(44,90%,40%,0.25)',  border: 'hsl(44,90%,55%)',  text: 'hsl(44,90%,70%)' },
  blanco:   { bg: 'hsla(0,0%,60%,0.15)',    border: 'hsl(0,0%,70%)',    text: 'hsl(0,0%,85%)' },
  gris:     { bg: 'hsla(0,0%,40%,0.25)',    border: 'hsl(0,0%,55%)',    text: 'hsl(0,0%,70%)' },
  negro:    { bg: 'hsla(0,0%,10%,0.5)',     border: 'hsl(0,0%,30%)',    text: 'hsl(0,0%,60%)' },
};

export default function Clasificador() {
  const [preview, setPreview] = useState(null);
  const [base64, setBase64] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [webcamActive, setWebcamActive] = useState(false);

  const inputRef = useRef();
  const videoRef = useRef();
  const canvasRef = useRef();
  const streamRef = useRef();

  const processFile = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target.result);
      setBase64(e.target.result);
      setResult(null); setError(null);
    };
    reader.readAsDataURL(file);
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault(); setDragOver(false);
    processFile(e.dataTransfer.files[0]);
  }, [processFile]);

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      setWebcamActive(true);
    } catch {
      setError('No se pudo acceder a la cámara. Verifica los permisos.');
    }
  };

  const captureWebcam = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setPreview(dataUrl); setBase64(dataUrl);
    setResult(null); setError(null);
    streamRef.current?.getTracks().forEach(t => t.stop());
    setWebcamActive(false);
  };

  const classify = async () => {
    if (!base64) return;
    setLoading(true); setError(null);
    try {
      const res = await api.clasificar(base64);
      setResult(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const cont = result?.contenedor;
  const colores = cont ? CONTENEDOR_COLOR[cont.color] : null;

  return (
    <div className="page-enter">
      <h2 className="section-title">Clasificador de Residuos con IA</h2>
      <p style={{ color: 'var(--text-3)', fontSize: '0.82rem', marginBottom: '1.5rem', marginTop: '-0.75rem' }}>
        Sube o captura una foto de un residuo y nuestra IA local (MobileNetV2) lo clasificará según SEMARNAT.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: result ? '1fr 1fr' : '1fr', gap: '1.5rem', maxWidth: result ? '100%' : '580px' }}>
        {/* Upload / Webcam */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {webcamActive ? (
            <GlassCard style={{ padding: '1rem', position: 'relative' }}>
              <div className="scanner-wrapper">
                <div className="scanner-line" />
                <div className="scanner-corner tl" /><div className="scanner-corner tr" />
                <div className="scanner-corner bl" /><div className="scanner-corner br" />
                <video ref={videoRef} autoPlay playsInline style={{ width: '100%', borderRadius: 'var(--radius-sm)', display: 'block' }} />
              </div>
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '0.75rem' }} onClick={captureWebcam}>
                📸 Capturar
              </button>
            </GlassCard>
          ) : (
            <div
              className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current.click()}
            >
              <canvas ref={canvasRef} style={{ display: 'none' }} />
              <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => processFile(e.target.files[0])} />

              {preview ? (
                loading ? (
                  <div className="scanner-wrapper" style={{ lineHeight: 0 }}>
                    <div className="scanner-line" />
                    <div className="scanner-corner tl" /><div className="scanner-corner tr" />
                    <div className="scanner-corner bl" /><div className="scanner-corner br" />
                    <img src={preview} alt="Residuo" style={{ width: '100%', maxHeight: '280px', objectFit: 'contain', borderRadius: 'var(--radius-sm)' }} />
                  </div>
                ) : (
                  <img src={preview} alt="Residuo" style={{ width: '100%', maxHeight: '280px', objectFit: 'contain', borderRadius: 'var(--radius-sm)' }} />
                )
              ) : (
                <>
                  <div style={{ fontSize: '3rem', marginBottom: '0.75rem', opacity: 0.5 }}>🗑</div>
                  <div style={{ fontWeight: 600, color: 'var(--text-1)', marginBottom: '0.3rem' }}>Arrastra una imagen</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>o haz clic para seleccionar</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginTop: '0.5rem' }}>JPG, PNG, WEBP</div>
                </>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center', fontSize: '0.82rem' }} onClick={startWebcam} disabled={webcamActive}>
              📷 Usar Cámara
            </button>
            <button
              className="btn btn-primary"
              style={{ flex: 1, justifyContent: 'center' }}
              onClick={classify}
              disabled={!base64 || loading}
            >
              {loading ? <><span className="spinner" /> Clasificando...</> : '🔍 Clasificar'}
            </button>
          </div>

          {error && (
            <div className="glass-flat" style={{ padding: '0.85rem', color: 'hsl(0,70%,65%)', fontSize: '0.82rem', borderLeft: '3px solid hsl(0,70%,50%)' }}>
              ⚠ {error}
            </div>
          )}
        </div>

        {/* Result */}
        {result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} className="result-reveal">
            <GlassCard accent style={{ padding: '1.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>
                Categoría detectada
              </div>
              <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--accent-glow)', marginBottom: '0.25rem' }}>
                {result.categoria}
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-2)', marginBottom: '1rem' }}>
                Confianza: <strong style={{ color: result.confianza > 0.8 ? 'hsl(128,55%,55%)' : 'hsl(44,90%,60%)' }}>{(result.confianza * 100).toFixed(1)}%</strong>
                {result.tiempo_ms && <span style={{ color: 'var(--text-3)', marginLeft: '0.5rem' }}>· {result.tiempo_ms}ms</span>}
              </div>
              <div className="progress-bar" style={{ marginBottom: '1rem' }}>
                <div className="progress-fill" style={{ width: `${result.confianza * 100}%`, background: result.confianza > 0.8 ? 'var(--c-organico)' : 'var(--c-aluminio)' }} />
              </div>
            </GlassCard>

            {cont && colores && (
              <div style={{ padding: '1.25rem', borderRadius: 'var(--radius-md)', background: colores.bg, border: `1px solid ${colores.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.6rem' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: colores.border, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 700, color: colores.text, fontSize: '0.9rem' }}>
                      Contenedor {cont.color.toUpperCase()}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>{cont.norma}</div>
                  </div>
                </div>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-2)' }}>
                  Deposita este residuo en el contenedor de color <strong style={{ color: colores.text }}>{cont.color}</strong> según la norma {cont.norma}.
                </div>
              </div>
            )}

            <GlassCard style={{ padding: '1.25rem' }}>
              <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-2)', marginBottom: '0.75rem' }}>Distribución de probabilidades</div>
              {Object.entries(result.distribucion)
                .sort(([, a], [, b]) => b - a)
                .map(([cat, prob]) => (
                  <div key={cat} style={{ marginBottom: '0.45rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', marginBottom: '0.2rem' }}>
                      <span style={{ color: cat === result.categoria ? 'var(--accent-glow)' : 'var(--text-2)', fontWeight: cat === result.categoria ? 600 : 400 }}>{cat}</span>
                      <span style={{ color: 'var(--text-3)' }}>{(prob * 100).toFixed(1)}%</span>
                    </div>
                    <div className="progress-bar" style={{ height: 5 }}>
                      <div className="progress-fill" style={{ width: `${prob * 100}%`, background: cat === result.categoria ? 'var(--accent)' : 'var(--border-hi)' }} />
                    </div>
                  </div>
                ))}
            </GlassCard>
          </div>
        )}
      </div>
    </div>
  );
}

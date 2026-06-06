/**
 * ClasificadorResiduos — inferencia con MLP pura en JavaScript
 * Jerarquía de carga:
 *   1. MLP entrenado (mlp_model.json) — modelo custom sin dependencias nativas
 *   2. Fallback histograma de color — heurística simple si el modelo no existe
 *
 * Imágenes procesadas en RAM únicamente (LFPDPPP — no persisten en disco).
 */

const Jimp = require('jimp');
const fs   = require('fs');
const path = require('path');

const MODEL_PATH = path.join(__dirname, '../models/clasificador/mlp_model.json');
const IMG_SIZE   = 64;  // debe coincidir con train_clasificador.js
// INPUT_SIZE = 40: 3 medias + 2 HSV + 8×4 histogramas + 3 diffs canal

const CATEGORIAS = ['PET', 'Organico', 'Aluminio', 'Vidrio', 'Carton', 'NoReciclable'];

const CONTENEDOR = {
  PET:          { color: 'azul',     hex: '#2563EB', norma: 'NOM-161-SEMARNAT-2011' },
  Organico:     { color: 'verde',    hex: '#16A34A', norma: 'Compostaje / NOM-083' },
  Aluminio:     { color: 'amarillo', hex: '#CA8A04', norma: 'NOM-161-SEMARNAT-2011' },
  Vidrio:       { color: 'blanco',   hex: '#94A3B8', norma: 'NOM-161-SEMARNAT-2011' },
  Carton:       { color: 'gris',     hex: '#6B7280', norma: 'NOM-161-SEMARNAT-2011' },
  NoReciclable: { color: 'negro',    hex: '#1F2937', norma: 'Disposición final NOM-083' },
};

// ── MLP inference (espejo exacto de train_clasificador.js) ────────────────────
function matVec(W, x) {
  return W.map(row => row.reduce((s, w, j) => s + w * x[j], 0));
}
function relu(z)    { return z.map(v => v > 0 ? v : 0); }
function softmax(z) {
  const mx = Math.max(...z);
  const exp = z.map(v => Math.exp(v - mx));
  const s = exp.reduce((a, b) => a + b, 0);
  return exp.map(v => v / s);
}

function mlpPredict(weights, x) {
  const z1 = matVec(weights.W1, x).map((v, i) => v + weights.b1[i]);
  const a1 = relu(z1);
  const z2 = matVec(weights.W2, a1).map((v, i) => v + weights.b2[i]);
  const a2 = relu(z2);
  const z3 = matVec(weights.W3, a2).map((v, i) => v + weights.b3[i]);
  return softmax(z3);
}

// ── Feature extraction (espejo de train_clasificador.js) ──────────────────────
function extractFeatures(pixels) {
  const n = pixels.length;
  let rS = 0, gS = 0, bS = 0, satS = 0, valS = 0;
  const BINS = 8;
  const rH = new Array(BINS).fill(0);
  const gH = new Array(BINS).fill(0);
  const bH = new Array(BINS).fill(0);
  const hH = new Array(BINS).fill(0);

  for (const { r, g, b } of pixels) {
    rS += r; gS += g; bS += b;
    rH[Math.min(BINS-1, (r / 256 * BINS) | 0)]++;
    gH[Math.min(BINS-1, (g / 256 * BINS) | 0)]++;
    bH[Math.min(BINS-1, (b / 256 * BINS) | 0)]++;

    const rv = r/255, gv = g/255, bv = b/255;
    const mx = Math.max(rv, gv, bv), mn = Math.min(rv, gv, bv);
    const diff = mx - mn;
    satS += mx > 0 ? diff / mx : 0;
    valS += mx;
    if (diff > 0) {
      let h = mx === rv ? (gv-bv)/diff % 6
            : mx === gv ? (bv-rv)/diff + 2
            :             (rv-gv)/diff + 4;
      if (h < 0) h += 6;
      hH[Math.min(BINS-1, (h/6 * BINS) | 0)]++;
    }
  }

  const nm = 1 / n;
  const rM = rS/n/255, gM = gS/n/255, bM = bS/n/255;
  const rg = (rM - gM + 1) / 2;
  const rb = (rM - bM + 1) / 2;
  const gb = (gM - bM + 1) / 2;
  return [
    rM, gM, bM, satS*nm, valS*nm,
    ...rH.map(v => v*nm), ...gH.map(v => v*nm),
    ...bH.map(v => v*nm), ...hH.map(v => v*nm),
    rg, rb, gb,
  ];
}

// ── Fallback heurístico (sin modelo) ─────────────────────────────────────────
function heuristicClassify(pixels) {
  const feats = extractFeatures(pixels);
  const [rMean, gMean, bMean, sat, val] = feats;

  const scores = { PET: 0, Organico: 0, Aluminio: 0, Vidrio: 0, Carton: 0, NoReciclable: 0 };

  // Reglas basadas en distribución empírica de paletas
  scores.PET          += bMean > rMean * 1.15 && bMean > gMean * 1.05 ? 3 : 0.5;
  scores.Organico     += gMean > rMean * 1.1  && gMean > bMean * 1.1  && val < 0.75 ? 3 : (gMean > rMean ? 0.8 : 0);
  scores.Aluminio     += sat < 0.1 && val > 0.55 && val < 0.90 ? 3 : (sat < 0.2 ? 1 : 0);
  scores.Vidrio       += val > 0.85 ? 2.5 : (val > 0.72 && sat < 0.2 ? 1.5 : 0);
  scores.Carton       += rMean > 0.55 && gMean > 0.4 && gMean < rMean && bMean < gMean ? 3 : (rMean > gMean && rMean > bMean && val < 0.75 ? 1 : 0);
  scores.NoReciclable += val < 0.4 ? 3 : 0.3;

  const total = Object.values(scores).reduce((s, v) => s + v, 0);
  const dist  = {};
  CATEGORIAS.forEach(c => { dist[c] = scores[c] / total; });
  const cat = Object.entries(dist).sort(([,a],[,b]) => b-a)[0][0];
  return { categoria: cat, confianza: dist[cat], distribucion: dist, modo: 'heuristico' };
}

// ── Clase principal ───────────────────────────────────────────────────────────
class ClasificadorService {
  constructor() {
    this.weights = null;
    this.categories = CATEGORIAS;
    this._loadModel();
  }

  _loadModel() {
    if (!fs.existsSync(MODEL_PATH)) {
      console.log('[ClasificadorService] Modelo MLP no encontrado — usando heurístico.');
      console.log('[ClasificadorService] Entrena con: node ai/training/train_clasificador.js');
      return;
    }
    try {
      const data = JSON.parse(fs.readFileSync(MODEL_PATH, 'utf8'));
      this.weights   = data;
      this.categories = data.categorias || CATEGORIAS;
      console.log(`[ClasificadorService] Modelo MLP cargado (acc=${data.accuracy}%, fuente=${data.dataSource})`);
    } catch (e) {
      console.warn('[ClasificadorService] Error al cargar modelo:', e.message);
    }
  }

  async _getPixels(base64) {
    const b64 = base64.replace(/^data:image\/\w+;base64,/, '');
    const buf = Buffer.from(b64, 'base64');
    const img = await Jimp.read(buf);
    img.resize(IMG_SIZE, IMG_SIZE);
    const pixels = [];
    img.scan(0, 0, IMG_SIZE, IMG_SIZE, function(x, y, off) {
      pixels.push({ r: this.bitmap.data[off], g: this.bitmap.data[off+1], b: this.bitmap.data[off+2] });
    });
    return pixels;
  }

  async classify(base64) {
    const pixels = await this._getPixels(base64);
    const features = extractFeatures(pixels);

    let result;
    if (this.weights) {
      const probs = mlpPredict(this.weights, features);
      const maxIdx = probs.indexOf(Math.max(...probs));
      const distribucion = {};
      this.categories.forEach((c, i) => { distribucion[c] = probs[i]; });
      result = {
        categoria:   this.categories[maxIdx],
        confianza:   probs[maxIdx],
        distribucion,
        modo: 'mlp',
      };
    } else {
      result = heuristicClassify(pixels);
    }

    return { ...result, contenedor: CONTENEDOR[result.categoria] };
  }
}

module.exports = new ClasificadorService();

/**
 * IdentificarService — identifica el tipo de residuo a partir de una imagen.
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
const IMG_SIZE   = 64;

const CATEGORIAS = ['PET', 'Organico', 'Aluminio', 'Vidrio', 'Carton', 'NoReciclable'];

const CONTENEDOR = {
  PET:          { color: 'azul',     hex: '#2563EB', norma: 'NOM-161-SEMARNAT-2011' },
  Organico:     { color: 'verde',    hex: '#16A34A', norma: 'Compostaje / NOM-083' },
  Aluminio:     { color: 'amarillo', hex: '#CA8A04', norma: 'NOM-161-SEMARNAT-2011' },
  Vidrio:       { color: 'blanco',   hex: '#94A3B8', norma: 'NOM-161-SEMARNAT-2011' },
  Carton:       { color: 'gris',     hex: '#6B7280', norma: 'NOM-161-SEMARNAT-2011' },
  NoReciclable: { color: 'negro',    hex: '#1F2937', norma: 'Disposición final NOM-083' },
};

function matVec(W, x) {
  return W.map(row => row.reduce((s, w, j) => s + w * x[j], 0));
}
function relu(z)    { return z.map(v => v > 0 ? v : 0); }
function softmax(z) {
  const mx  = Math.max(...z);
  const exp = z.map(v => Math.exp(v - mx));
  const s   = exp.reduce((a, b) => a + b, 0);
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

function computeVariance(pixels, val) {
  // Desviación estándar del brillo — alta = textura (papel, cartón, orgánico)
  // baja = superficie lisa (vidrio, aluminio, PET liso)
  let varSum = 0;
  for (const { r, g, b } of pixels) {
    const brightness = (r + g + b) / 3 / 255;
    varSum += (brightness - val) ** 2;
  }
  return Math.sqrt(varSum / pixels.length);
}

function heuristicClassify(pixels) {
  const feats = extractFeatures(pixels);
  const [rMean, gMean, bMean, sat, val] = feats;
  const variance = computeVariance(pixels, val);

  // neutral: canales RGB cercanos entre sí (gris, blanco, negro)
  const neutral = Math.abs(rMean - gMean) < 0.09 && Math.abs(gMean - bMean) < 0.09;
  // warm: rojo/marrón domina (cartón, orgánico cálido)
  const warm = rMean > bMean + 0.04 && rMean >= gMean - 0.03;

  const scores = { PET: 0, Organico: 0, Aluminio: 0, Vidrio: 0, Carton: 0, NoReciclable: 0 };

  // PET: azul claro dominante (botella, envase plástico azul)
  scores.PET += bMean > rMean * 1.12 && bMean > gMean * 1.05 ? 3.5
              : bMean > rMean && bMean > gMean ? 1.2 : 0.3;

  // Orgánico: verde domina, brillo bajo-medio, suele tener varianza media-alta
  scores.Organico += gMean > rMean * 1.08 && gMean > bMean * 1.08 && val < 0.80 ? 3.5
                   : gMean > rMean * 1.04 && gMean > bMean * 1.04 ? 1.5
                   : (gMean > rMean && val < 0.55) ? 0.8 : 0.2;

  // Aluminio: gris neutro liso — sat baja, brillo medio, SIN textura (variance baja)
  scores.Aluminio += sat < 0.10 && val > 0.50 && val < 0.88 && neutral && variance < 0.16 ? 3.5
                   : sat < 0.14 && neutral && variance < 0.12 ? 2
                   : sat < 0.18 && neutral ? 0.8 : 0.2;

  // Vidrio: muy brillante Y liso (variance baja), o vidrio ámbar (r >> b)
  scores.Vidrio += val > 0.85 && variance < 0.14 ? 3.5
                 : rMean > 0.62 && gMean > 0.28 && bMean < 0.22 ? 2.5  // ámbar
                 : val > 0.80 && variance < 0.10 ? 2 : 0.1;

  // Cartón/papel: tonos cálidos-marrones clásicos, O blanco/crema CON textura (text, rayas, bordes)
  // La varianza alta distingue papel de vidrio/aluminio aunque ambos sean claros
  scores.Carton += rMean > 0.50 && gMean > 0.38 && gMean < rMean && bMean < gMean && val < 0.92 ? 3.5
                 : val > 0.55 && variance > 0.09 && sat < 0.30 ? 3.0   // blanco/crema con textura
                 : warm && val > 0.40 && val < 0.88 ? 1.5
                 : variance > 0.10 && val > 0.5 ? 1.0 : 0.3;

  // NoReciclable: oscuro o saturado-mezclado, brillo bajo
  scores.NoReciclable += val < 0.32 ? 3.5
                       : val < 0.48 && !neutral ? 1.5
                       : val < 0.55 && sat > 0.25 ? 1.0 : 0.2;

  const total = Object.values(scores).reduce((s, v) => s + v, 0);
  const dist  = {};
  CATEGORIAS.forEach(c => { dist[c] = scores[c] / total; });
  const cat = Object.entries(dist).sort(([,a],[,b]) => b - a)[0][0];
  return { categoria: cat, confianza: dist[cat], distribucion: dist, modo: 'heuristico' };
}

class IdentificarService {
  constructor() {
    this.weights    = null;
    this.categories = CATEGORIAS;
    this._loadModel();
  }

  _loadModel() {
    if (!fs.existsSync(MODEL_PATH)) {
      console.log('[IdentificarService] Modelo MLP no encontrado — usando heurístico mejorado.');
      return;
    }
    try {
      const data = JSON.parse(fs.readFileSync(MODEL_PATH, 'utf8'));
      if (data.dataSource === 'synthetic') {
        console.log('[IdentificarService] Modelo sintético detectado — ignorado. Usar heurístico para fotos reales es más preciso.');
        console.log('[IdentificarService] Entrena con imágenes reales Kaggle para activar MLP: node ai/training/train_clasificador.js');
        return;
      }
      this.weights    = data;
      this.categories = data.categorias || CATEGORIAS;
      console.log(`[IdentificarService] Modelo MLP cargado (acc=${data.accuracy}%, fuente=${data.dataSource})`);
    } catch (e) {
      console.warn('[IdentificarService] Error al cargar modelo:', e.message);
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
    const pixels   = await this._getPixels(base64);
    const features = extractFeatures(pixels);

    let result;
    if (this.weights) {
      const probs  = mlpPredict(this.weights, features);
      const maxIdx = probs.indexOf(Math.max(...probs));
      const distribucion = {};
      this.categories.forEach((c, i) => { distribucion[c] = probs[i]; });
      result = {
        categoria:    this.categories[maxIdx],
        confianza:    probs[maxIdx],
        distribucion,
        modo: 'mlp',
      };
    } else {
      result = heuristicClassify(pixels);
    }

    return { ...result, contenedor: CONTENEDOR[result.categoria] };
  }
}

module.exports = new IdentificarService();

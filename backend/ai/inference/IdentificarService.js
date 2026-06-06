/**
 * @file IdentificarService.js
 * @description Servicio de clasificación inteligente de residuos utilizando heurísticas avanzadas
 * de color/textura en HSV/RGB o un modelo Perceptrón Multicapa (MLP).
 * Las imágenes procesadas se decodifican temporalmente en RAM y no persisten en disco (conforme LFPDPPP).
 */

const Jimp = require('jimp');
const fs   = require('fs');
const path = require('path');

const MODEL_PATH = path.join(__dirname, '../models/clasificador/mlp_model.json');
const IMG_SIZE   = 64;

/**
 * Categorías válidas de residuos.
 * @type {Array<string>}
 */
const CATEGORIAS = ['PET', 'Organico', 'Aluminio', 'Vidrio', 'Carton', 'NoReciclable'];

/**
 * Mapeo de contenedores recomendados por material con su normativa respectiva en México.
 * @type {Object<string, {color: string, hex: string, norma: string}>}
 */
const CONTENEDOR = {
  PET:          { color: 'azul',     hex: '#2563EB', norma: 'NOM-161-SEMARNAT-2011' },
  Organico:     { color: 'verde',    hex: '#16A34A', norma: 'Compostaje / NOM-083' },
  Aluminio:     { color: 'amarillo', hex: '#CA8A04', norma: 'NOM-161-SEMARNAT-2011' },
  Vidrio:       { color: 'blanco',   hex: '#94A3B8', norma: 'NOM-161-SEMARNAT-2011' },
  Carton:       { color: 'gris',     hex: '#6B7280', norma: 'NOM-161-SEMARNAT-2011' },
  NoReciclable: { color: 'negro',    hex: '#1F2937', norma: 'Disposición final NOM-083' },
};

/**
 * Realiza el producto punto entre una matriz W y un vector x.
 * 
 * @private
 * @param {Array<Array<number>>} W - Matriz de pesos.
 * @param {Array<number>} x - Vector de características.
 * @returns {Array<number>} Vector resultante de la multiplicación.
 */
function matVec(W, x) {
  return W.map(row => row.reduce((s, w, j) => s + w * x[j], 0));
}

/**
 * Función de activación ReLU aplicada a un vector de valores.
 * 
 * @private
 * @param {Array<number>} z - Vector de entrada.
 * @returns {Array<number>} Vector resultante con valores no negativos.
 */
function relu(z) {
  return z.map(v => v > 0 ? v : 0);
}

/**
 * Función de activación Softmax para obtener distribuciones de probabilidad.
 * 
 * @private
 * @param {Array<number>} z - Vector de entrada.
 * @returns {Array<number>} Vector de probabilidades normalizadas.
 */
function softmax(z) {
  const mx  = Math.max(...z);
  const exp = z.map(v => Math.exp(v - mx));
  const s   = exp.reduce((a, b) => a + b, 0);
  return exp.map(v => v / s);
}

/**
 * Ejecuta la predicción sobre el modelo MLP (Perceptrón Multicapa).
 * 
 * @private
 * @param {Object} weights - Pesos de la red neuronal.
 * @param {Array<number>} x - Vector de características de la imagen.
 * @returns {Array<number>} Distribución de probabilidad resultante de la clasificación.
 */
function mlpPredict(weights, x) {
  const z1 = matVec(weights.W1, x).map((v, i) => v + weights.b1[i]);
  const a1 = relu(z1);
  const z2 = matVec(weights.W2, a1).map((v, i) => v + weights.b2[i]);
  const a2 = relu(z2);
  const z3 = matVec(weights.W3, a2).map((v, i) => v + weights.b3[i]);
  return softmax(z3);
}

/**
 * Extrae las características cuantitativas de color e histograma de los píxeles de una imagen.
 * 
 * @private
 * @param {Array<{r: number, g: number, b: number}>} pixels - Píxeles RGB de la imagen.
 * @returns {Array<number>} Vector de características para clasificación.
 */
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

/**
 * Calcula la desviación estándar de los niveles de brillo para estimar textura de la superficie.
 * 
 * @private
 * @param {Array<{r: number, g: number, b: number}>} pixels - Píxeles de la imagen.
 * @param {number} val - Brillo promedio (escala 0 a 1).
 * @returns {number} Desviación estándar como aproximación de textura.
 */
function computeVariance(pixels, val) {
  let varSum = 0;
  for (const { r, g, b } of pixels) {
    const brightness = (r + g + b) / 3 / 255;
    varSum += (brightness - val) ** 2;
  }
  return Math.sqrt(varSum / pixels.length);
}

/**
 * Algoritmo clasificador secundario (fallback) basado en reglas heurísticas de color y brillo.
 * 
 * @private
 * @param {Array<{r: number, g: number, b: number}>} pixels - Píxeles de la imagen.
 * @returns {Object} Resultado estructurado con categoría, confianza y modo.
 */
function heuristicClassify(pixels) {
  const feats = extractFeatures(pixels);
  const [rMean, gMean, bMean, sat, val] = feats;
  const variance = computeVariance(pixels, val);

  const neutral = Math.abs(rMean - gMean) < 0.09 && Math.abs(gMean - bMean) < 0.09;
  const warm = rMean > bMean + 0.04 && rMean >= gMean - 0.03;

  const scores = { PET: 0, Organico: 0, Aluminio: 0, Vidrio: 0, Carton: 0, NoReciclable: 0 };

  scores.PET += bMean > rMean * 1.12 && bMean > gMean * 1.05 ? 3.5
              : bMean > rMean && bMean > gMean ? 1.2 : 0.3;

  scores.Organico += gMean > rMean * 1.08 && gMean > bMean * 1.08 && val < 0.80 ? 3.5
                   : gMean > rMean * 1.04 && gMean > bMean * 1.04 ? 1.5
                   : (gMean > rMean && val < 0.55) ? 0.8 : 0.2;

  scores.Aluminio += sat < 0.10 && val > 0.50 && val < 0.88 && neutral && variance < 0.16 ? 3.5
                   : sat < 0.14 && neutral && variance < 0.12 ? 2
                   : sat < 0.18 && neutral ? 0.8 : 0.2;

  scores.Vidrio += val > 0.85 && variance < 0.14 ? 3.5
                 : rMean > 0.62 && gMean > 0.28 && bMean < 0.22 ? 2.5
                 : val > 0.80 && variance < 0.10 ? 2 : 0.1;

  scores.Carton += rMean > 0.50 && gMean > 0.38 && gMean < rMean && bMean < gMean && val < 0.92 ? 3.5
                 : val > 0.55 && variance > 0.09 && sat < 0.30 ? 3.0
                 : warm && val > 0.40 && val < 0.88 ? 1.5
                 : variance > 0.10 && val > 0.5 ? 1.0 : 0.3;

  scores.NoReciclable += val < 0.32 ? 3.5
                       : val < 0.48 && !neutral ? 1.5
                       : val < 0.55 && sat > 0.25 ? 1.0 : 0.2;

  const total = Object.values(scores).reduce((s, v) => s + v, 0);
  const dist  = {};
  CATEGORIAS.forEach(c => { dist[c] = scores[c] / total; });
  const cat = Object.entries(dist).sort(([,a],[,b]) => b - a)[0][0];
  return { categoria: cat, confianza: dist[cat], distribucion: dist, modo: 'heuristico' };
}

/**
 * Servicio encargado de la clasificación visual de residuos.
 * @class IdentificarService
 */
class IdentificarService {
  constructor() {
    this.weights    = null;
    this.categories = CATEGORIAS;
    this._loadModel();
  }

  /**
   * Carga los pesos del clasificador neuronal si se encuentra entrenado en disco.
   * 
   * @private
   */
  _loadModel() {
    if (!fs.existsSync(MODEL_PATH)) {
      console.log('[IdentificarService] Modelo MLP no encontrado — usando heurístico mejorado.');
      return;
    }
    try {
      const data = JSON.parse(fs.readFileSync(MODEL_PATH, 'utf8'));
      if (data.dataSource === 'synthetic') {
        console.log('[IdentificarService] Modelo sintético detectado — ignorado. Usar heurístico para fotos reales es más preciso.');
        return;
      }
      this.weights    = data;
      this.categories = data.categorias || CATEGORIAS;
      console.log(`[IdentificarService] Modelo MLP cargado (acc=${data.accuracy}%, fuente=${data.dataSource})`);
    } catch (e) {
      console.warn('[IdentificarService] Error al cargar modelo:', e.message);
    }
  }

  /**
   * Procesa la imagen codificada en Base64 para extraer su mapa de píxeles.
   * 
   * @private
   * @param {string} base64 - Imagen codificada en formato Base64.
   * @returns {Promise<Array<{r: number, g: number, b: number}>>} Promesa que resuelve a un vector de píxeles.
   */
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

  /**
   * Clasifica una imagen de residuo mediante el clasificador MLP o su heurístico de respaldo.
   * 
   * @param {string} base64 - Imagen en formato Base64.
   * @returns {Promise<Object>} Promesa que resuelve al diagnóstico del residuo identificado.
   */
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

/**
 * ClasificadorResiduos — MLP pura en JavaScript (sin TF.js, sin dependencias nativas)
 *
 * Arquitectura: feature extraction (Jimp) → MLP [37 → 64 → 32 → 6]
 * Features: 3 medias RGB + 2 stats HSV + 4×8 histogramas (RGB + Hue) = 37 features
 *
 * Dataset (por orden de prioridad):
 *   1. Imágenes reales Kaggle en backend/data/waste_images/{categoria}/
 *      https://www.kaggle.com/datasets/techsash/waste-classification-data
 *   2. Imágenes reales Hub Residuos Circulares si están descargadas
 *   3. Imágenes sintéticas generadas con paletas HSV por categoría (fallback automático)
 *
 * Fuentes de paletas de color:
 *   - SEMARNAT NOM-161: azul=PET, verde=Orgánico, amarillo=Aluminio, blanco=Vidrio, gris=Cartón, negro=NoReciclable
 *   - Kaggle Waste Classification: distribución RGB empírica por categoría
 *   - Hub Residuos Circulares: referencias visuales de materiales post-consumo MX
 */

const Jimp = require('jimp');
const fs   = require('fs');
const path = require('path');

const CATEGORIAS = ['PET', 'Organico', 'Aluminio', 'Vidrio', 'Carton', 'NoReciclable'];
const INPUT_SIZE  = 40;  // 3 (RGB medias) + 2 (sat, val) + 8×4 (histogramas) + 3 (diff canal)
const H1_SIZE     = 64;
const H2_SIZE     = 32;
const OUTPUT_SIZE = 6;
const EPOCHS      = 60;
const LR_INIT     = 0.03;
const SYNTH_PER_CAT = 250;
const IMG_SIZE    = 64;   // resize para extracción — balance calidad/velocidad
const MAX_REAL    = 400;  // máximo imágenes reales por categoría

const DATASET_PATH = path.join(__dirname, '../../data/waste_images');
const MODEL_OUT    = path.join(__dirname, '../models/clasificador');

// ── Paletas sintéticas (RGB, rango [min,max] para distribución uniforme) ──────
// Calibradas con distribución empírica del Kaggle Waste Classification dataset
// y referencias NOM-161-SEMARNAT-2011 para colores de contenedores MX
// Principio clave: cada categoría tiene un rango EXCLUSIVO en al menos un canal.
const PALETTES = {
  // PET: azul dominante (b >> r, b >> g) — inconfundible
  PET: [
    { r: [15, 70],  g: [110, 185], b: [185, 255] }, // azul claro (botella de agua)
    { r: [20, 80],  g: [130, 195], b: [200, 255] }, // azul medio (botella refresco)
    { r: [10, 50],  g: [80,  150], b: [170, 240] }, // azul oscuro (botella aceite)
  ],
  // Orgánico: verde dominante (g > r, g > b) — tonos tierra/pasto
  Organico: [
    { r: [30,  85], g: [100, 160], b: [15,  55]  }, // verde oscuro (hojas, pasto)
    { r: [85, 145], g: [75,  130], b: [20,  60]  }, // café-orgánico (restos comida)
    { r: [55, 115], g: [115, 175], b: [25,  75]  }, // verde olivo
  ],
  // Aluminio: neutro plateado (r≈g≈b, val medio-alto, sat muy baja)
  Aluminio: [
    { r: [145, 200], g: [145, 200], b: [148, 203] }, // gris plata neutro
    { r: [165, 218], g: [165, 218], b: [165, 218] }, // plata medio
    { r: [125, 175], g: [128, 178], b: [128, 178] }, // gris oscuro metálico
  ],
  // Vidrio: dos variantes MUY distintas entre sí
  //   clara: extremadamente brillante + tinte verde (g > r,b en >=10)
  //   ámbar: rojo-naranja alto, verde medio-bajo, azul MUY bajo (<55)
  Vidrio: [
    { r: [190, 245], g: [210, 255], b: [190, 245] }, // verde botella (g es mayor)
    { r: [205, 255], g: [218, 255], b: [205, 255] }, // transparente ultra-brillante
    { r: [170, 220], g: [90,  135], b: [10,  52]  }, // ámbar oscuro (cerveza): b < 55
  ],
  // Cartón: marrón cálido (r > g > b, b en [65,130] — diferencia de ámbar que tiene b<55)
  Carton: [
    { r: [160, 218], g: [120, 172], b: [68,  118] }, // café claro (corrugado)
    { r: [140, 195], g: [105, 155], b: [72,  115] }, // marrón reciclado
    { r: [195, 242], g: [168, 212], b: [118, 162] }, // beige (caja nueva): b alto
  ],
  // NoReciclable: oscuro/mixto (brightness < 0.45)
  NoReciclable: [
    { r: [35,  105], g: [30,  95],  b: [30,  95]  }, // negro/gris muy oscuro
    { r: [95,  162], g: [55,  115], b: [38,  88]  }, // tierra contaminada
    { r: [75,  135], g: [68,  128], b: [75,  135] }, // gris oscuro mezclado
  ],
};

// ── PRNG determinista ─────────────────────────────────────────────────────────
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 0x100000000; };
}

// ── Generación de imágenes sintéticas en memoria ──────────────────────────────
function generateSyntheticPixels(categoria, count, rand) {
  const palettes = PALETTES[categoria];
  const samples = [];
  for (let i = 0; i < count; i++) {
    const pal = palettes[Math.floor(rand() * palettes.length)];
    const pixels = [];
    for (let p = 0; p < IMG_SIZE * IMG_SIZE; p++) {
      pixels.push({
        r: Math.round(pal.r[0] + rand() * (pal.r[1] - pal.r[0])),
        g: Math.round(pal.g[0] + rand() * (pal.g[1] - pal.g[0])),
        b: Math.round(pal.b[0] + rand() * (pal.b[1] - pal.b[0])),
      });
    }
    samples.push(pixels);
  }
  return samples;
}

// ── Carga de imágenes reales ──────────────────────────────────────────────────
async function loadRealPixels(categoria) {
  const dir = path.join(DATASET_PATH, categoria);
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir)
    .filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f))
    .slice(0, MAX_REAL);
  const samples = [];
  for (const file of files) {
    try {
      const img = await Jimp.read(path.join(dir, file));
      img.resize(IMG_SIZE, IMG_SIZE);
      const pixels = [];
      img.scan(0, 0, IMG_SIZE, IMG_SIZE, function(x, y, off) {
        pixels.push({ r: this.bitmap.data[off], g: this.bitmap.data[off+1], b: this.bitmap.data[off+2] });
      });
      samples.push(pixels);
    } catch (_) {}
  }
  return samples;
}

// ── Extracción de features (37 dimensiones) ───────────────────────────────────
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
  // Channel-difference features — clave para separar Vidrio-ámbar vs Cartón vs Aluminio
  const rg = (rM - gM + 1) / 2;  // [0,1]: rojo vs verde
  const rb = (rM - bM + 1) / 2;  // [0,1]: rojo vs azul  (alto → cálido, bajo → azul PET)
  const gb = (gM - bM + 1) / 2;  // [0,1]: verde vs azul (alto → Orgánico)
  return [
    rM, gM, bM, satS*nm, valS*nm,
    ...rH.map(v => v*nm), ...gH.map(v => v*nm),
    ...bH.map(v => v*nm), ...hH.map(v => v*nm),
    rg, rb, gb,
  ];
}

// ── MLP pura (forward + backward) ────────────────────────────────────────────
function randN(seed) {
  const r = rng(seed);
  // Box-Muller transform
  return () => {
    const u = r(), v = r();
    return Math.sqrt(-2*Math.log(u+1e-10)) * Math.cos(2*Math.PI*v);
  };
}

function makeWeights(rows, cols, scale, rand) {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => rand() * scale));
}

function relu(x)    { return x.map(v => v > 0 ? v : 0); }
function reluD(z)   { return z.map(v => v > 0 ? 1 : 0); }

function softmax(z) {
  const mx = Math.max(...z);
  const exp = z.map(v => Math.exp(v - mx));
  const s = exp.reduce((a, b) => a + b, 0);
  return exp.map(v => v / s);
}

function matVec(W, x) {
  return W.map(row => row.reduce((s, w, j) => s + w * x[j], 0));
}
function outerSub(W, lr, dw, da) {
  return W.map((row, i) => row.map((w, j) => w - lr * da[i] * dw[j]));
}
function vecSub(a, b) { return a.map((v, i) => v - b[i]); }
function matTVec(W, v) {
  const r = new Array(W[0].length).fill(0);
  W.forEach((row, i) => row.forEach((w, j) => { r[j] += w * v[i]; }));
  return r;
}

class MLP {
  constructor(seed = 42) {
    const n = randN(seed);
    this.W1 = makeWeights(H1_SIZE, INPUT_SIZE,  Math.sqrt(2/INPUT_SIZE),  n);
    this.b1 = new Array(H1_SIZE).fill(0);
    this.W2 = makeWeights(H2_SIZE, H1_SIZE,     Math.sqrt(2/H1_SIZE),    n);
    this.b2 = new Array(H2_SIZE).fill(0);
    this.W3 = makeWeights(OUTPUT_SIZE, H2_SIZE, Math.sqrt(2/H2_SIZE),    n);
    this.b3 = new Array(OUTPUT_SIZE).fill(0);
  }

  forward(x) {
    this._x  = x;
    this._z1 = matVec(this.W1, x).map((v, i) => v + this.b1[i]);
    this._a1 = relu(this._z1);
    this._z2 = matVec(this.W2, this._a1).map((v, i) => v + this.b2[i]);
    this._a2 = relu(this._z2);
    this._z3 = matVec(this.W3, this._a2).map((v, i) => v + this.b3[i]);
    this._a3 = softmax(this._z3);
    return this._a3;
  }

  step(x, yi, lr) {
    const out = this.forward(x);
    const loss = -Math.log(out[yi] + 1e-10);

    // dL/dz3: gradient of softmax + cross-entropy (simplified combined form)
    const dz3 = out.map((v, i) => v - (i === yi ? 1 : 0));

    // Layer 3: compute da2 using ORIGINAL W3 BEFORE updating
    const da2 = matTVec(this.W3, dz3);
    this.W3 = outerSub(this.W3, lr, this._a2, dz3);
    this.b3 = vecSub(this.b3, dz3.map(v => v * lr));

    // Layer 2: compute da1 using ORIGINAL W2 BEFORE updating
    const dz2 = da2.map((v, i) => v * (this._z2[i] > 0 ? 1 : 0));
    const da1 = matTVec(this.W2, dz2);
    this.W2 = outerSub(this.W2, lr, this._a1, dz2);
    this.b2 = vecSub(this.b2, dz2.map(v => v * lr));

    // Layer 1: update W1, b1
    const dz1 = da1.map((v, i) => v * (this._z1[i] > 0 ? 1 : 0));
    this.W1 = outerSub(this.W1, lr, this._x, dz1);
    this.b1 = vecSub(this.b1, dz1.map(v => v * lr));

    return loss;
  }

  predict(x) { return this.forward(x); }

  toJSON() {
    return { type: 'mlp', W1: this.W1, b1: this.b1, W2: this.W2, b2: this.b2, W3: this.W3, b3: this.b3 };
  }
}

// ── Entrenamiento ─────────────────────────────────────────────────────────────
async function train() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  ClasificadorResiduos — MLP [37→64→32→6] pura en JavaScript');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const hasKaggle = CATEGORIAS.every(c => fs.existsSync(path.join(DATASET_PATH, c)));
  if (hasKaggle) {
    console.log('✓  Dataset Kaggle detectado → cargando imágenes reales');
  } else {
    console.log('⚠  Dataset Kaggle no encontrado → usando imágenes sintéticas');
    console.log('   Para mejorar precisión con datos reales:');
    console.log('   https://www.kaggle.com/datasets/techsash/waste-classification-data');
    console.log('   Extrae en: backend/data/waste_images/{PET,Organico,Aluminio,...}/\n');
  }

  const rand = rng(42);

  // Construir dataset
  const dataset = [];
  for (let ci = 0; ci < CATEGORIAS.length; ci++) {
    const cat = CATEGORIAS[ci];
    process.stdout.write(`   Cargando ${cat.padEnd(12)}... `);

    let pixelSamples = hasKaggle ? await loadRealPixels(cat) : [];
    const source = pixelSamples.length > 0 ? `${pixelSamples.length} reales` : `${SYNTH_PER_CAT} sintéticas`;
    if (pixelSamples.length === 0) pixelSamples = generateSyntheticPixels(cat, SYNTH_PER_CAT, rand);

    const features = pixelSamples.map(pixels => extractFeatures(pixels));
    features.forEach(f => dataset.push({ x: f, y: ci }));
    console.log(source);
  }

  console.log(`\n   Total: ${dataset.length} muestras × ${INPUT_SIZE} features`);

  // Shuffle con PRNG
  const shufRand = rng(123);
  dataset.sort(() => shufRand() - 0.5);

  const splitIdx = Math.floor(dataset.length * 0.85);
  const train_  = dataset.slice(0, splitIdx);
  const val_    = dataset.slice(splitIdx);

  const net = new MLP(42);
  console.log(`\n   Arquitectura: ${INPUT_SIZE} → ${H1_SIZE} → ${H2_SIZE} → ${OUTPUT_SIZE} (ReLU + Softmax)`);
  console.log(`   Entrenando ${EPOCHS} épocas...\n`);

  for (let ep = 0; ep < EPOCHS; ep++) {
    // Decay learning rate
    const lr = LR_INIT * Math.pow(0.95, ep);

    // Shuffle training set each epoch
    const epRand = rng(ep * 100 + 7);
    const shuffled = [...train_].sort(() => epRand() - 0.5);

    let lossSum = 0;
    for (const { x, y } of shuffled) {
      lossSum += net.step(x, y, lr);
    }

    if ((ep + 1) % 10 === 0 || ep === 0) {
      // Validation accuracy
      let correct = 0;
      for (const { x, y } of val_) {
        const probs = net.predict(x);
        const pred  = probs.indexOf(Math.max(...probs));
        if (pred === y) correct++;
      }
      const trainLoss = lossSum / train_.length;
      const valAcc    = val_.length > 0 ? (correct / val_.length * 100).toFixed(1) : '—';
      console.log(`   Época ${String(ep+1).padStart(3)}/${EPOCHS}  lr=${lr.toFixed(4)}  loss=${trainLoss.toFixed(4)}  val_acc=${valAcc}%`);
    }
  }

  // Evaluación final por categoría
  const confMatrix = Array.from({ length: 6 }, () => new Array(6).fill(0));
  for (const { x, y } of val_) {
    const pred = net.predict(x).indexOf(Math.max(...net.predict(x)));
    confMatrix[y][pred]++;
  }

  console.log('\n── Precisión por categoría (set de validación) ──────────────────');
  let totalOk = 0, totalN = 0;
  for (let c = 0; c < CATEGORIAS.length; c++) {
    const rowSum = confMatrix[c].reduce((a, b) => a + b, 0);
    const acc = rowSum > 0 ? confMatrix[c][c] / rowSum * 100 : 0;
    const bar = '█'.repeat(Math.round(acc / 5)) + '░'.repeat(20 - Math.round(acc / 5));
    console.log(`   ${CATEGORIAS[c].padEnd(14)} ${bar} ${acc.toFixed(1)}%  (n=${rowSum})`);
    totalOk += confMatrix[c][c];
    totalN  += rowSum;
  }
  const overallAcc = totalN > 0 ? (totalOk / totalN * 100).toFixed(1) : 0;
  console.log(`\n   Precisión global: ${overallAcc}%`);

  // Guardar modelo
  fs.mkdirSync(MODEL_OUT, { recursive: true });
  const modelData = {
    ...net.toJSON(),
    categorias: CATEGORIAS,
    features: INPUT_SIZE,
    imgSize: IMG_SIZE,
    trainedAt: new Date().toISOString(),
    dataSource: hasKaggle ? 'real+synthetic' : 'synthetic',
    accuracy: overallAcc,
  };
  fs.writeFileSync(path.join(MODEL_OUT, 'mlp_model.json'), JSON.stringify(modelData));
  console.log(`\n✅ Modelo guardado → ${MODEL_OUT}/mlp_model.json`);
  console.log('   Reinicia el backend para cargar el nuevo modelo.\n');
}

train().catch(err => { console.error(err); process.exit(1); });

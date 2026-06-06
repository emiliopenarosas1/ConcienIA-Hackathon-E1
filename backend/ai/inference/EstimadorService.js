const { RandomForestRegression } = require('ml-random-forest');
const fs = require('fs');
const path = require('path');

const MODEL_PATH = path.join(__dirname, '../models/estimador.json');
const TARGET_NAMES = ['PET', 'Organico', 'Aluminio', 'Vidrio', 'Carton'];

class EstimadorService {
  constructor() {
    this.models = null;
  }

  _load() {
    if (!fs.existsSync(MODEL_PATH)) {
      throw new Error('Modelo estimador no encontrado. Ejecuta: node ai/training/train_estimador.js');
    }
    const data = JSON.parse(fs.readFileSync(MODEL_PATH, 'utf8'));
    this.models = {};
    for (const name of TARGET_NAMES) {
      this.models[name] = RandomForestRegression.load(data[name]);
    }
    console.log('[EstimadorService] Modelo cargado.');
  }

  predict({ asistentes, duracion_horas, tipo }) {
    if (!this.models) this._load();

    const features = [
      asistentes / 100000,
      duracion_horas / 12,
      tipo === 'concierto'   ? 1 : 0,
      tipo === 'deportivo'   ? 1 : 0,
      tipo === 'festival'    ? 1 : 0,
      tipo === 'conferencia' ? 1 : 0,
    ];

    const residuos = {};
    for (const name of TARGET_NAMES) {
      residuos[`kg_${name}`] = Math.max(0, this.models[name].predict([features])[0]);
    }
    return residuos;
  }
}

module.exports = new EstimadorService();

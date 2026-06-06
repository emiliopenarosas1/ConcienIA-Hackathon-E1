const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { initDatabase } = require('./db/init');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'] }));
app.use(express.json({ limit: '15mb' }));

app.use('/api', require('./api/eventos'));
app.use('/api', require('./api/clasificacion'));
app.use('/api', require('./api/recomendaciones'));
app.use('/api', require('./api/privacidad'));

app.get('/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use((err, req, res, next) => {
  console.error('[ERROR]', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

async function main() {
  await initDatabase();

  app.listen(PORT, () => {
    console.log(`\n♻  DataCircular backend → http://localhost:${PORT}`);
    console.log('   POST /api/estimar  |  GET /api/eventos');
    console.log('   POST /api/clasificar  |  GET /api/recomendaciones/:id');
    console.log('   DELETE /api/eliminar-datos\n');
  });
}

main().catch(err => {
  console.error('[FATAL]', err.message);
  process.exit(1);
});

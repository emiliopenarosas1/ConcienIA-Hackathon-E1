const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { initDatabase } = require('./db/init');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173'] }));
app.use(express.json({ limit: '15mb' }));

app.use('/api', require('./api/auth'));        // POST /api/auth/login | GET /api/auth/me
app.use('/api', require('./api/intendentes')); // GET|POST /api/intendentes | PUT|PATCH /api/intendentes/:id
app.use('/api', require('./api/eventos'));     // POST /api/estimar | GET /api/eventos
app.use('/api', require('./api/limpieza'));    // POST /api/limpieza/registro | POST /api/limpieza/identificar | GET /api/limpieza/:evento_id
app.use('/api', require('./api/conteo'));      // POST /api/contar/:id | GET /api/contar/:id
app.use('/api', require('./api/dashboard'));   // GET /api/dashboard/historial | GET /api/dashboard/zonas/:id | GET /api/dashboard/:id
app.use('/api', require('./api/privacidad'));  // DELETE /api/eliminar-datos | GET /api/aviso
app.use('/api', require('./api/chat'));        // POST /api/chat
app.use('/api', require('./api/invitado'));    // POST /api/invitado/clasificar | GET /api/invitado/sesion/:id | POST /api/invitado/canjear | GET /api/cupones
app.use('/api', require('./api/cupones'));     // GET|POST /api/admin/cupones | PUT|PATCH /api/admin/cupones/:id

app.get('/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use((err, req, res, next) => {
  console.error('[ERROR]', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

async function main() {
  await initDatabase();

  app.listen(PORT, () => {
    console.log(`\n♻  ConciencIA backend → http://localhost:${PORT}`);
    console.log('   [Estimación]  POST /api/estimar | GET /api/eventos/:id');
    console.log('   [Limpieza]    POST /api/limpieza/registro | POST /api/limpieza/identificar | GET /api/limpieza/:evento_id');
    console.log('   [Conteo]      POST|GET /api/contar/:evento_id');
    console.log('   [Dashboard]   GET /api/dashboard/:evento_id | GET /api/dashboard/historial | GET /api/dashboard/zonas/:evento_id');
    console.log('   [Privacidad]  DELETE /api/eliminar-datos\n');
  });
}

main().catch(err => {
  console.error('[FATAL]', err.message);
  process.exit(1);
});

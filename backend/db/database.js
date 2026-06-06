/**
 * Shared mutable DB object.
 * Methods (prepare, exec, transaction, pragma) are populated by initDatabase().
 * All routes import this object; it works because methods are filled before
 * Express accepts any requests.
 */
const db = {
  prepare:     null,
  exec:        null,
  transaction: null,
  pragma:      () => {}, // no-op for sql.js (WAL not applicable)
};

module.exports = db;

const path = require('path');
const dotenv = require('dotenv');

// Centralised environment loading.
//
// The project keeps one .env at the repo root (feedesk/.env) so docker-compose
// interpolation and the Node processes read the same file. dotenv's default
// resolves ".env" against process.cwd(), which silently loads nothing the moment
// you run `npm start` from backend/ instead of the root — no error, just a
// server with no MONGO_URI. Resolving against __dirname instead makes env
// loading independent of where the process was invoked from.
//
// Precedence: backend/.env is loaded first and wins, because dotenv never
// overwrites an already-set variable. That lets a developer keep local
// overrides without touching the shared root file.
//
// In Docker neither file exists — the compose `environment:` block supplies
// everything — so both loads no-op harmlessly.

const BACKEND_ENV = path.resolve(__dirname, '..', '.env');
const ROOT_ENV = path.resolve(__dirname, '..', '..', '.env');

const loaded = [];
for (const file of [BACKEND_ENV, ROOT_ENV]) {
  const result = dotenv.config({ path: file });
  if (!result.error) loaded.push(path.basename(path.dirname(file)) + '/.env');
}

// Say which file(s) actually took effect. Cheap, and it turns "why is MONGO_URI
// undefined" into a one-line answer.
if (loaded.length) {
  console.log(`Env loaded from: ${loaded.join(', ')}`);
} else {
  console.warn(
    `No .env found at ${ROOT_ENV} or ${BACKEND_ENV} — relying on the ambient environment. ` +
    'Expected inside Docker; a mistake if you are running locally.'
  );
}

module.exports = { loaded, ROOT_ENV, BACKEND_ENV };

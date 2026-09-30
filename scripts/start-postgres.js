const { default: EmbeddedPostgres } = require('embedded-postgres');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.resolve(__dirname, '../data/postgres');
const PORT = parseInt(process.env.PGPORT || '5432', 10);
const USER = process.env.PGUSER || 'velox';
const PASSWORD = process.env.PGPASSWORD || 'velox_dev';
const DATABASE = process.env.PGDATABASE || 'velox_dev';

async function main() {
  console.log('================================================================');
  console.log('            VELOX NATIVE POSTGRESQL SERVICE (WINDOWS)           ');
  console.log('================================================================\n');
  console.log(`[Config] Data Directory: ${DATA_DIR}`);
  console.log(`[Config] Port:           ${PORT}`);
  console.log(`[Config] User:           ${USER}`);
  console.log(`[Config] Database:       ${DATABASE}\n`);

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const pg = new EmbeddedPostgres({
    databaseDir: DATA_DIR,
    port: PORT,
    user: USER,
    password: PASSWORD,
    authMethod: 'password',
    persistent: true,
  });

  const isInitialized = fs.existsSync(path.join(DATA_DIR, 'PG_VERSION'));
  if (!isInitialized) {
    console.log('[Init] Initializing PostgreSQL cluster for the first time...');
    await pg.initialise();
    console.log('[Init] Cluster initialized successfully.\n');
  } else {
    console.log('[Init] Existing PostgreSQL cluster data found.\n');
  }

  console.log('[Start] Starting PostgreSQL daemon on port ' + PORT + '...');
  await pg.start();
  console.log('[Start] PostgreSQL daemon is active and listening for connections!\n');

  // Ensure default database exists
  try {
    await pg.createDatabase(DATABASE);
    console.log(`[DB] Created database '${DATABASE}'.`);
  } catch (err) {
    console.log(`[DB] Database '${DATABASE}' ready.`);
  }

  console.log(`\n================================================================`);
  console.log(`Connection URL: postgresql://${USER}:${PASSWORD}@localhost:${PORT}/${DATABASE}`);
  console.log(`================================================================\n`);
  console.log('PostgreSQL is running. Press Ctrl+C to stop.');

  let stopping = false;
  const shutdown = async () => {
    if (stopping) return;
    stopping = true;
    console.log('\n[Stop] Shutting down PostgreSQL daemon cleanly...');
    try {
      await pg.stop();
      console.log('[Stop] PostgreSQL daemon stopped successfully.');
      process.exit(0);
    } catch (e) {
      console.error('[Stop] Error during shutdown:', e);
      process.exit(1);
    }
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Keep process running
  setInterval(() => {}, 60000);
}

main().catch((err) => {
  console.error('\n❌ Failed to start PostgreSQL:', err);
  process.exit(1);
});

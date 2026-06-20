import { buildApp } from './app.js';
import { config } from './config.js';
import { closeDatabase } from './db/index.js';
import { logger } from './logger.js';

/**
 * Process entrypoint. Starts the HTTP server and installs a graceful shutdown
 * sequence so in-flight requests drain and the database WAL is checkpointed and
 * closed cleanly on SIGINT/SIGTERM (e.g. `docker stop`).
 */
async function main(): Promise<void> {
  const app = await buildApp();

  let shuttingDown = false;
  const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'shutting down');
    try {
      await app.close(); // stops accepting connections, drains in-flight requests
      closeDatabase();
      logger.info('shutdown complete');
      process.exit(0);
    } catch (err) {
      logger.error({ err }, 'error during shutdown');
      process.exit(1);
    }
  };

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => void shutdown(signal));
  }

  // A crash should never leave a half-open server; log loudly and exit so the
  // container orchestrator can restart us from a clean state.
  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'uncaught exception');
    closeDatabase();
    process.exit(1);
  });
  process.on('unhandledRejection', (reason) => {
    logger.fatal({ reason }, 'unhandled rejection');
    closeDatabase();
    process.exit(1);
  });

  try {
    await app.listen({ host: config.host, port: config.port });
    logger.info(`SSHID listening on http://${config.host}:${config.port} (origin ${config.publicOrigin})`);
  } catch (err) {
    logger.fatal({ err }, 'failed to start server');
    closeDatabase();
    process.exit(1);
  }
}

void main();

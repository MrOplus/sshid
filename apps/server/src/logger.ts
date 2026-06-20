import { pino, type LoggerOptions } from 'pino';
import { config } from './config.js';

/**
 * Shared logging configuration.
 *
 * The same options drive both the standalone logger (used for startup and
 * database lifecycle messages) and Fastify's per-request logger. Passing
 * *options* to Fastify — rather than a pre-built instance — keeps Fastify's
 * generic `FastifyBaseLogger` typing intact across the app.
 */
export const loggerOptions: LoggerOptions = {
  level: config.logLevel,
  // Never leak secrets or auth material into logs.
  redact: {
    paths: ['req.headers.cookie', 'req.headers.authorization', 'res.headers["set-cookie"]'],
    remove: true,
  },
  ...(config.isProduction
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' },
        },
      }),
};

export const logger = pino(loggerOptions);

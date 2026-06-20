import { z } from 'zod';

/**
 * Centralised, validated runtime configuration.
 *
 * Parsing happens exactly once at module load. Any misconfiguration fails fast
 * with a readable error instead of surfacing as a confusing runtime bug later.
 */
const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().min(1).default('0.0.0.0'),
  PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  PUBLIC_ORIGIN: z.string().url().default('http://localhost:8080'),
  RP_ID: z.string().min(1).default('localhost'),
  RP_NAME: z.string().min(1).default('SSHID'),
  SESSION_SECRET: z
    .string()
    .min(32, 'SESSION_SECRET must be at least 32 characters')
    .default('dev-insecure-secret-change-me-0123456789abcdef'),
  DATABASE_PATH: z.string().min(1).default('./data/sshid.sqlite'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

export type AppConfig = Readonly<{
  nodeEnv: 'development' | 'test' | 'production';
  isProduction: boolean;
  host: string;
  port: number;
  publicOrigin: string;
  rpId: string;
  rpName: string;
  sessionSecret: string;
  databasePath: string;
  logLevel: z.infer<typeof EnvSchema>['LOG_LEVEL'];
}>;

function load(): AppConfig {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  const env = parsed.data;
  const config: AppConfig = {
    nodeEnv: env.NODE_ENV,
    isProduction: env.NODE_ENV === 'production',
    host: env.HOST,
    port: env.PORT,
    publicOrigin: env.PUBLIC_ORIGIN.replace(/\/+$/, ''),
    rpId: env.RP_ID,
    rpName: env.RP_NAME,
    sessionSecret: env.SESSION_SECRET,
    databasePath: env.DATABASE_PATH,
    logLevel: env.LOG_LEVEL,
  };

  if (config.isProduction && config.sessionSecret.startsWith('dev-insecure-secret')) {
    throw new Error('SESSION_SECRET must be set to a strong secret in production.');
  }

  return Object.freeze(config);
}

export const config = load();

import { pino } from 'pino';

export type AppEnv = {
  Variables: {
    requestId: string;
    userId: string;
    tenantId: string;
  };
};

export const logger = pino({
  level: process.env.NODE_ENV === 'test' ? 'silent' : (process.env.LOG_LEVEL ?? 'info'),
  base: { service: 'saas-api' },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      '*.password',
      '*.email',
    ],
  },
});

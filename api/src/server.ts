import Fastify, {type FastifyInstance} from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import jwt from '@fastify/jwt';
import {registerRoutes} from './router.js';

interface ServerOptions {
  rateLimit?: {max: number; timeWindow: number};
  jwtSecret?: string;
}

export async function buildServer(
  opts: ServerOptions = {},
): Promise<FastifyInstance> {
  const isProduction = process.env.NODE_ENV === 'production';
  const isTest = process.env.NODE_ENV === 'test';

  const app = Fastify({
    logger: isTest
      ? false
      : isProduction
        ? {level: 'info'}
        : {
            level: 'debug',
            transport: {target: 'pino-pretty', options: {colorize: true}},
          },
  });

  await app.register(jwt, {
    secret: opts.jwtSecret ?? process.env.JWT_SECRET ?? 'dev-secret-change-me',
  });
  await app.register(helmet);
  await app.register(cors, {origin: true});
  await app.register(rateLimit, {
    max: opts.rateLimit?.max ?? 100,
    timeWindow: opts.rateLimit?.timeWindow ?? 60_000,
  });

  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Home Inventory API',
        version: '1.0.0',
      },
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
  });

  await registerRoutes(app);

  return app;
}

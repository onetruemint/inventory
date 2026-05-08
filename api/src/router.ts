import type {FastifyInstance} from 'fastify';
import health from './routes/health.js';
import auth from './routes/auth.js';

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  await app.register(health);
  await app.register(auth);
}

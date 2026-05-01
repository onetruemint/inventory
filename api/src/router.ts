import type {FastifyInstance} from 'fastify';
import health from './routes/health.js';

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  await app.register(health);
}

import {describe, it, expect} from 'vitest';
import {buildServer} from '../server.js';

describe('GET /v1/health', () => {
  it('returns ok: true', async () => {
    const app = await buildServer();
    const res = await app.inject({method: 'GET', url: '/v1/health'});
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ok: true});
  });

  it('includes CORS header for cross-origin requests', async () => {
    const app = await buildServer();
    const res = await app.inject({
      method: 'GET',
      url: '/v1/health',
      headers: {origin: 'http://localhost:5173'},
    });
    expect(res.headers['access-control-allow-origin']).toBeDefined();
  });

  it('includes security headers from helmet', async () => {
    const app = await buildServer();
    const res = await app.inject({method: 'GET', url: '/v1/health'});
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });
});

describe('rate limiting', () => {
  it('returns 429 after exceeding the request limit', async () => {
    const app = await buildServer({rateLimit: {max: 2, timeWindow: 60_000}});
    await app.inject({method: 'GET', url: '/v1/health'});
    await app.inject({method: 'GET', url: '/v1/health'});
    const res = await app.inject({method: 'GET', url: '/v1/health'});
    expect(res.statusCode).toBe(429);
  });
});

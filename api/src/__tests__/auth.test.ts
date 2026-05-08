import {describe, it, expect, beforeAll, afterAll, afterEach} from 'vitest';
import {buildServer} from '../server.js';
import {prisma} from '../db.js';
import {redis} from '../redis.js';
import type {FastifyInstance} from 'fastify';

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildServer();
  await redis.flushdb();
});

afterEach(async () => {
  await prisma.user.deleteMany({where: {email: {endsWith: '@test.invalid'}}});
  await redis.flushdb();
});

afterAll(async () => {
  await prisma.$disconnect();
  await redis.quit();
});

const TEST_USER = {email: 'alice@test.invalid', password: 'password123'};

async function register(email = TEST_USER.email, password = TEST_USER.password) {
  return app.inject({
    method: 'POST',
    url: '/v1/auth/register',
    body: {email, password},
  });
}

async function login(email = TEST_USER.email, password = TEST_USER.password) {
  return app.inject({
    method: 'POST',
    url: '/v1/auth/login',
    body: {email, password},
  });
}

describe('POST /v1/auth/register', () => {
  it('creates a user and returns an access token and refresh token', async () => {
    const res = await register();
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(typeof body.accessToken).toBe('string');
    expect(typeof body.refreshToken).toBe('string');
  });

  it('returns 409 for a duplicate email', async () => {
    await register();
    const res = await register();
    expect(res.statusCode).toBe(409);
  });
});

describe('POST /v1/auth/login', () => {
  it('returns token pair for valid credentials', async () => {
    await register();
    const res = await login();
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(typeof body.accessToken).toBe('string');
    expect(typeof body.refreshToken).toBe('string');
  });

  it('returns 401 for wrong password', async () => {
    await register();
    const res = await login(TEST_USER.email, 'wrongpassword');
    expect(res.statusCode).toBe(401);
  });

  it('returns 401 for unknown email', async () => {
    const res = await login('nobody@test.invalid', 'password123');
    expect(res.statusCode).toBe(401);
  });
});

describe('POST /v1/auth/refresh', () => {
  it('returns a new token pair for a valid refresh token', async () => {
    await register();
    const {refreshToken} = (await login()).json();
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      body: {refreshToken},
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(typeof body.accessToken).toBe('string');
    expect(typeof body.refreshToken).toBe('string');
    expect(body.refreshToken).not.toBe(refreshToken);
  });

  it('returns 401 for an unknown refresh token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      body: {refreshToken: 'not-a-real-token'},
    });
    expect(res.statusCode).toBe(401);
  });

  it('detects token reuse and invalidates the family', async () => {
    await register();
    const {refreshToken: original} = (await login()).json();

    // First rotation — succeeds
    const first = await app.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      body: {refreshToken: original},
    });
    expect(first.statusCode).toBe(200);
    const {refreshToken: rotated} = first.json();

    // Reuse the original — theft detected, family compromised
    const stolen = await app.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      body: {refreshToken: original},
    });
    expect(stolen.statusCode).toBe(401);

    // The rotated token is also now invalid (family compromised)
    const blocked = await app.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      body: {refreshToken: rotated},
    });
    expect(blocked.statusCode).toBe(401);
  });
});

describe('POST /v1/auth/logout', () => {
  it('invalidates the refresh token so subsequent refresh returns 401', async () => {
    await register();
    const {refreshToken} = (await login()).json();

    const logoutRes = await app.inject({
      method: 'POST',
      url: '/v1/auth/logout',
      body: {refreshToken},
    });
    expect(logoutRes.statusCode).toBe(204);

    const refreshRes = await app.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      body: {refreshToken},
    });
    expect(refreshRes.statusCode).toBe(401);
  });
});

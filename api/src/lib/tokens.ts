import crypto from 'crypto';
import {redis} from '../redis.js';

interface TokenPayload {
  userId: string;
  householdId: string;
  familyId: string;
}

export interface RotateResult {
  userId: string;
  householdId: string;
  newToken: string;
}

const TTL_SECS = 30 * 24 * 60 * 60; // 30 days

export function newRefreshToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function newFamilyId(): string {
  return crypto.randomBytes(16).toString('hex');
}

export async function storeRefreshToken(
  token: string,
  payload: TokenPayload,
): Promise<void> {
  await redis.set(`rt:${token}`, JSON.stringify(payload), 'EX', TTL_SECS);
}

export async function rotateRefreshToken(
  token: string,
): Promise<RotateResult | null> {
  const raw = await redis.get(`rt:${token}`);

  if (!raw) {
    // Token not found — if it was previously rotated, this is a reuse attack.
    // Compromise the entire family so all issued tokens in it become invalid.
    const familyId = await redis.get(`rt:used:${token}`);
    if (familyId) {
      await redis.set(`rt:family:revoked:${familyId}`, '1', 'EX', TTL_SECS);
    }
    return null;
  }

  const payload: TokenPayload = JSON.parse(raw);

  if (await redis.get(`rt:family:revoked:${payload.familyId}`)) {
    return null;
  }

  const newToken = newRefreshToken();

  await Promise.all([
    redis.del(`rt:${token}`),
    redis.set(`rt:used:${token}`, payload.familyId, 'EX', TTL_SECS),
    redis.set(`rt:${newToken}`, JSON.stringify(payload), 'EX', TTL_SECS),
  ]);

  return {userId: payload.userId, householdId: payload.householdId, newToken};
}

export async function revokeRefreshToken(token: string): Promise<void> {
  await redis.del(`rt:${token}`);
}

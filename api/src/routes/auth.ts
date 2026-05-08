import {randomUUID} from 'crypto';
import type {FastifyPluginAsync} from 'fastify';
import bcrypt from 'bcryptjs';
import {prisma} from '../db.js';
import {
  newRefreshToken,
  newFamilyId,
  storeRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
} from '../lib/tokens.js';

const TOKEN_SCHEMA = {
  type: 'object',
  properties: {
    accessToken: {type: 'string'},
    refreshToken: {type: 'string'},
  },
};

const auth: FastifyPluginAsync = async app => {
  app.post('/v1/auth/register', {
    schema: {
      tags: ['auth'],
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: {type: 'string', format: 'email'},
          password: {type: 'string', minLength: 8},
        },
      },
      response: {201: TOKEN_SCHEMA},
    },
    async handler(req, reply) {
      const {email, password} = req.body as {email: string; password: string};

      if (await prisma.user.findUnique({where: {email}})) {
        return reply.status(409).send({error: 'Email already registered'});
      }

      const user = await prisma.user.create({
        data: {
          email,
          passwordHash: await bcrypt.hash(password, 10),
          memberships: {
            create: {
              role: 'OWNER',
              household: {create: {name: `${email}'s Household`}},
            },
          },
        },
        include: {memberships: true},
      });

      const {householdId} = user.memberships[0];
      const accessToken = app.jwt.sign({userId: user.id, householdId}, {expiresIn: '15m'});
      const refreshToken = newRefreshToken();
      await storeRefreshToken(refreshToken, {userId: user.id, householdId, familyId: newFamilyId()});

      return reply.status(201).send({accessToken, refreshToken});
    },
  });

  app.post('/v1/auth/login', {
    schema: {
      tags: ['auth'],
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: {type: 'string'},
          password: {type: 'string'},
        },
      },
      response: {200: TOKEN_SCHEMA},
    },
    async handler(req, reply) {
      const {email, password} = req.body as {email: string; password: string};

      const user = await prisma.user.findUnique({
        where: {email},
        include: {
          memberships: {where: {role: 'OWNER'}, take: 1},
        },
      });

      const validPassword = user && (await bcrypt.compare(password, user.passwordHash));
      if (!validPassword) {
        return reply.status(401).send({error: 'Invalid credentials'});
      }

      const householdId =
        user.memberships[0]?.householdId ??
        (await prisma.householdMember.findFirst({where: {userId: user.id}}))?.householdId;

      if (!householdId) {
        return reply.status(500).send({error: 'No household found'});
      }

      const accessToken = app.jwt.sign({userId: user.id, householdId}, {expiresIn: '15m'});
      const refreshToken = newRefreshToken();
      await storeRefreshToken(refreshToken, {userId: user.id, householdId, familyId: newFamilyId()});

      return {accessToken, refreshToken};
    },
  });

  app.post('/v1/auth/refresh', {
    schema: {
      tags: ['auth'],
      body: {
        type: 'object',
        required: ['refreshToken'],
        properties: {refreshToken: {type: 'string'}},
      },
      response: {200: TOKEN_SCHEMA},
    },
    async handler(req, reply) {
      const {refreshToken} = req.body as {refreshToken: string};

      const result = await rotateRefreshToken(refreshToken);
      if (!result) {
        return reply.status(401).send({error: 'Invalid or expired refresh token'});
      }

      const accessToken = app.jwt.sign(
        {userId: result.userId, householdId: result.householdId},
        {expiresIn: '15m'},
      );

      return {accessToken, refreshToken: result.newToken};
    },
  });

  app.post('/v1/auth/logout', {
    schema: {
      tags: ['auth'],
      body: {
        type: 'object',
        required: ['refreshToken'],
        properties: {refreshToken: {type: 'string'}},
      },
      response: {204: {type: 'null'}},
    },
    async handler(req, reply) {
      const {refreshToken} = req.body as {refreshToken: string};
      await revokeRefreshToken(refreshToken);
      return reply.status(204).send();
    },
  });
};

export default auth;

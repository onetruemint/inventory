import type {FastifyPluginAsync} from 'fastify';

const health: FastifyPluginAsync = async app => {
  app.get('/v1/health', {
    schema: {
      tags: ['system'],
      response: {
        200: {
          type: 'object',
          properties: {ok: {type: 'boolean'}},
          required: ['ok'],
        },
      },
    },
    async handler() {
      return {ok: true};
    },
  });
};

export default health;

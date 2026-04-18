import fp from 'fastify-plugin';
import FastifySwagger from '@fastify/swagger';
import FastifySwaggerUi from '@fastify/swagger-ui';
import { FastifyInstance } from 'fastify';
import { getEnv } from '../config/env.config.js';

async function swaggerPluginFn(fastify: FastifyInstance, _opts: unknown) {
  const env = getEnv();

  await fastify.register(FastifySwagger, {
    openapi: {
      info: {
        title: env.APP_NAME,
        description: 'ExportHub Backend API Documentation',
        version: '1.0.0',
      },
      servers: [
        {
          url: `${env.API_PREFIX}`,
          description: 'API Server',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
      security: [{ bearerAuth: [] }],
    },
  });

  await fastify.register(FastifySwaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
  });
}

export const swaggerPlugin = fp(swaggerPluginFn, {
  name: 'swagger-plugin',
  fastify: '4.x',
});
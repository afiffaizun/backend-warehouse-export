import fp from 'fastify-plugin';
import FastifyCors from '@fastify/cors';
import { FastifyInstance } from 'fastify';
import { getEnv } from '../config/env.config.js';

async function corsPluginFn(fastify: FastifyInstance, _opts: unknown) {
  const env = getEnv();

  await fastify.register(FastifyCors, {
    origin: env.CORS_ORIGIN,
    credentials: true,
  });
}

export const corsPlugin = fp(corsPluginFn, {
  name: 'cors-plugin',
  fastify: '4.x',
});
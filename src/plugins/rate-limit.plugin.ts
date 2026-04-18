import fp from 'fastify-plugin';
import FastifyRateLimit from '@fastify/rate-limit';
import { FastifyInstance } from 'fastify';
import { getEnv } from '../config/env.config.js';

async function rateLimitPluginFn(fastify: FastifyInstance, _opts: unknown) {
  const env = getEnv();

  await fastify.register(FastifyRateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW,
  });
}

export const rateLimitPlugin = fp(rateLimitPluginFn, {
  name: 'rate-limit-plugin',
  fastify: '4.x',
});
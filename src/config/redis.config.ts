import fp from 'fastify-plugin';
import FastifyRedis from '@fastify/redis';
import { FastifyInstance } from 'fastify';
import { getEnv } from './env.config.js';

async function redisConfigFn(fastify: FastifyInstance, _opts: unknown) {
  const env = getEnv();

  await fastify.register(FastifyRedis, {
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD,
  });
}

export const redisConfigPlugin = fp(redisConfigFn, {
  name: 'redis-config-plugin',
  fastify: '4.x',
});
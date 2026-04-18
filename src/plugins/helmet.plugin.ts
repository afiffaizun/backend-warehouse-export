import fp from 'fastify-plugin';
import FastifyHelmet from '@fastify/helmet';
import { FastifyInstance } from 'fastify';

async function helmetPluginFn(fastify: FastifyInstance, _opts: unknown) {
  await fastify.register(FastifyHelmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        scriptSrc: ["'self'"],
      },
    },
  });
}

export const helmetPlugin = fp(helmetPluginFn, {
  name: 'helmet-plugin',
  fastify: '4.x',
});
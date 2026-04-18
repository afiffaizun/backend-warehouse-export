import fp from 'fastify-plugin';
import FastifyMultipart from '@fastify/multipart';
import { FastifyInstance } from 'fastify';

async function multipartPluginFn(fastify: FastifyInstance, _opts: unknown) {
  await fastify.register(FastifyMultipart, {
    limits: {
      fileSize: 10 * 1024 * 1024,
    },
  });
}

export const multipartPlugin = fp(multipartPluginFn, {
  name: 'multipart-plugin',
  fastify: '4.x',
});
import fp from 'fastify-plugin';
import FastifyJWT from '@fastify/jwt';
import { FastifyInstance, FastifyRequest } from 'fastify';
import { getEnv } from '../config/env.config.js';

async function authPluginFn(app: FastifyInstance, _opts: unknown) {
  const env = getEnv();

  await app.register(FastifyJWT, {
    secret: env.JWT_SECRET,
    sign: {
      expiresIn: env.JWT_EXPIRES_IN,
    },
  });

  app.decorate('verifyJwt', async function (request: FastifyRequest) {
    try {
      await request.jwtVerify();
    } catch (err) {
      throw err;
    }
  });

  app.decorate('generateAccessToken', function (user: { userId: string; email: string; role: string }) {
    return app.jwt.sign(user);
  });

  app.decorate('generateRefreshToken', function (user: { userId: string; email: string; role: string }) {
    return app.jwt.sign(user, { expiresIn: env.JWT_REFRESH_EXPIRES_IN });
  });
}

export const authPlugin = fp(authPluginFn, {
  name: 'auth-plugin',
  fastify: '4.x',
});
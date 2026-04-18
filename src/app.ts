import Fastify from 'fastify';
import { loadEnv, getEnv } from './config/env.config.js';
import { connectDatabase, disconnectDatabase, prisma } from './config/database.config.js';

import { corsPlugin } from './plugins/cors.plugin.js';
import { helmetPlugin } from './plugins/helmet.plugin.js';
import { rateLimitPlugin } from './plugins/rate-limit.plugin.js';
import { authPlugin } from './plugins/auth.plugin.js';
import { swaggerPlugin } from './plugins/swagger.plugin.js';
import { multipartPlugin } from './plugins/multipart.plugin.js';

async function buildApp() {
  loadEnv();
  const env = getEnv();

  const fastify = Fastify({
    logger: {
      level: env.NODE_ENV === 'development' ? 'debug' : 'info',
    },
  });

  await connectDatabase();

  await fastify.register(corsPlugin);
  await fastify.register(helmetPlugin);
  await fastify.register(rateLimitPlugin);
  await fastify.register(authPlugin);
  await fastify.register(swaggerPlugin);
  await fastify.register(multipartPlugin);

  fastify.addHook('onClose', async () => {
    await disconnectDatabase();
  });

  fastify.get('/', async () => {
    return {
      success: true,
      message: `${env.APP_NAME} is running`,
      version: '1.0.0',
    };
  });

  fastify.get('/health', async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        database: 'connected',
      };
    } catch (error) {
      fastify.log.error({ err: error }, 'Database health check failed');
      throw new Error('Database connection failed');
    }
  });

  fastify.get(`${env.API_PREFIX}`, async () => {
    return {
      success: true,
      message: `${env.APP_NAME} API`,
      version: '1.0.0',
      docs: '/docs',
    };
  });

  return fastify;
}

async function start() {
  const env = getEnv();
  const app = await buildApp();

  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
    console.log(`🚀 Server running at http://localhost:${env.PORT}`);
    console.log(`📊 Environment: ${env.NODE_ENV}`);
    console.log(`📝 API Prefix: ${env.API_PREFIX}`);
    console.log(`📚 API Docs: http://localhost:${env.PORT}/docs`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
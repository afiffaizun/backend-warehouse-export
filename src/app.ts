import Fastify from 'fastify';
import { loadEnv, getEnv } from './config/env.config.js';

async function buildApp() {
  loadEnv();
  const env = getEnv();

  const fastify = Fastify({
    logger: {
      level: env.NODE_ENV === 'development' ? 'debug' : 'info',
    },
  });

  fastify.get('/', async () => {
    return {
      success: true,
      message: `${env.APP_NAME} is running`,
      version: '1.0.0',
    };
  });

  fastify.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  return fastify;
}

async function start() {
  const env = getEnv();
  const app = await buildApp();

  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
    console.log(`🚀 Server running at http://localhost:${env.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();

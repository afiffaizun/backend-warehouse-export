import { Role } from './common.types.js';

declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
    userRole?: Role;
  }
}

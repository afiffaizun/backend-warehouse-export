import * as Minio from 'minio';
import { getEnv } from './env.config.js';

const env = getEnv();

export const minioClient = new Minio.Client({
  endPoint: env.MINIO_ENDPOINT,
  port: env.MINIO_PORT,
  useSSL: env.MINIO_USE_SSL,
  accessKey: env.MINIO_ACCESS_KEY,
  secretKey: env.MINIO_SECRET_KEY,
});

export const MINIO_BUCKET = env.MINIO_BUCKET;

export async function initMinIO() {
  try {
    const bucketExists = await minioClient.bucketExists(MINIO_BUCKET);
    if (!bucketExists) {
      await minioClient.makeBucket(MINIO_BUCKET, 'us-east-1');
      console.log(`✅ Created MinIO bucket: ${MINIO_BUCKET}`);
    }
    console.log(`✅ MinIO connected: ${env.MINIO_ENDPOINT}:${env.MINIO_PORT}`);
  } catch (error) {
    console.error(`❌ MinIO initialization failed:`, error);
  }
}

export async function getFileUrl(bucket: string, objectName: string): Promise<string> {
  return minioClient.presignedGetObject(bucket, objectName, 60 * 60 * 24);
}

export async function deleteFile(bucket: string, objectName: string): Promise<void> {
  return minioClient.removeObject(bucket, objectName);
}
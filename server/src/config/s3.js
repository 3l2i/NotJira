import { S3Client } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'eu-north-1',
});

export const S3_BUCKETS = {
  ORIGINALS: process.env.S3_ORIGINALS_BUCKET || 'minijira-originals',
  RESIZED: process.env.S3_RESIZED_BUCKET || 'minijira-resized',
};

export { s3Client };

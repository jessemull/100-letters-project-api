import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({
  region: 'us-west-2',
});

async function createPresignedPutUrl(params: {
  Bucket: string;
  ContentType: string;
  Key: string;
  expiresIn?: number;
}): Promise<string> {
  const { Bucket, ContentType, Key, expiresIn = 60 } = params;
  return getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket,
      ContentType,
      Key,
    }),
    { expiresIn },
  );
}

export {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  createPresignedPutUrl,
  s3,
};

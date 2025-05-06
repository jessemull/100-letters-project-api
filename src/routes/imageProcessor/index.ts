import path from 'path';
import sharp from 'sharp';
import { S3Handler } from 'aws-lambda';
import { logger, s3 } from '../../common/util';

export const handler: S3Handler = async (event) => {
  try {
    for (const record of event.Records) {
      const bucketName = record.s3.bucket.name;
      const fileKey = record.s3.object.key;

      if (!fileKey) {
        logger.error('Missing fileKey in the S3 event!');
        continue;
      }

      const ext = path.extname(fileKey);
      const baseName = fileKey.slice(0, -ext.length);

      const thumbnailKey = `${baseName}_thumb.webp`;
      const largeKey = `${baseName}_large.webp`;

      const s3Object = await s3
        .getObject({
          Bucket: bucketName,
          Key: fileKey,
        })
        .promise();

      const imageBuffer = s3Object.Body as Buffer;

      const [largeImageBuffer, thumbnailImageBuffer] = await Promise.all([
        sharp(imageBuffer).webp({ quality: 80 }).toBuffer(),
        sharp(imageBuffer)
          .resize({ width: 200 })
          .webp({ quality: 70 })
          .toBuffer(),
      ]);

      await Promise.all([
        s3
          .putObject({
            Bucket: bucketName,
            Key: largeKey,
            Body: largeImageBuffer,
            ContentType: 'image/webp',
          })
          .promise(),
        s3
          .putObject({
            Bucket: bucketName,
            Key: thumbnailKey,
            Body: thumbnailImageBuffer,
            ContentType: 'image/webp',
          })
          .promise(),
      ]);

      logger.info(`Processed and uploaded: ${largeKey} and ${thumbnailKey}...`);
    }
  } catch (error) {
    logger.error('Error processing image: ', error);
    throw error;
  }
};

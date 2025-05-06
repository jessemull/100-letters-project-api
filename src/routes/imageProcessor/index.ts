import path from 'path';
import sharp from 'sharp';
import { S3Handler } from 'aws-lambda';
import { logger, s3 } from '../../common/util';

export const handler: S3Handler = async (event) => {
  try {
    for (const record of event.Records) {
      const bucketName = record.s3.bucket.name;
      const fileKey = decodeURIComponent(
        record.s3.object.key.replace(/\+/g, ' '),
      );

      if (!fileKey || !fileKey.startsWith('unprocessed/')) {
        logger.warn(`Skipping non-unprocessed image: ${fileKey}`);
        continue;
      }

      const ext = path.extname(fileKey);
      const fileName = path.basename(fileKey, ext);
      const parts = fileName.split('_');

      if (parts.length !== 4) {
        logger.error(`Invalid file name format: ${fileKey}`);
        continue;
      }

      const [correspondenceId, letterId, view, uuid] = parts;

      const destinationBase = `images/${correspondenceId}/${letterId}/${view}/${uuid}`;
      const largeKey = `${destinationBase}_large.webp`;
      const thumbnailKey = `${destinationBase}_thumb.webp`;

      const s3Object = await s3
        .getObject({
          Bucket: bucketName,
          Key: fileKey,
        })
        .promise();

      const imageBuffer = s3Object.Body as Buffer;

      const [largeBuffer, thumbnailBuffer] = await Promise.all([
        sharp(imageBuffer)
          .resize({ width: 1200 })
          .webp({ quality: 80 })
          .toBuffer(),
        sharp(imageBuffer)
          .resize({ width: 300 })
          .webp({ quality: 70 })
          .toBuffer(),
      ]);

      await Promise.all([
        s3
          .putObject({
            Bucket: bucketName,
            Key: largeKey,
            Body: largeBuffer,
            ContentType: 'image/webp',
          })
          .promise(),
        s3
          .putObject({
            Bucket: bucketName,
            Key: thumbnailKey,
            Body: thumbnailBuffer,
            ContentType: 'image/webp',
          })
          .promise(),
      ]);

      logger.info(`Processed and saved images: ${largeKey}, ${thumbnailKey}`);
    }
  } catch (error) {
    logger.error('Error processing image:', error);
    throw error;
  }
};

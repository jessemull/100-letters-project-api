import path from 'path';
import { Jimp } from 'jimp';
import { S3Handler } from 'aws-lambda';
import { GetObjectCommand, PutObjectCommand, s3 } from '../../common/util/s3';
import { logger } from '../../common/util/logger';

export const handler: S3Handler = async (event) => {
  try {
    for (const record of event.Records) {
      const bucketName = record.s3.bucket.name;
      const fileKey = decodeURIComponent(
        record.s3.object.key.replace(/\+/g, ' '),
      );
      logger.info(`Processing record: bucket=${bucketName} key=${fileKey}`);

      if (!fileKey || !fileKey.startsWith('unprocessed/')) {
        logger.warn(`Skipping non-unprocessed image: ${fileKey}`);
        continue;
      }

      const ext = path.extname(fileKey);
      const fileName = path.basename(fileKey, ext);
      const parts = fileName.split('___');

      if (parts.length !== 4) {
        logger.error(`Invalid file name format: ${fileKey}`);
        continue;
      }

      const [correspondenceId, letterId, view, uuid] = parts;
      const destinationBase = `images/${correspondenceId}/${letterId}/${view}/${uuid}`;
      const largeKey = `${destinationBase}_large.jpg`;
      const thumbnailKey = `${destinationBase}_thumb.jpg`;

      const s3Object = await s3.send(
        new GetObjectCommand({
          Bucket: bucketName,
          Key: fileKey,
        }),
      );

      logger.info(`Image data fetched from S3 for key: ${fileKey}`);

      if (!s3Object.Body) {
        throw new Error(`Empty S3 object body for key: ${fileKey}`);
      }

      const imageBuffer = Buffer.from(
        await s3Object.Body.transformToByteArray(),
      );

      logger.info(`Buffer length: ${imageBuffer.length}`);

      const image = await Jimp.read(imageBuffer);

      const largeImage = await image.clone().resize({ w: 800 });
      const thumbnailImage = await image.clone().resize({ w: 300 });

      const [largeBuffer, thumbnailBuffer] = await Promise.all([
        largeImage.getBuffer('image/jpeg', {
          quality: 50,
        }),
        thumbnailImage.getBuffer('image/jpeg', {
          quality: 50,
        }),
      ]);

      await Promise.all([
        s3
          .send(
            new PutObjectCommand({
              Bucket: bucketName,
              Key: largeKey,
              Body: largeBuffer,
              ContentType: 'image/jpeg',
            }),
          )
          .then(() => logger.info(`Successfully uploaded: ${largeKey}`)),
        s3
          .send(
            new PutObjectCommand({
              Bucket: bucketName,
              Key: thumbnailKey,
              Body: thumbnailBuffer,
              ContentType: 'image/jpeg',
            }),
          )
          .then(() => logger.info(`Successfully uploaded: ${thumbnailKey}`)),
      ]);

      logger.info(`Processed and saved images: ${largeKey}, ${thumbnailKey}`);
    }
  } catch (error) {
    logger.error('Error processing image:', error);
    throw error;
  }
};

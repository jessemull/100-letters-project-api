import path from 'path';
import { Jimp } from 'jimp';
import { S3Handler } from 'aws-lambda';
import { logger, s3 } from '../../common/util';
import { WithImplicitCoercion } from 'buffer';

export const handler: S3Handler = async (event) => {
  try {
    for (const record of event.Records) {
      logger.info('Processing record: ', record);
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
      const parts = fileName.split('___');

      if (parts.length !== 4) {
        logger.error(`Invalid file name format: ${fileKey}`);
        continue;
      }

      const [correspondenceId, letterId, view, uuid] = parts;
      const destinationBase = `images/${correspondenceId}/${letterId}/${view}/${uuid}`;
      const largeKey = `${destinationBase}_large.jpg`;
      const thumbnailKey = `${destinationBase}_thumb.jpg`;

      const s3Object = await s3
        .getObject({
          Bucket: bucketName,
          Key: fileKey,
        })
        .promise();

      logger.info('Image data fetched from S3', s3Object);

      const imageBuffer = Buffer.isBuffer(s3Object.Body)
        ? s3Object.Body
        : Buffer.from(s3Object.Body as WithImplicitCoercion<ArrayLike<number>>);

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
          .putObject({
            Bucket: bucketName,
            Key: largeKey,
            Body: largeBuffer,
            ContentType: 'image/jpeg',
          })
          .promise()
          .then(() => logger.info(`Successfully uploaded: ${largeKey}`))
          .catch((err) => logger.error(`Error uploading ${largeKey}`, err)),

        s3
          .putObject({
            Bucket: bucketName,
            Key: thumbnailKey,
            Body: thumbnailBuffer,
            ContentType: 'image/jpeg',
          })
          .promise()
          .then(() => logger.info(`Successfully uploaded: ${thumbnailKey}`))
          .catch((err) => logger.error(`Error uploading ${thumbnailKey}`, err)),
      ]);

      logger.info(`Processed and saved images: ${largeKey}, ${thumbnailKey}`);
    }
  } catch (error) {
    logger.error('Error processing image:', error);
    throw error;
  }
};

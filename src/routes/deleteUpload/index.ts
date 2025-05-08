import path from 'path';
import { APIGatewayProxyHandler } from 'aws-lambda';
import { BadRequestError, DatabaseError } from '../../common/errors';
import { getHeaders, logger, s3 } from '../../common/util';

export const handler: APIGatewayProxyHandler = async (event) => {
  const headers = getHeaders(event);

  try {
    const { fileKey } = event.queryStringParameters || {};

    if (!fileKey) {
      return new BadRequestError('Missing file key!').build(headers);
    }

    const ext = path.extname(fileKey);
    const fileName = path.basename(fileKey, ext);
    const parts = fileName.split('___');

    if (parts.length !== 4) {
      return new BadRequestError(`Invalid file key format: ${fileKey}`).build(
        headers,
      );
    }

    const [correspondenceId, letterId, view, uuid] = parts;

    const originalKey = fileKey;
    const basePath = `images/${correspondenceId}/${letterId}/${view}/${uuid}`;
    const thumbnailKey = `${basePath}_thumb.webp`;
    const largeKey = `${basePath}_large.webp`;

    await Promise.all([
      s3
        .deleteObject({
          Bucket: process.env.IMAGE_S3_BUCKET_NAME!,
          Key: originalKey,
        })
        .promise(),
      s3
        .deleteObject({
          Bucket: process.env.IMAGE_S3_BUCKET_NAME!,
          Key: thumbnailKey,
        })
        .promise(),
      s3
        .deleteObject({
          Bucket: process.env.IMAGE_S3_BUCKET_NAME!,
          Key: largeKey,
        })
        .promise(),
    ]);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Image and variants deleted successfully!',
      }),
      headers,
    };
  } catch (error) {
    logger.error('Error deleting image: ', error);
    return new DatabaseError('Error deleting image.').build(headers);
  }
};

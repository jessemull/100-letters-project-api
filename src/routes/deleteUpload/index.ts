import path from 'path';
import { APIGatewayProxyHandler } from 'aws-lambda';
import { BadRequestError, DatabaseError } from '../../common/errors';
import { logger } from '../../common/util/logger';
import { getHeaders } from '../../common/util/headers';
import { DeleteObjectCommand, s3 } from '../../common/util/s3';

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
    const thumbnailKey = `${basePath}_thumb.jpg`;
    const largeKey = `${basePath}_large.jpg`;

    const bucket = process.env.IMAGE_S3_BUCKET_NAME!;
    await Promise.all([
      s3.send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: originalKey,
        }),
      ),
      s3.send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: thumbnailKey,
        }),
      ),
      s3.send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: largeKey,
        }),
      ),
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

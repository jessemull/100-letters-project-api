import { APIGatewayProxyHandler } from 'aws-lambda';
import { BadRequestError, DatabaseError } from '../../common/errors';
import { getHeaders, logger, s3 } from '../../common/util';
import { randomUUID } from 'crypto';

const extensionMap: { [key: string]: string } = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export const handler: APIGatewayProxyHandler = async (event) => {
  const headers = getHeaders(event);

  try {
    if (!event.body) {
      return new BadRequestError('Request body is required.').build(headers);
    }

    const { correspondenceId, letterId, mimeType, view } = JSON.parse(
      event.body,
    );

    if (!correspondenceId || !letterId || !mimeType || !view) {
      return new BadRequestError('Missing required fields.').build(headers);
    }

    const extension = extensionMap[mimeType];

    if (!extension) {
      return new BadRequestError(`Unsupported MIME type: ${mimeType}`).build(
        headers,
      );
    }

    const uuid = randomUUID();
    const fileKey = `unprocessed/${correspondenceId}___${letterId}___${view}___${uuid}.${extension}`;
    const basePath = `images/${correspondenceId}/${letterId}/${view}/${uuid}`;
    const imageURL = `https://${process.env.PUBLIC_IMAGE_DOMAIN || 'dev.onehundredletters.com'}/${basePath}_large.jpg`;
    const thumbnailURL = `https://${process.env.PUBLIC_IMAGE_DOMAIN || 'dev.onehundredletters.com'}/${basePath}_thumb.jpg`;

    const params = {
      Bucket: process.env.IMAGE_S3_BUCKET_NAME,
      ContentType: mimeType,
      Expires: 60,
      Key: fileKey,
    };

    const signedUrl = await s3.getSignedUrlPromise('putObject', params);

    return {
      statusCode: 200,
      body: JSON.stringify({
        data: {
          correspondenceId,
          fileKey,
          imageURL,
          thumbnailURL,
          letterId,
          mimeType,
          signedUrl,
          uuid,
          view,
        },
        message: 'Signed URL created successfully!',
      }),
      headers,
    };
  } catch (error) {
    logger.error('Error generating pre-signed URL: ', error);
    return new DatabaseError('Error generating pre-signed URL.').build(headers);
  }
};

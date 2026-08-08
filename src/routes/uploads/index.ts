import { APIGatewayProxyHandler } from 'aws-lambda';
import {
  BadRequestError,
  DatabaseError,
  InternalServerError,
} from '../../common/errors';
import { logger } from '../../common/util/logger';
import { decodeJwtPayload, getHeaders } from '../../common/util/headers';
import { createPresignedPutUrl } from '../../common/util/s3';
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

    let body: {
      correspondenceId?: string;
      letterId?: string;
      mimeType?: string;
      view?: string;
    };
    try {
      body = JSON.parse(event.body);
    } catch {
      return new BadRequestError('Invalid JSON in request body.').build(
        headers,
      );
    }

    const { correspondenceId, letterId, mimeType, view } = body;

    if (!correspondenceId || !letterId || !mimeType || !view) {
      return new BadRequestError('Missing required fields.').build(headers);
    }

    const extension = extensionMap[mimeType];
    if (!extension) {
      return new BadRequestError(`Unsupported MIME type: ${mimeType}`).build(
        headers,
      );
    }

    const publicImageDomain = process.env.PUBLIC_IMAGE_DOMAIN;
    if (!publicImageDomain) {
      return new InternalServerError(
        'PUBLIC_IMAGE_DOMAIN is not configured.',
      ).build(headers);
    }

    const authHeader =
      event.headers?.Authorization || event.headers?.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new BadRequestError(
        'Missing or malformed Authorization header',
      ).build(headers);
    }

    const token = authHeader.split(' ')[1];
    const payload = decodeJwtPayload(token);

    const uploadedBy = payload['cognito:username'] || 'unknown-user';
    const dateUploaded = new Date().toISOString();

    const uuid = randomUUID();
    const fileKey = `unprocessed/${correspondenceId}___${letterId}___${view}___${uuid}.${extension}`;
    const basePath = `images/${correspondenceId}/${letterId}/${view}/${uuid}`;
    const imageURL = `https://${publicImageDomain}/${basePath}_large.jpg`;
    const thumbnailUrl = `https://${publicImageDomain}/${basePath}_thumb.jpg`;

    const signedUrl = await createPresignedPutUrl({
      Bucket: process.env.IMAGE_S3_BUCKET_NAME!,
      ContentType: mimeType,
      Key: fileKey,
      expiresIn: 60,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        data: {
          correspondenceId,
          fileKey,
          imageURL,
          thumbnailUrl,
          letterId,
          mimeType,
          signedUrl,
          uuid,
          view,
          dateUploaded,
          uploadedBy,
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

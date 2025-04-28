import { APIGatewayProxyHandler } from 'aws-lambda';
import { BadRequestError, DatabaseError } from '../../common/errors';
import { getHeaders, logger, s3 } from '../../common/util';
import { randomUUID } from 'crypto';

export const handler: APIGatewayProxyHandler = async (event) => {
  const headers = getHeaders(event);

  try {
    if (!event.body) {
      return new BadRequestError('Request body is required.').build(headers);
    }

    const { correspondenceId, letterId, fileType, view } = JSON.parse(
      event.body,
    );

    if (!correspondenceId || !letterId || !fileType || !view) {
      return new BadRequestError('Missing required fields.').build(headers);
    }

    const fileKey = `${correspondenceId}/${letterId}/${view}/${randomUUID()}`;

    const params = {
      Bucket: process.env.IMAGE_S3_BUCKET_NAME,
      Key: fileKey,
      Expires: 60,
      ContentType: fileType,
    };

    const url = await s3.getSignedUrlPromise('putObject', params);

    return {
      statusCode: 200,
      body: JSON.stringify({ url }),
    };
  } catch (error) {
    logger.error('Error generating pre-signed URL: ', error);
    return new DatabaseError('Error generating pre-signed URL.').build(headers);
  }
};

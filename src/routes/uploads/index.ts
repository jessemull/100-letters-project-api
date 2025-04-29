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

    const { correspondenceId, letterId, mimeType, view } = JSON.parse(
      event.body,
    );

    if (!correspondenceId || !letterId || !mimeType || !view) {
      return new BadRequestError('Missing required fields.').build(headers);
    }

    const uuid = randomUUID();
    const fileKey = `${correspondenceId}/${letterId}/${view}/${uuid}`;
    const imageURL = `https://${process.env.PUBLIC_IMAGE_DOMAIN}/images/${fileKey}`;

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
          imageURL,
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

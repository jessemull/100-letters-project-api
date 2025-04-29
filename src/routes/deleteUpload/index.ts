import { APIGatewayProxyHandler } from 'aws-lambda';
import { BadRequestError, DatabaseError } from '../../common/errors';
import { getHeaders, logger, s3 } from '../../common/util';

export const handler: APIGatewayProxyHandler = async (event) => {
  const headers = getHeaders(event);

  try {
    const { correspondenceId, imageId, letterId, view } =
      event.queryStringParameters || {};

    if (!correspondenceId || !imageId || !letterId || !view) {
      return new BadRequestError('Missing required query parameters.').build(
        headers,
      );
    }

    const fileKey = `${correspondenceId}/${letterId}/${view}/${imageId}`;

    const params = {
      Bucket: process.env.IMAGE_S3_BUCKET_NAME as string,
      Key: fileKey,
    };

    await s3.deleteObject(params).promise();

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Image deleted successfully!',
      }),
      headers,
    };
  } catch (error) {
    logger.error('Error deleting image: ', error);
    return new DatabaseError('Error deleting image.').build(headers);
  }
};

import { APIGatewayProxyHandler } from 'aws-lambda';
import { BadRequestError, DatabaseError } from '../../common/errors';
import { getHeaders, logger, s3 } from '../../common/util';

export const handler: APIGatewayProxyHandler = async (event) => {
  const headers = getHeaders(event);

  try {
    if (!event.body) {
      return new BadRequestError('Request body is required.').build(headers);
    }

    const { correspondenceId, letterId, view } = JSON.parse(event.body);

    if (!correspondenceId || !letterId || !view) {
      return new BadRequestError('Missing required fields.').build(headers);
    }

    const fileKey = `${correspondenceId}/${letterId}/${view}`;

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

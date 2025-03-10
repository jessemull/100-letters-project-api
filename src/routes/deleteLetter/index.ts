import { APIGatewayProxyHandler } from 'aws-lambda';
import { BadRequestError, DatabaseError } from '../../common/errors';
import { DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoClient, logger } from '../../common/util';

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const letterId = event.pathParameters?.id;

    if (!letterId) {
      return new BadRequestError('Letter ID is required.').build();
    }

    if (!event.body) {
      return new BadRequestError('Request body is required.').build();
    }

    const { correspondenceId } = JSON.parse(event.body);

    if (!correspondenceId) {
      return new BadRequestError(
        'Correspondence ID is required in request body.',
      ).build();
    }

    const deleteParams = {
      TableName: 'OneHundredLettersLetterTable',
      Key: {
        correspondenceId,
        letterId,
      },
    };

    await dynamoClient.send(new DeleteCommand(deleteParams));

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Letter deleted successfully!',
        data: { letterId },
      }),
    };
  } catch (error) {
    logger.error('Error deleting letter: ', error);
    return new DatabaseError('Internal Server Error').build();
  }
};

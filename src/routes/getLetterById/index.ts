import { APIGatewayProxyHandler } from 'aws-lambda';
import {
  BadRequestError,
  DatabaseError,
  NotFoundError,
} from '../../common/errors';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoClient, logger } from '../../common/util';

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const letterId = event.pathParameters?.id;

    if (!letterId) {
      return new BadRequestError('Letter ID is required!').build();
    }

    const params = {
      TableName: 'OneHundredLettersLetterTable',
      Key: {
        letterId: letterId,
      },
    };

    const command = new GetCommand(params);
    const result = await dynamoClient.send(command);

    if (!result.Item) {
      return new NotFoundError(`Letter with ID ${letterId} not found!`).build();
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        data: result.Item,
      }),
    };
  } catch (error) {
    logger.error('Error fetching letter from DynamoDB: ', error);
    return new DatabaseError('Internal Server Error').build();
  }
};

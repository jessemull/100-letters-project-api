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
    const recipientId = event.pathParameters?.id;

    if (!recipientId) {
      return new BadRequestError('Recipient ID is required!').build();
    }

    const params = {
      TableName: 'OneHundredLettersPersonTable',
      Key: {
        personId: recipientId,
      },
    };

    const command = new GetCommand(params);
    const result = await dynamoClient.send(command);

    if (!result.Item) {
      return new NotFoundError(
        `Recipient with ID ${recipientId} not found!`,
      ).build();
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        data: result.Item,
      }),
    };
  } catch (error) {
    logger.error('Error fetching recipient from DynamoDB: ', error);
    return new DatabaseError('Internal Server Error').build();
  }
};

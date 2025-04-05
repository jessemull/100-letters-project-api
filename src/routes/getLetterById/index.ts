import { APIGatewayProxyHandler } from 'aws-lambda';
import {
  BadRequestError,
  DatabaseError,
  NotFoundError,
} from '../../common/errors';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { config } from '../../common/config';
import { dynamoClient, logger } from '../../common/util';

const { headers, letterTableName } = config;

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const letterId = event.pathParameters?.id;

    if (!letterId) {
      return new BadRequestError('Letter ID is required!').build();
    }

    const params = {
      TableName: letterTableName,
      IndexName: 'LetterIndex',
      KeyConditionExpression: 'letterId = :letterId',
      ExpressionAttributeValues: {
        ':letterId': letterId,
      },
    };

    const command = new QueryCommand(params);
    const response = await dynamoClient.send(command);

    if (!response.Items || response.Items.length === 0) {
      return new NotFoundError(`Letter with ID ${letterId} not found!`).build();
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        data: response.Items[0],
        message: 'Letter fetched successfully!',
      }),
      headers,
    };
  } catch (error) {
    logger.error('Error fetching letter from DynamoDB: ', error);
    return new DatabaseError('Internal Server Error').build();
  }
};

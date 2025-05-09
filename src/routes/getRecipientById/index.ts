import { APIGatewayProxyHandler } from 'aws-lambda';
import {
  BadRequestError,
  DatabaseError,
  NotFoundError,
} from '../../common/errors';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { config } from '../../common/config';
import { dynamoClient, getHeaders, logger } from '../../common/util';

const { recipientTableName } = config;

export const handler: APIGatewayProxyHandler = async (event) => {
  const headers = getHeaders(event);

  try {
    const recipientId = event.pathParameters?.id;

    if (!recipientId) {
      return new BadRequestError('Recipient ID is required!').build(headers);
    }

    const PK = `recipient#${recipientId}`;

    const command = new QueryCommand({
      TableName: recipientTableName,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': PK,
      },
    });

    const result = await dynamoClient.send(command);

    if (!result.Items || result.Items.length === 0) {
      return new NotFoundError(
        `Recipient with ID ${recipientId} not found!`,
      ).build(headers);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        data: result.Items[0],
        message: 'Recipient fetched successfully!',
      }),
      headers,
    };
  } catch (error) {
    logger.error('Error fetching recipient from DynamoDB: ', error);
    return new DatabaseError('Internal Server Error').build(headers);
  }
};

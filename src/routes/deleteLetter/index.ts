import { APIGatewayProxyHandler } from 'aws-lambda';
import { BadRequestError, DatabaseError } from '../../common/errors';
import { DeleteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { config } from '../../common/config';
import { dynamoClient, logger } from '../../common/util';

const { letterTableName } = config;

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const letterId = event.pathParameters?.id;

    if (!letterId) {
      return new BadRequestError('Letter ID is required.').build();
    }

    const queryParams = {
      TableName: letterTableName,
      IndexName: 'LetterIndex',
      KeyConditionExpression: 'letterId = :letterId',
      ExpressionAttributeValues: {
        ':letterId': letterId,
      },
    };

    const { Items } = await dynamoClient.send(new QueryCommand(queryParams));

    if (!Items || Items.length === 0) {
      return new BadRequestError('Letter not found.').build();
    }

    const correspondenceId = Items[0].correspondenceId;

    if (!correspondenceId) {
      return new BadRequestError(
        'Correspondence ID not found for the given letter.',
      ).build();
    }

    const deleteParams = {
      TableName: letterTableName,
      Key: {
        correspondenceId,
        letterId,
      },
    };

    await dynamoClient.send(new DeleteCommand(deleteParams));

    return {
      statusCode: 200,
      body: JSON.stringify({
        data: { letterId },
        message: 'Letter deleted successfully!',
      }),
    };
  } catch (error) {
    logger.error('Error deleting letter: ', error);
    return new DatabaseError('Internal Server Error').build();
  }
};

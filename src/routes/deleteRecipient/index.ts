import { APIGatewayProxyHandler } from 'aws-lambda';
import { BadRequestError, DatabaseError } from '../../common/errors';
import { DeleteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoClient, logger } from '../../common/util';

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const recipientId = event.pathParameters?.id;

    if (!recipientId) {
      return new BadRequestError('Recipient ID is required.').build();
    }

    const checkParams = {
      TableName: 'OneHundredLettersCorrespondenceTable',
      IndexName: 'RecipientIndex',
      KeyConditionExpression: 'recipientId = :recipientId',
      ExpressionAttributeValues: {
        ':recipientId': recipientId,
      },
    };

    const { Items } = await dynamoClient.send(new QueryCommand(checkParams));

    if (Items && Items.length > 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message:
            'Cannot delete recipient. It is attached to one or more correspondences!',
        }),
      };
    }

    const deleteParams = {
      TableName: 'OneHundredLettersRecipientTable',
      Key: {
        recipientId,
      },
    };

    await dynamoClient.send(new DeleteCommand(deleteParams));

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Recipient deleted successfully!',
        recipientId,
      }),
    };
  } catch (error) {
    logger.error('Error deleting recipient: ', error);
    return new DatabaseError('Internal Server Error').build();
  }
};

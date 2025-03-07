import { APIGatewayProxyHandler } from 'aws-lambda';
import { DatabaseError } from '../../common/errors';
import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoClient, logger } from '../../common/util';

export const handler: APIGatewayProxyHandler = async () => {
  try {
    const params = {
      TableName: 'OneHundredLettersPersonTable',
    };

    const command = new ScanCommand(params);
    const result = await dynamoClient.send(command);

    const sortedItems = (result.Items || []).sort((a, b) => {
      const lastNameA = a.lastName?.toLowerCase() || '';
      const lastNameB = b.lastName?.toLowerCase() || '';
      return lastNameA.localeCompare(lastNameB);
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        data: sortedItems,
      }),
    };
  } catch (error) {
    logger.error('Error scanning from DynamoDB: ', error);
    return new DatabaseError('Internal Server Error').build();
  }
};

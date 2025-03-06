import { APIGatewayProxyHandler } from 'aws-lambda';
import { DatabaseError } from '../../common/errors';
import { QueryCommand } from '@aws-sdk/client-dynamodb';
import { dynamoClient, logger } from '../../common/util';

export const handler: APIGatewayProxyHandler = async () => {
  try {
    const params = {
      TableName: 'OneHundredLettersPersonTable',
      IndexName: 'LastNameIndex',
      ScanIndexForward: true,
    };

    const result = await dynamoClient.send(new QueryCommand(params));

    return {
      statusCode: 200,
      body: JSON.stringify({
        data: result.Items || [],
      }),
    };
  } catch (error) {
    logger.error('Error fetching from DynamoDB: ', error);
    const dbError = new DatabaseError('Internal Server Error');
    return {
      statusCode: dbError.statusCode,
      body: JSON.stringify({
        error: dbError.name,
        message: dbError.message,
      }),
    };
  }
};

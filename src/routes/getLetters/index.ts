import { APIGatewayProxyHandler } from 'aws-lambda';
import { DatabaseError } from '../../common/errors';
import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoClient, logger } from '../../common/util';

export const handler: APIGatewayProxyHandler = async () => {
  try {
    const params = {
      TableName: 'OneHundredLettersLetterTable',
    };

    const command = new ScanCommand(params);
    const response = await dynamoClient.send(command);
    const result = response.Items || [];

    return {
      statusCode: 200,
      body: JSON.stringify({
        data: result,
      }),
    };
  } catch (error) {
    logger.error('Error scanning from DynamoDB: ', error);
    return new DatabaseError('Internal Server Error').build();
  }
};

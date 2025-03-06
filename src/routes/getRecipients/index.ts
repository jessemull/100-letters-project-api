import { APIGatewayProxyHandler } from 'aws-lambda';
import { DatabaseError } from '../../common/errors';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { logger } from '../../common/util';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const handler: APIGatewayProxyHandler = async () => {
  try {
    const params = {
      TableName: 'OneHundredLettersPersonTable',
      IndexName: 'LastNameIndex',
      ScanIndexForward: true,
    };

    const command = new ScanCommand(params);
    const result = await docClient.send(command);

    return {
      statusCode: 200,
      body: JSON.stringify({
        data: result.Items || [],
      }),
    };
  } catch (error) {
    logger.error('Error scanning from DynamoDB: ', error);
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

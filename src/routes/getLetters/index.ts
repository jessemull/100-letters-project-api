import { APIGatewayProxyHandler } from 'aws-lambda';
import { DatabaseError } from '../../common/errors';
import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { config } from '../../common/config';
import { dynamoClient, logger } from '../../common/util';

const { headers, letterTableName } = config;

export const handler: APIGatewayProxyHandler = async (event) => {
  const queryParameters = event.queryStringParameters || {};
  const limit = parseInt(queryParameters.limit || '50', 10);

  const lastEvaluatedKey = queryParameters.lastEvaluatedKey
    ? JSON.parse(decodeURIComponent(queryParameters.lastEvaluatedKey))
    : undefined;

  try {
    const params = {
      TableName: letterTableName,
      Limit: limit,
      ExclusiveStartKey: lastEvaluatedKey,
    };

    const command = new ScanCommand(params);
    const response = await dynamoClient.send(command);

    return {
      statusCode: 200,
      body: JSON.stringify({
        data: response.Items || [],
        lastEvaluatedKey: response.LastEvaluatedKey
          ? encodeURIComponent(JSON.stringify(response.LastEvaluatedKey))
          : null,
        message: 'Letters fetched successfully!',
      }),
      headers,
    };
  } catch (error) {
    logger.error('Error scanning from DynamoDB: ', error);
    return new DatabaseError('Internal Server Error').build();
  }
};

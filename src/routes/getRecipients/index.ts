import { APIGatewayProxyHandler } from 'aws-lambda';
import { DatabaseError } from '../../common/errors';
import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { config } from '../../common/config';
import { dynamoClient, getHeaders, logger } from '../../common/util';

const { recipientTableName } = config;

export const handler: APIGatewayProxyHandler = async (event) => {
  const queryParameters = event.queryStringParameters || {};
  const limit = parseInt(queryParameters.limit || '50', 10);

  const headers = getHeaders(event);

  const lastEvaluatedKey = queryParameters.lastEvaluatedKey
    ? JSON.parse(decodeURIComponent(queryParameters.lastEvaluatedKey))
    : undefined;

  try {
    const params = {
      TableName: recipientTableName,
      Limit: limit,
      ExclusiveStartKey: lastEvaluatedKey,
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
        lastEvaluatedKey: result.LastEvaluatedKey
          ? encodeURIComponent(JSON.stringify(result.LastEvaluatedKey))
          : null,
        message: 'Recipients fetched successfully!',
      }),
      headers,
    };
  } catch (error) {
    logger.error('Error scanning from DynamoDB: ', error);
    return new DatabaseError('Internal Server Error').build(headers);
  }
};

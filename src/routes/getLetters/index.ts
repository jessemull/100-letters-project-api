import { APIGatewayProxyHandler } from 'aws-lambda';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { BadRequestError, DatabaseError } from '../../common/errors';
import { config } from '../../common/config';
import { dynamoClient } from '../../common/util/dynamo';
import { logger } from '../../common/util/logger';
import { getHeaders } from '../../common/util/headers';

const { letterTableName } = config;

export const handler: APIGatewayProxyHandler = async (event) => {
  const queryParameters = event.queryStringParameters || {};
  const limit = parseInt(queryParameters.limit || '50', 10);
  const search = queryParameters.search?.trim();
  const headers = getHeaders(event);

  let lastEvaluatedKey;
  try {
    lastEvaluatedKey = queryParameters.lastEvaluatedKey
      ? JSON.parse(decodeURIComponent(queryParameters.lastEvaluatedKey))
      : undefined;
  } catch {
    return new BadRequestError('Invalid lastEvaluatedKey.').build(headers);
  }

  try {
    const expressionAttributeValues: Record<string, unknown> = {
      ':partition': 'LETTER',
    };

    let keyConditionExpression = 'searchPartition = :partition';

    if (search) {
      keyConditionExpression += ' AND begins_with(title, :prefix)';
      expressionAttributeValues[':prefix'] = search;
    }

    const command = new QueryCommand({
      TableName: letterTableName,
      IndexName: 'TitleIndex',
      KeyConditionExpression: keyConditionExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      Limit: limit,
      ExclusiveStartKey: lastEvaluatedKey,
    });

    const response = await dynamoClient.send(command);

    return {
      statusCode: 200,
      body: JSON.stringify({
        data: response.Items || [],
        lastEvaluatedKey:
          (response.Items || []).length < limit
            ? null
            : response.LastEvaluatedKey
              ? encodeURIComponent(JSON.stringify(response.LastEvaluatedKey))
              : null,
        message: 'Letters fetched successfully!',
      }),
      headers,
    };
  } catch (error) {
    logger.error('Error querying letters: ', error);
    return new DatabaseError('Internal Server Error').build(headers);
  }
};

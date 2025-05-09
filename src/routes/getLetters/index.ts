import { APIGatewayProxyHandler } from 'aws-lambda';
import { DatabaseError } from '../../common/errors';
import { ScanCommand, ScanCommandInput } from '@aws-sdk/lib-dynamodb';
import { config } from '../../common/config';
import { dynamoClient, getHeaders, logger } from '../../common/util';

const { letterTableName } = config;

export const handler: APIGatewayProxyHandler = async (event) => {
  const queryParameters = event.queryStringParameters || {};
  const limit = parseInt(queryParameters.limit || '50', 10);
  const search = queryParameters.search;

  const headers = getHeaders(event);

  const lastEvaluatedKey = queryParameters.lastEvaluatedKey
    ? JSON.parse(decodeURIComponent(queryParameters.lastEvaluatedKey))
    : undefined;

  try {
    const params: ScanCommandInput = {
      TableName: letterTableName,
      Limit: limit,
      ExclusiveStartKey: lastEvaluatedKey,
    };

    if (search) {
      params.FilterExpression = 'contains(#t, :search)';
      params.ExpressionAttributeNames = {
        '#t': 'title',
      };
      params.ExpressionAttributeValues = {
        ':search': search,
      };
    }

    const command = new ScanCommand(params);
    const response = await dynamoClient.send(command);

    const sortedItems = (response.Items || []).sort((a, b) => {
      const titleA = a.title?.toLowerCase() || '';
      const titleB = b.title?.toLowerCase() || '';
      return titleA.localeCompare(titleB);
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        data: sortedItems,
        lastEvaluatedKey: response.LastEvaluatedKey
          ? encodeURIComponent(JSON.stringify(response.LastEvaluatedKey))
          : null,
        message: 'Letters fetched successfully!',
      }),
      headers,
    };
  } catch (error) {
    logger.error('Error scanning from DynamoDB: ', error);
    return new DatabaseError('Internal Server Error').build(headers);
  }
};

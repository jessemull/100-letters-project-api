import { APIGatewayProxyHandler } from 'aws-lambda';
import { DatabaseError } from '../../common/errors';
import { QueryCommand, QueryCommandInput } from '@aws-sdk/lib-dynamodb';
import { config } from '../../common/config';
import { dynamoClient, getHeaders, logger } from '../../common/util';

const { recipientTableName } = config;

export const handler: APIGatewayProxyHandler = async (event) => {
  const queryParameters = event.queryStringParameters || {};
  const limit = parseInt(queryParameters.limit || '50', 10);
  const search = queryParameters.search;

  const headers = getHeaders(event);

  const lastEvaluatedKey = queryParameters.lastEvaluatedKey
    ? JSON.parse(decodeURIComponent(queryParameters.lastEvaluatedKey))
    : undefined;

  try {
    const params: QueryCommandInput = {
      TableName: recipientTableName,
      KeyConditionExpression: 'PK begins_with :pkPrefix',
      ExpressionAttributeValues: {
        ':pkPrefix': 'recipient#',
      },
      Limit: limit,
      ExclusiveStartKey: lastEvaluatedKey,
      ScanIndexForward: true,
    };

    if (search) {
      params.KeyConditionExpression += ' AND begins_with(SK, :skPrefix)';
      params.ExpressionAttributeValues = {
        ...params.ExpressionAttributeValues,
        ':skPrefix': `LASTNAME#${search.toLowerCase()}`,
      };
    }

    const command = new QueryCommand(params);
    const result = await dynamoClient.send(command);

    return {
      statusCode: 200,
      body: JSON.stringify({
        data: result.Items || [],
        lastEvaluatedKey: result.LastEvaluatedKey
          ? encodeURIComponent(JSON.stringify(result.LastEvaluatedKey))
          : null,
        message: 'Recipients fetched successfully!',
      }),
      headers,
    };
  } catch (error) {
    logger.error('Error querying from DynamoDB: ', error);
    return new DatabaseError('Internal Server Error').build(headers);
  }
};

import { APIGatewayProxyHandler } from 'aws-lambda';
import { DatabaseError } from '../../common/errors';
import { QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
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
    let result;
    if (search) {
      const queryParams = {
        TableName: recipientTableName,
        IndexName: 'LastNameFirstNameIndex',
        KeyConditionExpression: 'lastName = :lastName',
        FilterExpression: 'begins_with(lastName, :search)',
        ExpressionAttributeValues: {
          ':lastName': search,
          ':search': search,
        },
        Limit: limit,
        ExclusiveStartKey: lastEvaluatedKey,
      };

      const command = new QueryCommand(queryParams);
      result = await dynamoClient.send(command);
    } else {
      const scanParams = {
        TableName: recipientTableName,
        Limit: limit,
        ExclusiveStartKey: lastEvaluatedKey,
      };

      const command = new ScanCommand(scanParams);
      result = await dynamoClient.send(command);
    }

    const sortedItems =
      !search && result.Items
        ? result.Items.sort((a, b) => {
            const lastNameA = a.lastName?.toLowerCase() || '';
            const lastNameB = b.lastName?.toLowerCase() || '';
            const firstNameA = a.firstName?.toLowerCase() || '';
            const firstNameB = b.firstName?.toLowerCase() || '';

            const lastNameCompare = lastNameA.localeCompare(lastNameB);
            return lastNameCompare !== 0
              ? lastNameCompare
              : firstNameA.localeCompare(firstNameB);
          })
        : result.Items || [];

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
    logger.error('Error retrieving recipients from DynamoDB: ', error);
    return new DatabaseError('Internal Server Error').build(headers);
  }
};

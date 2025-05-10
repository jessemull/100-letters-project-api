import { APIGatewayProxyHandler } from 'aws-lambda';
import { DatabaseError } from '../../common/errors';
import { Letter } from '../../types';
import { GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { config } from '../../common/config';
import { dynamoClient, getHeaders, logger } from '../../common/util';

const { correspondenceTableName, letterTableName, recipientTableName } = config;

export const handler: APIGatewayProxyHandler = async (event) => {
  const headers = getHeaders(event);
  const queryParameters = event.queryStringParameters || {};
  const limit = parseInt(queryParameters.limit || '50', 10);
  const search = queryParameters.search?.trim();

  const lastEvaluatedKey = queryParameters.lastEvaluatedKey
    ? JSON.parse(decodeURIComponent(queryParameters.lastEvaluatedKey))
    : undefined;

  try {
    const expressionAttributeValues: Record<string, unknown> = {
      ':partition': 'CORRESPONDENCE',
    };

    let keyConditionExpression = 'searchPartition = :partition';

    if (search) {
      keyConditionExpression += ' AND begins_with(title, :prefix)';
      expressionAttributeValues[':prefix'] = search;
    }

    const correspondenceCommand = new QueryCommand({
      TableName: correspondenceTableName,
      IndexName: 'TitleIndex',
      KeyConditionExpression: keyConditionExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      Limit: limit,
      ExclusiveStartKey: lastEvaluatedKey,
    });

    const correspondenceResult = await dynamoClient.send(correspondenceCommand);
    const correspondences = correspondenceResult.Items || [];

    const results = await Promise.all(
      correspondences.map(async (correspondence) => {
        const recipientParams = {
          TableName: recipientTableName,
          Key: { recipientId: correspondence.recipientId },
        };

        let recipient = null;
        try {
          const recipientCommand = new GetCommand(recipientParams);
          const recipientResult = await dynamoClient.send(recipientCommand);
          recipient = recipientResult.Item || null;
        } catch (error) {
          logger.error(
            `Error fetching recipient with ID ${correspondence.recipientId}: `,
            error,
          );
        }

        const lettersParams = {
          TableName: letterTableName,
          IndexName: 'CorrespondenceIndex',
          KeyConditionExpression: 'correspondenceId = :correspondenceId',
          ExpressionAttributeValues: {
            ':correspondenceId': correspondence.correspondenceId,
          },
        };

        let letters: Letter[] = [];
        try {
          const lettersCommand = new QueryCommand(lettersParams);
          const lettersResult = await dynamoClient.send(lettersCommand);
          letters = (lettersResult.Items as Letter[]) || [];
        } catch (error) {
          logger.error(
            `Error fetching letters for correspondence ID ${correspondence.correspondenceId}: `,
            error,
          );
        }

        return {
          ...correspondence,
          recipient,
          letters,
        };
      }),
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        data: results,
        lastEvaluatedKey:
          (correspondenceResult.Items || []).length < limit
            ? null
            : correspondenceResult.LastEvaluatedKey
              ? encodeURIComponent(
                  JSON.stringify(correspondenceResult.LastEvaluatedKey),
                )
              : null,
        message: 'Correspondences fetched successfully!',
      }),
      headers,
    };
  } catch (error) {
    logger.error('Error fetching correspondences:', error);
    return new DatabaseError('Internal Server Error').build(headers);
  }
};

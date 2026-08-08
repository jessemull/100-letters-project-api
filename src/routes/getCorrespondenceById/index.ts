import { APIGatewayProxyHandler } from 'aws-lambda';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { config } from '../../common/config';
import { dynamoClient } from '../../common/util/dynamo';
import { logger } from '../../common/util/logger';
import { getHeaders } from '../../common/util/headers';
import {
  BadRequestError,
  DatabaseError,
  NotFoundError,
} from '../../common/errors';
import { Letter } from '../../types';
import { queryAllPages } from '../../common/util/query-all';

const { correspondenceTableName, letterTableName, recipientTableName } = config;

export const handler: APIGatewayProxyHandler = async (event) => {
  const correspondenceId = event.pathParameters?.id;

  const headers = getHeaders(event);

  if (!correspondenceId) {
    return new BadRequestError('Correspondence ID is required.').build(headers);
  }

  try {
    // Step 1: Get correspondence by ID.

    const correspondenceParams = {
      TableName: correspondenceTableName,
      Key: { correspondenceId },
    };

    const correspondenceCommand = new GetCommand(correspondenceParams);
    const correspondenceResult = await dynamoClient.send(correspondenceCommand);

    const correspondence = correspondenceResult.Item;

    if (!correspondence) {
      return new NotFoundError('Correspondence not found!').build(headers);
    }

    // Step 2: Get associated recipient details.

    let recipient = null;

    if (correspondence.recipientId) {
      const recipientParams = {
        TableName: recipientTableName,
        Key: { recipientId: correspondence.recipientId },
      };

      try {
        const recipientCommand = new GetCommand(recipientParams);
        const recipientResult = await dynamoClient.send(recipientCommand);
        recipient = recipientResult.Item || null;
      } catch (error) {
        logger.error(
          `Error fetching recipient with ID ${correspondence.recipientId}: `,
          error,
        );
        return new DatabaseError('Internal Server Error').build(headers);
      }
    }

    if (recipient === null) {
      return new NotFoundError('Recipient not found!').build(headers);
    }

    // Step 3: Get associated letters (follow LastEvaluatedKey).

    let letters: Letter[] = [];

    try {
      letters = await queryAllPages<Letter>({
        TableName: letterTableName,
        IndexName: 'CorrespondenceIndex',
        KeyConditionExpression: 'correspondenceId = :correspondenceId',
        ExpressionAttributeValues: {
          ':correspondenceId': correspondence.correspondenceId,
        },
      });
    } catch (error) {
      logger.error(
        `Error fetching letters for correspondence ID ${correspondence.correspondenceId}: `,
        error,
      );
      return new DatabaseError('Internal Server Error').build(headers);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        data: {
          correspondence,
          recipient,
          letters,
        },
        message: 'Correspondence fetched successfully!',
      }),
      headers,
    };
  } catch (error) {
    logger.error('Error fetching correspondence by ID:', error);
    return new DatabaseError('Internal Server Error').build(headers);
  }
};

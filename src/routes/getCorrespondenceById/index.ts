import { APIGatewayProxyHandler } from 'aws-lambda';
import { GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { config } from '../../common/config';
import { dynamoClient, getHeaders, logger } from '../../common/util';
import {
  BadRequestError,
  DatabaseError,
  NotFoundError,
} from '../../common/errors';
import { Letter } from '../../types';

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

    // Step 3: Get associated letters.

    let letters: Letter[] = [];
    const lettersParams = {
      TableName: letterTableName,
      IndexName: 'CorrespondenceIndex',
      KeyConditionExpression: 'correspondenceId = :correspondenceId',
      ExpressionAttributeValues: {
        ':correspondenceId': correspondence.correspondenceId,
      },
    };

    try {
      const lettersCommand = new QueryCommand(lettersParams);
      const lettersResult = await dynamoClient.send(lettersCommand);
      letters = (lettersResult.Items as Letter[]) || [];
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

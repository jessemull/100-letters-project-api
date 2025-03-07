import { APIGatewayProxyHandler } from 'aws-lambda';
import { GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoClient, logger } from '../../common/util';
import {
  BadRequestError,
  DatabaseError,
  NotFoundError,
} from '../../common/errors';
import { Letter } from '../../types';

export const handler: APIGatewayProxyHandler = async (event) => {
  const correspondenceId = event.pathParameters?.id;

  if (!correspondenceId) {
    return new BadRequestError('Correspondence ID is required.').build();
  }

  try {
    // Step 1: Get correspondence by ID.

    const correspondenceParams = {
      TableName: 'OneHundredLettersCorrespondenceTable',
      Key: { correspondenceId },
    };

    const correspondenceCommand = new GetCommand(correspondenceParams);
    const correspondenceResult = await dynamoClient.send(correspondenceCommand);

    const correspondence = correspondenceResult.Item;

    if (!correspondence) {
      return new NotFoundError('Correspondence not found!').build();
    }

    // Step 2: Get associated person details.

    let person = null;
    if (correspondence.personId) {
      const personParams = {
        TableName: 'OneHundredLettersPersonTable',
        Key: { personId: correspondence.personId },
      };

      try {
        const personCommand = new GetCommand(personParams);
        const personResult = await dynamoClient.send(personCommand);
        person = personResult.Item || null;
      } catch (error) {
        logger.error(
          `Error fetching person with ID ${correspondence.personId}: `,
          error,
        );
        return new DatabaseError('Internal Server Error').build();
      }
    }

    if (person === null) {
      return new NotFoundError('Person not found!').build();
    }

    // Step 3: Get associated letters.

    let letters: Letter[] = [];
    const lettersParams = {
      TableName: 'OneHundredLettersLetterTable',
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
      return new DatabaseError('Internal Server Error').build();
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        data: {
          correspondence,
          person,
          letters,
        },
      }),
    };
  } catch (error) {
    logger.error('Error fetching correspondence by ID:', error);
    return new DatabaseError('Internal Server Error').build();
  }
};

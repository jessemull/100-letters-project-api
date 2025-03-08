import { APIGatewayProxyHandler } from 'aws-lambda';
import { BadRequestError, DatabaseError } from '../../common/errors';
import { LetterInput } from '../../types';
import { TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoClient, logger } from '../../common/util';
import { v4 as uuidv4 } from 'uuid';

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    if (!event.body) {
      return new BadRequestError('Request body is required.').build();
    }

    const { recipient, correspondence, letters } = JSON.parse(event.body);

    if (!recipient || !correspondence || !letters) {
      return new BadRequestError(
        'Recipient, correspondence, and letters are required.',
      ).build();
    }

    const recipientId = uuidv4();
    const correspondenceId = uuidv4();

    const transactItems = [
      {
        Put: {
          TableName: 'OneHundredLettersRecipientTable',
          Item: {
            recipientId,
            ...recipient,
          },
          ConditionExpression: 'attribute_not_exists(recipientId)',
        },
      },
      {
        Put: {
          TableName: 'OneHundredLettersCorrespondenceTable',
          Item: {
            correspondenceId,
            recipientId,
            ...correspondence,
          },
          ConditionExpression: 'attribute_not_exists(correspondenceId)',
        },
      },
    ];

    const letterIds: string[] = [];

    letters.forEach((letter: LetterInput) => {
      const letterId = uuidv4();
      letterIds.push(letterId);
      transactItems.push({
        Put: {
          TableName: 'OneHundredLettersLetterTable',
          Item: {
            correspondenceId,
            letterId,
            ...letter,
          },
          ConditionExpression: 'attribute_not_exists(letterId)',
        },
      });
    });

    const command = new TransactWriteCommand({ TransactItems: transactItems });
    await dynamoClient.send(command);

    return {
      statusCode: 201,
      body: JSON.stringify({
        message: 'Correspondence created successfully.',
        correspondenceId,
        recipientId,
        letterIds,
      }),
    };
  } catch (error) {
    logger.error('Error creating correspondence:', error);
    return new DatabaseError('Internal Server Error').build();
  }
};

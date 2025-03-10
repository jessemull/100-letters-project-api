import { APIGatewayProxyHandler } from 'aws-lambda';
import { BadRequestError, DatabaseError } from '../../common/errors';
import { LetterCreateInput, Letter } from '../../types';
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

    // Construct recipient, correspondence, and letter objects
    const recipientItem = { recipientId, ...recipient };
    const correspondenceItem = {
      correspondenceId,
      recipientId,
      ...correspondence,
    };

    const letterItems: Letter[] = letters.map((letter: LetterCreateInput) => ({
      letterId: uuidv4(),
      correspondenceId,
      ...letter,
    }));

    // Create transactional write items
    const transactItems = [
      {
        Put: {
          TableName: 'OneHundredLettersRecipientTable',
          Item: recipientItem,
          ConditionExpression: 'attribute_not_exists(recipientId)',
        },
      },
      {
        Put: {
          TableName: 'OneHundredLettersCorrespondenceTable',
          Item: correspondenceItem,
          ConditionExpression: 'attribute_not_exists(correspondenceId)',
        },
      },
      ...letterItems.map((letter) => ({
        Put: {
          TableName: 'OneHundredLettersLetterTable',
          Item: letter,
          ConditionExpression: 'attribute_not_exists(letterId)',
        },
      })),
    ];

    const command = new TransactWriteCommand({ TransactItems: transactItems });
    await dynamoClient.send(command);

    // Return the fully created object
    return {
      statusCode: 201,
      body: JSON.stringify({
        data: {
          correspondence: correspondenceItem,
          recipient: recipientItem,
          letters: letterItems,
        },
      }),
    };
  } catch (error) {
    logger.error('Error creating correspondence:', error);
    return new DatabaseError('Internal Server Error').build();
  }
};

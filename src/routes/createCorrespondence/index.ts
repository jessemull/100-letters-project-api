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

    const { person, correspondence, letters } = JSON.parse(event.body);

    if (!person || !correspondence || !letters) {
      return new BadRequestError(
        'Person, correspondence, and letters are required.',
      ).build();
    }

    const personId = uuidv4();
    const correspondenceId = uuidv4();

    const transactItems = [
      {
        Put: {
          TableName: 'OneHundredLettersPersonTable',
          Item: {
            personId,
            ...person,
          },
          ConditionExpression: 'attribute_not_exists(personId)',
        },
      },
      {
        Put: {
          TableName: 'OneHundredLettersCorrespondenceTable',
          Item: {
            correspondenceId,
            personId,
            ...correspondence,
          },
          ConditionExpression: 'attribute_not_exists(correspondenceId)',
        },
      },
    ];

    letters.forEach((letter: LetterInput) => {
      transactItems.push({
        Put: {
          TableName: 'OneHundredLettersLetterTable',
          Item: {
            correspondenceId,
            letterId: uuidv4(),
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
        personId,
      }),
    };
  } catch (error) {
    logger.error('Error creating correspondence:', error);
    return new DatabaseError('Internal Server Error').build();
  }
};

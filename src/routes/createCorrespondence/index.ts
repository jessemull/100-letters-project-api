import { APIGatewayProxyHandler } from 'aws-lambda';
import { BadRequestError, DatabaseError } from '../../common/errors';
import { LetterCreateInput, Letter } from '../../types';
import { TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { config } from '../../common/config';
import { dynamoClient, getHeaders, logger } from '../../common/util';
import { v4 as uuidv4 } from 'uuid';

const { correspondenceTableName, letterTableName, recipientTableName } = config;

export const handler: APIGatewayProxyHandler = async (event) => {
  const headers = getHeaders(event);

  try {
    // Request body validation is handled by the API gateway model.

    if (!event.body) {
      return new BadRequestError('Request body is required.').build(headers);
    }

    const { recipient, correspondence, letters } = JSON.parse(event.body);

    const { reason, status, title } = correspondence;

    const recipientId = uuidv4();
    const correspondenceId = uuidv4();

    const recipientItem = {
      recipientId,
      searchPartition: 'RECIPIENT',
      ...recipient,
    };

    const correspondenceItem = {
      correspondenceId,
      recipientId,
      reason,
      searchPartition: 'CORRESPONDENCE',
      status,
      title,
    };

    const letterItems: Letter[] = letters.map((letter: LetterCreateInput) => ({
      ...letter,
      correspondenceId,
      letterId: uuidv4(),
      searchPartition: 'LETTER',
    }));

    const transactItems = [
      {
        Put: {
          TableName: recipientTableName,
          Item: recipientItem,
          ConditionExpression: 'attribute_not_exists(recipientId)',
        },
      },
      {
        Put: {
          TableName: correspondenceTableName,
          Item: correspondenceItem,
          ConditionExpression: 'attribute_not_exists(correspondenceId)',
        },
      },
      ...letterItems.map((letter) => ({
        Put: {
          TableName: letterTableName,
          Item: letter,
          ConditionExpression: 'attribute_not_exists(letterId)',
        },
      })),
    ];

    const command = new TransactWriteCommand({ TransactItems: transactItems });
    await dynamoClient.send(command);

    return {
      statusCode: 201,
      body: JSON.stringify({
        data: {
          correspondence: correspondenceItem,
          recipient: recipientItem,
          letters: letterItems,
        },
        message: 'Correspondence created successfully!',
      }),
      headers,
    };
  } catch (error) {
    logger.error('Error creating correspondence:', error);
    return new DatabaseError('Internal Server Error').build(headers);
  }
};

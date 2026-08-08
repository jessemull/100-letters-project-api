import { APIGatewayProxyHandler } from 'aws-lambda';
import { BadRequestError, DatabaseError } from '../../common/errors';
import {
  LetterCreateInput,
  Letter,
  CorrespondenceCreateInput,
} from '../../types';
import { TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { config } from '../../common/config';
import { dynamoClient } from '../../common/util/dynamo';
import { logger } from '../../common/util/logger';
import { getHeaders } from '../../common/util/headers';
import { DYNAMO_TRANSACT_MAX_ITEMS } from '../../common/util/query-all';
import { randomUUID } from 'crypto';

const { correspondenceTableName, letterTableName, recipientTableName } = config;

export const handler: APIGatewayProxyHandler = async (event) => {
  const headers = getHeaders(event);

  try {
    // Request body validation is handled by the API gateway model.

    if (!event.body) {
      return new BadRequestError('Request body is required.').build(headers);
    }

    let parsedBody: CorrespondenceCreateInput;
    try {
      parsedBody = JSON.parse(event.body);
    } catch {
      return new BadRequestError('Invalid JSON in request body.').build(
        headers,
      );
    }

    const { recipient, correspondence, letters } = parsedBody;

    const { reason, status, title } = correspondence;

    const now = new Date().toISOString();
    const recipientId = randomUUID();
    const correspondenceId = randomUUID();

    const recipientItem = {
      recipientId,
      searchPartition: 'RECIPIENT',
      createdAt: now,
      updatedAt: now,
      ...recipient,
    };

    const correspondenceItem = {
      correspondenceId,
      recipientId,
      reason,
      searchPartition: 'CORRESPONDENCE',
      status,
      title,
      createdAt: now,
      updatedAt: now,
    };

    const letterItems: Letter[] = letters.map((letter: LetterCreateInput) => ({
      ...letter,
      correspondenceId,
      letterId: randomUUID(),
      searchPartition: 'LETTER',
      createdAt: now,
      updatedAt: now,
    }));

    // recipient + correspondence Puts, plus one Put per letter
    if (2 + letterItems.length > DYNAMO_TRANSACT_MAX_ITEMS) {
      return new BadRequestError(
        `Too many letters for a single transaction (max ${DYNAMO_TRANSACT_MAX_ITEMS - 2}).`,
      ).build(headers);
    }

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
          ConditionExpression: 'attribute_not_exists(correspondenceId)',
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
    if (
      error instanceof Error &&
      (error.name === 'ConditionalCheckFailedException' ||
        error.name === 'TransactionCanceledException')
    ) {
      return new BadRequestError(
        'One or more items already exist or the create transaction was canceled.',
      ).build(headers);
    }
    logger.error('Error creating correspondence:', error);
    return new DatabaseError('Internal Server Error').build(headers);
  }
};

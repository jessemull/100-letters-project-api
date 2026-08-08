import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import {
  BadRequestError,
  DatabaseError,
  NotFoundError,
} from '../../common/errors';
import {
  TransactWriteCommand,
  GetCommand,
  type TransactWriteCommandInput,
} from '@aws-sdk/lib-dynamodb';
import { config } from '../../common/config';
import { dynamoClient } from '../../common/util/dynamo';
import { logger } from '../../common/util/logger';
import { getHeaders } from '../../common/util/headers';
import {
  DYNAMO_TRANSACT_MAX_ITEMS,
  queryAllPages,
} from '../../common/util/query-all';

const { correspondenceTableName, letterTableName, recipientTableName } = config;

type TransactWriteItem = NonNullable<
  TransactWriteCommandInput['TransactItems']
>[number];

export const handler: APIGatewayProxyHandler = async (
  event,
): Promise<APIGatewayProxyResult> => {
  const correspondenceId = event.pathParameters?.id;

  const headers = getHeaders(event);

  if (!correspondenceId) {
    return new BadRequestError('Correspondence ID is required.').build(headers);
  }

  const getCorrespondenceParams = {
    TableName: correspondenceTableName,
    Key: { correspondenceId },
  };

  try {
    // Step 1: Get correspondence data.

    const correspondenceData = await dynamoClient.send(
      new GetCommand(getCorrespondenceParams),
    );

    if (!correspondenceData.Item) {
      return new NotFoundError('Correspondence not found.').build(headers);
    }

    // Step 2: Delete correspondence.

    const transactItems: TransactWriteItem[] = [
      {
        Delete: {
          TableName: correspondenceTableName as string,
          Key: { correspondenceId },
        },
      },
    ];

    // Step 3: Get and delete all letters associated with the correspondence.
    // Prefer the base table: PK is correspondenceId (HASH) + letterId (RANGE).
    // CorrespondenceIndex is a GSI on the same partition key and is not needed here.

    const letterItems = await queryAllPages({
      TableName: letterTableName,
      KeyConditionExpression: 'correspondenceId = :correspondenceId',
      ExpressionAttributeValues: {
        ':correspondenceId': correspondenceId,
      },
      ProjectionExpression: 'correspondenceId, letterId',
    });

    const letterIds: string[] = [];

    if (letterItems.length > 0) {
      letterItems.forEach((letter) => {
        letterIds.push(letter.letterId as string);
        transactItems.push({
          Delete: {
            TableName: letterTableName as string,
            Key: {
              correspondenceId: letter.correspondenceId as string,
              letterId: letter.letterId as string,
            },
          },
        });
      });
    }

    // Step 4: Get and delete the recipient associated with the correspondence.

    const recipientId = correspondenceData.Item.recipientId as
      string | undefined;

    if (recipientId) {
      transactItems.push({
        Delete: {
          TableName: recipientTableName as string,
          Key: { recipientId },
        },
      });
    }

    if (transactItems.length > DYNAMO_TRANSACT_MAX_ITEMS) {
      return new BadRequestError(
        `Too many items to delete in a single transaction (max ${DYNAMO_TRANSACT_MAX_ITEMS}).`,
      ).build(headers);
    }

    // Step 5: Perform the transaction.

    const command = new TransactWriteCommand({
      TransactItems: transactItems,
    });

    await dynamoClient.send(command);

    return {
      statusCode: 200,
      body: JSON.stringify({
        data: {
          recipientId,
          correspondenceId,
          letterIds,
        },
        message: 'Correspondence, recipient and letters deleted successfully!',
      }),
      headers,
    };
  } catch (error) {
    logger.error('Error performing transaction: ', error);
    return new DatabaseError('Internal Server Error').build(headers);
  }
};

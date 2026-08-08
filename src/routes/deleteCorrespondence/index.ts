import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import {
  BadRequestError,
  DatabaseError,
  NotFoundError,
} from '../../common/errors';
import { Letter } from '../../types';
import {
  TransactWriteCommand,
  QueryCommand,
  GetCommand,
  type TransactWriteCommandInput,
} from '@aws-sdk/lib-dynamodb';
import { config } from '../../common/config';
import { dynamoClient } from '../../common/util/dynamo';
import { logger } from '../../common/util/logger';
import { getHeaders } from '../../common/util/headers';

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

    const queryParams = {
      TableName: letterTableName,
      KeyConditionExpression: 'correspondenceId = :correspondenceId',
      ExpressionAttributeValues: {
        ':correspondenceId': correspondenceId,
      },
      ProjectionExpression: 'correspondenceId, letterId',
    };

    const letterData = await dynamoClient.send(new QueryCommand(queryParams));

    const letterIds: string[] = [];

    if (letterData.Items && letterData.Items.length > 0) {
      const letters: Letter[] = letterData.Items as Letter[];

      letters.forEach((letter) => {
        letterIds.push(letter.letterId);
        transactItems.push({
          Delete: {
            TableName: letterTableName as string,
            Key: {
              correspondenceId: letter.correspondenceId,
              letterId: letter.letterId,
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

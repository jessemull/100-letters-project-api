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
} from '@aws-sdk/lib-dynamodb';
import { dynamoClient, logger } from '../../common/util';

export const handler: APIGatewayProxyHandler = async (
  event,
): Promise<APIGatewayProxyResult> => {
  const correspondenceId = event.pathParameters?.id;

  if (!correspondenceId) {
    return new BadRequestError('Correspondence ID is required.').build();
  }

  const getCorrespondenceParams = {
    TableName: 'OneHundredLettersCorrespondenceTable',
    Key: { correspondenceId },
  };

  try {
    // Step 1: Get correspondence data.

    const correspondenceData = await dynamoClient.send(
      new GetCommand(getCorrespondenceParams),
    );

    if (!correspondenceData.Item) {
      return new NotFoundError('Correspondence not found.').build();
    }

    // Step 2: Delete correspondence.

    const deleteCorrespondenceParams = {
      TableName: 'OneHundredLettersCorrespondenceTable',
      Key: { correspondenceId },
    };

    const transactItems: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Delete: { TableName: string; Key: Record<string, any> | undefined };
    }[] = [
      {
        Delete: deleteCorrespondenceParams,
      },
    ];

    // Step 3: Get and delete all letters associated with the correspondence.

    const queryParams = {
      TableName: 'OneHundredLettersLetterTable',
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
        letterIds.push(letter.letterId); // Collect letterIds
        const deleteLetterParams = {
          TableName: 'OneHundredLettersLetterTable',
          Key: {
            correspondenceId: letter.correspondenceId,
            letterId: letter.letterId,
          },
        };
        transactItems.push({ Delete: deleteLetterParams });
      });
    }

    // Step 4: Get and delete the recipient associated with the correspondence.

    const recipientId = correspondenceData.Item.recipientId;

    if (recipientId) {
      const deleteRecipientParams = {
        TableName: 'OneHundredLettersRecipientTable',
        Key: { recipientId },
      };
      transactItems.push({ Delete: deleteRecipientParams });
    }

    // Step 5: Perform the transaction.

    const command = new TransactWriteCommand({
      TransactItems: transactItems,
    });

    await dynamoClient.send(command);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Successfully deleted correspondence, recipient, and letters.',
        recipientId,
        correspondenceId,
        letterIds,
      }),
    };
  } catch (error) {
    logger.error('Error performing transaction: ', error);
    return new DatabaseError('Internal Server Error').build();
  }
};

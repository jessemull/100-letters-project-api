import { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { DatabaseError, NotFoundError } from '../../common/errors';
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
    return new NotFoundError('Correspondence ID is required.').build();
  }

  const getCorrespondenceParams = {
    TableName: 'OneHundredLettersCorrespondenceTable',
    Key: { correspondenceId },
  };

  let personId;
  try {
    const correspondenceData = await dynamoClient.send(
      new GetCommand(getCorrespondenceParams),
    );

    if (!correspondenceData.Item) {
      return new NotFoundError('Correspondence not found.').build();
    }

    personId = correspondenceData.Item.personId;
  } catch (error) {
    logger.error('Error retrieving correspondence data: ', error);
    return new DatabaseError('Internal Server Error').build();
  }

  const deleteCorrespondenceParams = {
    TableName: 'OneHundredLettersCorrespondenceTable',
    Key: { correspondenceId },
  };

  const deletePersonParams = {
    TableName: 'OneHundredLettersPersonTable',
    Key: { personId },
  };

  const transactItems: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Delete: { TableName: string; Key: Record<string, any> | undefined };
  }[] = [
    {
      Delete: deleteCorrespondenceParams,
    },
    {
      Delete: deletePersonParams,
    },
  ];

  try {
    const queryParams = {
      TableName: 'OneHundredLettersLetterTable',
      IndexName: 'CorrespondenceIndex', // Ensure this matches your GSI if applicable
      KeyConditionExpression: 'correspondenceId = :correspondenceId',
      ExpressionAttributeValues: {
        ':correspondenceId': correspondenceId,
      },
      ProjectionExpression: 'correspondenceId, letterId',
    };

    const letterData = await dynamoClient.send(new QueryCommand(queryParams));

    if (letterData.Items && letterData.Items.length > 0) {
      const letters: Letter[] = letterData.Items as Letter[];

      letters.forEach((letter) => {
        const deleteLetterParams = {
          TableName: 'OneHundredLettersLetterTable',
          Key: {
            correspondenceId: letter.correspondenceId, // Ensure this matches the partition key
            letterId: letter.letterId, // Ensure this matches the sort key
          },
        };
        transactItems.push({ Delete: deleteLetterParams });
      });
    }

    const command = new TransactWriteCommand({
      TransactItems: transactItems,
    });

    await dynamoClient.send(command);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Successfully deleted correspondence, person, and letters.',
      }),
    };
  } catch (error) {
    logger.error('Error performing transaction: ', error);
    return new DatabaseError('Internal Server Error').build();
  }
};

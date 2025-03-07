import { APIGatewayProxyHandler } from 'aws-lambda';
import { DatabaseError, NotFoundError } from '../../common/errors';
import { Letter } from '../../types';
import {
  TransactWriteCommand,
  QueryCommand,
  GetCommand,
} from '@aws-sdk/lib-dynamodb'; // Import GetCommand
import { dynamoClient, logger } from '../../common/util';

export const handler: APIGatewayProxyHandler = async (event) => {
  const correspondenceId = event.pathParameters?.id;

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

  const transactItems: { Delete: { TableName: string; Key: unknown } }[] = [
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
      KeyConditionExpression: 'correspondenceId = :correspondenceId',
      ExpressionAttributeValues: {
        ':correspondenceId': correspondenceId,
      },
    };

    const letterData = await dynamoClient.send(new QueryCommand(queryParams));

    if (letterData.Items && letterData.Items.length > 0) {
      const letters: Letter[] = letterData.Items as Letter[];

      letters.forEach((letter) => {
        const deleteLetterParams = {
          TableName: 'OneHundredLettersLetterTable',
          Key: { letterId: letter.letterId },
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

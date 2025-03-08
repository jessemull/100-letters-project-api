import { APIGatewayProxyHandler } from 'aws-lambda';
import { ScanCommand, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoClient, logger } from '../../common/util';
import { DatabaseError } from '../../common/errors';
import { Letter } from '../../types';

export const handler: APIGatewayProxyHandler = async () => {
  try {
    const correspondenceParams = {
      TableName: 'OneHundredLettersCorrespondenceTable',
    };

    const correspondenceCommand = new ScanCommand(correspondenceParams);
    const correspondenceResult = await dynamoClient.send(correspondenceCommand);
    const correspondences = correspondenceResult.Items || [];

    const results = await Promise.all(
      correspondences.map(async (correspondence) => {
        const recipientParams = {
          TableName: 'OneHundredLettersRecipientTable',
          Key: { recipientId: correspondence.recipientId },
        };

        let recipient = null;
        try {
          const recipientCommand = new GetCommand(recipientParams);
          const recipientResult = await dynamoClient.send(recipientCommand);
          recipient = recipientResult.Item || null;
        } catch (error) {
          logger.error(
            `Error fetching recipient with ID ${correspondence.recipientId}: `,
            error,
          );
        }

        const lettersParams = {
          TableName: 'OneHundredLettersLetterTable',
          IndexName: 'CorrespondenceIndex',
          KeyConditionExpression: 'correspondenceId = :correspondenceId',
          ExpressionAttributeValues: {
            ':correspondenceId': correspondence.correspondenceId,
          },
        };

        let letters: Letter[] = [];
        try {
          const lettersCommand = new QueryCommand(lettersParams);
          const lettersResult = await dynamoClient.send(lettersCommand);
          letters = (lettersResult.Items as Letter[]) || [];
        } catch (error) {
          logger.error(
            `Error fetching letters for correspondence ID ${correspondence.correspondenceId}: `,
            error,
          );
        }
        return {
          ...correspondence,
          recipient,
          letters,
        };
      }),
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ data: results }),
    };
  } catch (error) {
    logger.error('Error fetching correspondences:', error);
    return new DatabaseError('Internal Server Error').build();
  }
};

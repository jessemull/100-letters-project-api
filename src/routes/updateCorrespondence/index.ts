import { APIGatewayProxyHandler } from 'aws-lambda';
import { BadRequestError, DatabaseError } from '../../common/errors';
import { LetterUpdateInput, UpdateParams, TransactionItem } from '../../types';
import { TransactWriteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoClient, logger } from '../../common/util';

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    if (!event.body) {
      return new BadRequestError('Request body is required.').build();
    }

    const correspondenceId = event.pathParameters?.id;

    if (!correspondenceId) {
      return new BadRequestError(
        'Correspondence ID is required in the path parameters.',
      ).build();
    }

    const { recipient, correspondence, letters } = JSON.parse(event.body);

    if (!recipient || !correspondence || !letters) {
      return new BadRequestError(
        'Recipient, correspondence, and letters are required.',
      ).build();
    }

    const { reason } = correspondence;
    if (!reason || !reason.description || !reason.domain || !reason.impact) {
      return new BadRequestError(
        'Reason must include description, domain, and valid impact.',
      ).build();
    }

    const transactItems: TransactionItem[] = [];

    const correspondenceUpdateParams: UpdateParams = {
      TableName: 'OneHundredLettersCorrespondenceTable',
      Key: { correspondenceId },
      UpdateExpression: 'SET #reason = :reason',
      ExpressionAttributeNames: {
        '#reason': 'reason',
      },
      ExpressionAttributeValues: {
        ':reason': reason,
      },
      ReturnValues: 'ALL_NEW',
    };

    transactItems.push({ Update: correspondenceUpdateParams });

    const recipientUpdateParams: UpdateParams = {
      TableName: 'OneHundredLettersRecipientTable',
      Key: { recipientId: recipient.recipientId },
      UpdateExpression:
        'SET #firstName = :firstName, #lastName = :lastName, #address = :address',
      ExpressionAttributeNames: {
        '#firstName': 'firstName',
        '#lastName': 'lastName',
        '#address': 'address',
      },
      ExpressionAttributeValues: {
        ':firstName': recipient.firstName,
        ':lastName': recipient.lastName,
        ':address': recipient.address,
      },
      ReturnValues: 'ALL_NEW',
    };

    transactItems.push({ Update: recipientUpdateParams });

    const existingLettersCommand = new QueryCommand({
      TableName: 'OneHundredLettersLetterTable',
      IndexName: 'CorrespondenceIndex',
      KeyConditionExpression: 'correspondenceId = :correspondenceId',
      ExpressionAttributeValues: { ':correspondenceId': correspondenceId },
    });

    const existingLettersResult = await dynamoClient.send(
      existingLettersCommand,
    );
    const existingLetterIds = new Set(
      existingLettersResult.Items?.map((l) => l.letterId),
    );
    const incomingLetterIds = new Set(
      letters.map((letter: LetterUpdateInput) => letter.letterId),
    );

    letters.forEach((letter: LetterUpdateInput) => {
      const { letterId, ...letterData } = letter;

      const letterUpdateParams: UpdateParams = {
        TableName: 'OneHundredLettersLetterTable',
        Key: { correspondenceId, letterId },
        UpdateExpression:
          'SET #date = :date, #imageURL = :imageURL, #method = :method, #status = :status, #text = :text, #title = :title, #type = :type',
        ExpressionAttributeNames: {
          '#date': 'date',
          '#imageURL': 'imageURL',
          '#method': 'method',
          '#status': 'status',
          '#text': 'text',
          '#title': 'title',
          '#type': 'type',
        },
        ExpressionAttributeValues: {
          ':date': letterData.date,
          ':imageURL': letterData.imageURL,
          ':method': letterData.method,
          ':status': letterData.status,
          ':text': letterData.text,
          ':title': letterData.title,
          ':type': letterData.type,
        },
        ReturnValues: 'ALL_NEW',
      };

      transactItems.push({ Update: letterUpdateParams });
    });

    existingLetterIds.forEach((letterId) => {
      if (!incomingLetterIds.has(letterId)) {
        transactItems.push({
          Delete: {
            TableName: 'OneHundredLettersLetterTable',
            Key: { correspondenceId, letterId },
          },
        });
      }
    });

    const command = new TransactWriteCommand({ TransactItems: transactItems });
    await dynamoClient.send(command);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Correspondence updated successfully.' }),
    };
  } catch (error) {
    logger.error('Error updating correspondence: ', error);
    return new DatabaseError('Internal Server Error').build();
  }
};

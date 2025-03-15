import { APIGatewayProxyHandler } from 'aws-lambda';
import { BadRequestError, DatabaseError } from '../../common/errors';
import { LetterUpdateInput, TransactionItem } from '../../types';
import { TransactWriteCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoClient, logger } from '../../common/util';

// Request body validation is handled by the API gateway model.

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const correspondenceId = event.pathParameters?.id;

    if (!correspondenceId) {
      return new BadRequestError(
        'Correspondence ID is required in the path parameters.',
      ).build();
    }

    if (!event.body) {
      return new BadRequestError('Request body is required.').build();
    }

    const { recipient, correspondence, letters } = JSON.parse(event.body);

    const { reason, status, title } = correspondence;

    const transactItems: TransactionItem[] = [];
    const letterIds: string[] = [];

    const recipientUpdateExpressionParts: string[] = [
      '#firstName = :firstName',
      '#lastName = :lastName',
      '#address = :address',
    ];

    const recipientExpressionAttributeValues: { [key: string]: unknown } = {
      ':firstName': recipient.firstName,
      ':lastName': recipient.lastName,
      ':address': recipient.address,
    };

    const recipientExpressionAttributeNames: { [key: string]: string } = {
      '#firstName': 'firstName',
      '#lastName': 'lastName',
      '#address': 'address',
    };

    if (recipient.description) {
      recipientUpdateExpressionParts.push('#description = :description');
      recipientExpressionAttributeValues[':description'] =
        recipient.description;
      recipientExpressionAttributeNames['#description'] = 'description';
    }

    if (recipient.occupation) {
      recipientUpdateExpressionParts.push('#occupation = :occupation');
      recipientExpressionAttributeValues[':occupation'] = recipient.occupation;
      recipientExpressionAttributeNames['#occupation'] = 'occupation';
    }

    if (recipient.organization) {
      recipientUpdateExpressionParts.push('#organization = :organization');
      recipientExpressionAttributeValues[':organization'] =
        recipient.organization;
      recipientExpressionAttributeNames['#organization'] = 'organization';
    }

    transactItems.push({
      Update: {
        TableName: 'OneHundredLettersRecipientTable',
        Key: { recipientId: recipient.recipientId },
        UpdateExpression: `SET ${recipientUpdateExpressionParts.join(', ')}`,
        ExpressionAttributeNames: recipientExpressionAttributeNames,
        ExpressionAttributeValues: recipientExpressionAttributeValues,
      },
    });

    transactItems.push({
      Update: {
        TableName: 'OneHundredLettersCorrespondenceTable',
        Key: { correspondenceId },
        UpdateExpression:
          'SET #reason = :reason, #status = :status, #title = :title',
        ExpressionAttributeNames: {
          '#reason': 'reason',
        },
        ExpressionAttributeValues: {
          ':reason': reason,
          ':status': status,
          ':title': title,
        },
      },
    });

    letters.forEach((letter: LetterUpdateInput) => {
      const { letterId, ...letterData } = letter;

      const letterUpdateExpressionParts: string[] = [
        '#date = :date',
        '#imageURLs = :imageURLs',
        '#method = :method',
        '#status = :status',
        '#text = :text',
        '#title = :title',
        '#type = :type',
      ];

      const letterExpressionAttributeValues: { [key: string]: unknown } = {
        ':date': letterData.date,
        ':imageURLs': letterData.imageURLs,
        ':method': letterData.method,
        ':status': letterData.status,
        ':text': letterData.text,
        ':title': letterData.title,
        ':type': letterData.type,
      };

      const letterExpressionAttributeNames: { [key: string]: string } = {
        '#date': 'date',
        '#imageURLs': 'imageURLs',
        '#method': 'method',
        '#status': 'status',
        '#text': 'text',
        '#title': 'title',
        '#type': 'type',
      };

      if (letterData.description) {
        letterUpdateExpressionParts.push('#description = :description');
        letterExpressionAttributeValues[':description'] =
          letterData.description;
        letterExpressionAttributeNames['#description'] = 'description';
      }

      if (letterData.receivedAt) {
        letterUpdateExpressionParts.push('#receivedAt = :receivedAt');
        letterExpressionAttributeValues[':receivedAt'] = letterData.receivedAt;
        letterExpressionAttributeNames['#receivedAt'] = 'receivedAt';
      }

      if (letterData.sentAt) {
        letterUpdateExpressionParts.push('#sentAt = :sentAt');
        letterExpressionAttributeValues[':sentAt'] = letterData.sentAt;
        letterExpressionAttributeNames['#sentAt'] = 'sentAt';
      }

      transactItems.push({
        Update: {
          TableName: 'OneHundredLettersLetterTable',
          Key: { correspondenceId, letterId },
          UpdateExpression: `SET ${letterUpdateExpressionParts.join(', ')}`,
          ExpressionAttributeNames: letterExpressionAttributeNames,
          ExpressionAttributeValues: letterExpressionAttributeValues,
        },
      });

      letterIds.push(letterId);
    });

    const command = new TransactWriteCommand({ TransactItems: transactItems });
    await dynamoClient.send(command);

    const correspondenceData = await dynamoClient.send(
      new GetCommand({
        TableName: 'OneHundredLettersCorrespondenceTable',
        Key: { correspondenceId },
      }),
    );

    const recipientData = await dynamoClient.send(
      new GetCommand({
        TableName: 'OneHundredLettersRecipientTable',
        Key: { recipientId: recipient.recipientId },
      }),
    );

    const letterDataPromises = letterIds.map((letterId) =>
      dynamoClient.send(
        new GetCommand({
          TableName: 'OneHundredLettersLetterTable',
          Key: { correspondenceId, letterId },
        }),
      ),
    );

    const lettersData = await Promise.all(letterDataPromises);
    const lettersList = lettersData
      .map((response) => response.Item)
      .filter(Boolean);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Correspondence updated successfully.',
        data: {
          correspondence: correspondenceData.Item,
          recipient: recipientData.Item,
          letters: lettersList,
        },
      }),
    };
  } catch (error) {
    logger.error('Error updating correspondence: ', error);
    return new DatabaseError('Internal Server Error').build();
  }
};

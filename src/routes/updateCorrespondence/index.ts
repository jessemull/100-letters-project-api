import { APIGatewayProxyHandler } from 'aws-lambda';
import { BadRequestError, DatabaseError } from '../../common/errors';
import { LetterInput, TransactionItem } from '../../types';
import { TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoClient, logger } from '../../common/util';
import { v4 as uuidv4 } from 'uuid';

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
        UpdateExpression: 'SET #reason = :reason',
        ExpressionAttributeNames: {
          '#reason': 'reason',
        },
        ExpressionAttributeValues: {
          ':reason': correspondence.reason,
        },
      },
    });

    letters.forEach((letter: LetterInput) => {
      const { letterId, ...letterData } = letter;

      const letterUpdateExpressionParts: string[] = [
        '#date = :date',
        '#imageURL = :imageURL',
        '#method = :method',
        '#status = :status',
        '#text = :text',
        '#title = :title',
        '#type = :type',
      ];
      const letterExpressionAttributeValues: { [key: string]: unknown } = {
        ':date': letterData.date,
        ':imageURL': letterData.imageURL,
        ':method': letterData.method,
        ':status': letterData.status,
        ':text': letterData.text,
        ':title': letterData.title,
        ':type': letterData.type,
      };

      const letterExpressionAttributeNames: { [key: string]: string } = {
        '#date': 'date',
        '#imageURL': 'imageURL',
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

      if (letterId) {
        transactItems.push({
          Update: {
            TableName: 'OneHundredLettersLetterTable',
            Key: { correspondenceId, letterId } as {
              correspondenceId: string;
              letterId: string;
            },
            UpdateExpression: `SET ${letterUpdateExpressionParts.join(', ')}`,
            ExpressionAttributeNames: letterExpressionAttributeNames,
            ExpressionAttributeValues: letterExpressionAttributeValues,
          },
        });
        letterIds.push(letterId);
      } else {
        const newLetterId = uuidv4();
        transactItems.push({
          Put: {
            TableName: 'OneHundredLettersLetterTable',
            Item: {
              correspondenceId,
              letterId: newLetterId,
              ...letterData,
            },
            ConditionExpression: 'attribute_not_exists(letterId)',
          },
        });
        letterIds.push(newLetterId);
      }
    });

    const command = new TransactWriteCommand({ TransactItems: transactItems });
    await dynamoClient.send(command);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Correspondence updated successfully.',
        correspondenceId,
        recipientId: recipient.recipientId,
        letterIds,
      }),
    };
  } catch (error) {
    logger.error('Error updating correspondence: ', error);
    return new DatabaseError('Internal Server Error').build();
  }
};

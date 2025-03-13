import { APIGatewayProxyHandler } from 'aws-lambda';
import { BadRequestError, DatabaseError } from '../../common/errors';
import { LetterUpdateInput, TransactionItem } from '../../types';
import { TransactWriteCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
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

    const { reason } = correspondence;

    if (!reason || !reason.description || !reason.domain || !reason.impact) {
      return new BadRequestError(
        'Reason must include description, domain, and valid impact.',
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

    if (recipient.description !== undefined) {
      recipientUpdateExpressionParts.push('#description = :description');
      recipientExpressionAttributeValues[':description'] =
        recipient.description;
      recipientExpressionAttributeNames['#description'] = 'description';
    } else {
      recipientUpdateExpressionParts.push('REMOVE #description');
    }

    if (recipient.occupation !== undefined) {
      recipientUpdateExpressionParts.push('#occupation = :occupation');
      recipientExpressionAttributeValues[':occupation'] = recipient.occupation;
      recipientExpressionAttributeNames['#occupation'] = 'occupation';
    } else {
      recipientUpdateExpressionParts.push('REMOVE #occupation');
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
          ':reason': reason,
        },
      },
    });

    letters.forEach((letter: LetterUpdateInput) => {
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

      if (letterData.description !== undefined) {
        letterUpdateExpressionParts.push('#description = :description');
        letterExpressionAttributeValues[':description'] =
          letterData.description;
        letterExpressionAttributeNames['#description'] = 'description';
      } else {
        letterUpdateExpressionParts.push('REMOVE #description');
      }

      if (letterId) {
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

    logger.info(transactItems);

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

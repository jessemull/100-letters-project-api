import { APIGatewayProxyHandler } from 'aws-lambda';
import { BadRequestError, DatabaseError } from '../../common/errors';
import { LetterUpdateInput, UpdateParams, TransactionItem } from '../../types';
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

    let recipientRemoveExpressions: string[] = [];

    if (recipient.description === undefined) {
      recipientRemoveExpressions.push('#description');
      recipientUpdateParams.ExpressionAttributeNames['#description'] =
        'description';
    } else {
      recipientUpdateParams.UpdateExpression += ', #description = :description';
      recipientUpdateParams.ExpressionAttributeValues[':description'] =
        recipient.description;
      recipientUpdateParams.ExpressionAttributeNames['#description'] =
        'description';
    }

    if (recipient.occupation === undefined) {
      recipientRemoveExpressions.push('#occupation');
      recipientUpdateParams.ExpressionAttributeNames['#occupation'] =
        'occupation';
    } else {
      recipientUpdateParams.UpdateExpression += ', #occupation = :occupation';
      recipientUpdateParams.ExpressionAttributeValues[':occupation'] =
        recipient.occupation;
      recipientUpdateParams.ExpressionAttributeNames['#occupation'] =
        'occupation';
    }

    if (recipientRemoveExpressions.length > 0) {
      recipientUpdateParams.UpdateExpression +=
        ' REMOVE ' + recipientRemoveExpressions.join(', ');
    }

    transactItems.push({
      Update: recipientUpdateParams,
    });

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

    transactItems.push({
      Update: correspondenceUpdateParams,
    });

    letters.forEach((letter: LetterUpdateInput) => {
      const { letterId, ...letterData } = letter;
      let letterUpdateParams: TransactionItem | UpdateParams;
      if (letterId) {
        letterUpdateParams = {
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

        if (letterData.description !== undefined) {
          letterUpdateParams.UpdateExpression +=
            ', #description = :description';
          letterUpdateParams.ExpressionAttributeValues[':description'] =
            letterData.description;
          letterUpdateParams.ExpressionAttributeNames['#description'] =
            'description';
        } else {
          letterUpdateParams.UpdateExpression += ' REMOVE #description';
        }
      } else {
        letterUpdateParams = {
          Put: {
            TableName: 'OneHundredLettersLetterTable',
            Item: {
              correspondenceId,
              letterId: uuidv4(),
              ...letterData,
            },
            ConditionExpression: 'attribute_not_exists(letterId)',
          },
        };
        transactItems.push(letterUpdateParams);
      }
    });

    logger.info('Transaction Items:', transactItems);

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

    const letterDataPromises = letters.map((letter: LetterUpdateInput) =>
      dynamoClient.send(
        new GetCommand({
          TableName: 'OneHundredLettersLetterTable',
          Key: { correspondenceId, letterId: letter.letterId },
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

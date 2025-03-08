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

    const { person, correspondence, letters } = JSON.parse(event.body);

    if (!person || !correspondence || !letters) {
      return new BadRequestError(
        'Person, correspondence, and letters are required.',
      ).build();
    }

    const transactItems: TransactionItem[] = [];
    const letterIds: string[] = [];

    const personUpdateExpressionParts: string[] = [
      '#firstName = :firstName',
      '#lastName = :lastName',
      '#address = :address',
    ];

    const personExpressionAttributeValues: { [key: string]: unknown } = {
      ':firstName': person.firstName,
      ':lastName': person.lastName,
      ':address': person.address,
    };

    if (person.description) {
      personUpdateExpressionParts.push('#description = :description');
      personExpressionAttributeValues[':description'] = person.description;
    }

    if (person.occupation) {
      personUpdateExpressionParts.push('#occupation = :occupation');
      personExpressionAttributeValues[':occupation'] = person.occupation;
    }

    transactItems.push({
      Update: {
        TableName: 'OneHundredLettersPersonTable',
        Key: { personId: person.personId },
        UpdateExpression: `SET ${personUpdateExpressionParts.join(', ')}`,
        ExpressionAttributeNames: {
          '#firstName': 'firstName',
          '#lastName': 'lastName',
          '#address': 'address',
          '#description': 'description',
          '#occupation': 'occupation',
        },
        ExpressionAttributeValues: personExpressionAttributeValues,
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

      if (letterData.description) {
        letterUpdateExpressionParts.push('#description = :description');
        letterExpressionAttributeValues[':description'] =
          letterData.description;
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
            ExpressionAttributeNames: {
              '#date': 'date',
              '#description': 'description',
              '#imageURL': 'imageURL',
              '#method': 'method',
              '#status': 'status',
              '#text': 'text',
              '#title': 'title',
              '#type': 'type',
            },
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
        personId: person.personId,
        letterIds,
      }),
    };
  } catch (error) {
    logger.error('Error updating correspondence: ', error);
    return new DatabaseError('Internal Server Error').build();
  }
};

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

    const { correspondenceId, person, correspondence, letters } = JSON.parse(
      event.body,
    );

    if (!correspondenceId || !person || !correspondence || !letters) {
      return new BadRequestError(
        'Correspondence ID, person, correspondence, and letters are required.',
      ).build();
    }

    const transactItems: TransactionItem[] = [];
    const letterIds: string[] = [];

    transactItems.push({
      Update: {
        TableName: 'OneHundredLettersPersonTable',
        Key: { personId: person.personId },
        UpdateExpression:
          'SET #firstName = :firstName, #lastName = :lastName, #address = :address, #description = :description, #occupation = :occupation',
        ExpressionAttributeNames: {
          '#firstName': 'firstName',
          '#lastName': 'lastName',
          '#address': 'address',
          '#description': 'description',
          '#occupation': 'occupation',
        },
        ExpressionAttributeValues: {
          ':firstName': person.firstName,
          ':lastName': person.lastName,
          ':address': person.address,
          ':description': person.description,
          ':occupation': person.occupation,
        },
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

      if (letterId) {
        transactItems.push({
          Update: {
            TableName: 'OneHundredLettersLetterTable',
            Key: { correspondenceId, letterId } as {
              correspondenceId: string;
              letterId: string;
            },
            UpdateExpression:
              'SET #date = :date, #description = :description, #imageURL = :imageURL, #method = :method, #status = :status, #text = :text, #title = :title, #type = :type',
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
            ExpressionAttributeValues: {
              ':date': letterData.date,
              ':description': letterData.description,
              ':imageURL': letterData.imageURL,
              ':method': letterData.method,
              ':status': letterData.status,
              ':text': letterData.text,
              ':title': letterData.title,
              ':type': letterData.type,
            },
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

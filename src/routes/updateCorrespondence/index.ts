import { APIGatewayProxyHandler } from 'aws-lambda';
import { BadRequestError, DatabaseError } from '../../common/errors';
import { LetterUpdateInput, UpdateParams, TransactionItem } from '../../types';
import { TransactWriteCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
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

    // Recipient update parameters
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

    // Check for optional fields
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

    // Correspondence update parameters
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

    // Letters update parameters
    letters.forEach((letter: LetterUpdateInput) => {
      const { letterId, ...letterData } = letter;

      // Ensure letterId is always provided and perform an update
      if (!letterId) {
        return new BadRequestError('Letter ID is required for update.').build();
      }

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

      let removeExpressions: string[] = [];

      if (letterData.description === undefined) {
        removeExpressions.push('#description');
        letterUpdateParams.ExpressionAttributeNames['#description'] =
          'description';
      } else {
        letterUpdateParams.UpdateExpression += ', #description = :description';
        letterUpdateParams.ExpressionAttributeValues[':description'] =
          letterData.description;
        letterUpdateParams.ExpressionAttributeNames['#description'] =
          'description';
      }

      if (removeExpressions.length > 0) {
        letterUpdateParams.UpdateExpression +=
          ' REMOVE ' + removeExpressions.join(', ');
      }

      transactItems.push({ Update: letterUpdateParams });
    });

    logger.info('Transaction Items:', transactItems);

    // Execute the transaction
    const command = new TransactWriteCommand({ TransactItems: transactItems });
    await dynamoClient.send(command);

    // Fetch updated data
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

    const letterIds: string[] =
      correspondenceData.Item?.letters.map(
        ({ letterId }: { letterId: string }) => letterId,
      ) || [];

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

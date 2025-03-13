import { APIGatewayProxyHandler } from 'aws-lambda';
import { BadRequestError, DatabaseError } from '../../common/errors';
import { LetterUpdateInput, UpdateParams, TransactionItem } from '../../types';
import { TransactWriteCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoClient, logger } from '../../common/util';
// import { QueryCommand } from '@aws-sdk/client-dynamodb';

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

    // Step 1: Construct correspondence update params.

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

    // Step 2: Construct recipient update params.

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

    // Step 3: Construct all letter update params.

    letters.forEach((letter: LetterUpdateInput) => {
      const { letterId, ...letterData } = letter;

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

    // Step 4: Execute transaction.

    const command = new TransactWriteCommand({ TransactItems: transactItems });
    await dynamoClient.send(command);

    // Step 5: Re-fetch and return the updated correspondence data.

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

    logger.error(correspondenceData?.Item?.correspondenceId);

    const lettersParams = {
      TableName: 'OneHundredLettersLetterTable',
      IndexName: 'CorrespondenceIndex',
      KeyConditionExpression: 'correspondenceId = :correspondenceId',
      ExpressionAttributeValues: {
        ':correspondenceId': correspondenceData?.Item?.correspondenceId,
      },
    };

    logger.error(lettersParams);

    // const lettersCommand = new QueryCommand(lettersParams);
    // const lettersResult = await dynamoClient.send(lettersCommand);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Correspondence updated successfully.',
        data: {
          correspondence: correspondenceData.Item,
          recipient: recipientData.Item,
          letters: [],
          // letters: lettersResult.Items,
        },
      }),
    };
  } catch (error) {
    logger.error('Error updating correspondence: ', error);
    return new DatabaseError('Internal Server Error').build();
  }
};

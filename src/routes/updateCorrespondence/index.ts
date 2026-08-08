import { APIGatewayProxyHandler } from 'aws-lambda';
import {
  BadRequestError,
  DatabaseError,
  NotFoundError,
} from '../../common/errors';
import {
  LetterUpdateInput,
  UpdateParams,
  TransactionItem,
  CorrespondenceUpdateInput,
} from '../../types';
import {
  TransactWriteCommand,
  GetCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { config } from '../../common/config';
import { dynamoClient } from '../../common/util/dynamo';
import { logger } from '../../common/util/logger';
import { getHeaders } from '../../common/util/headers';

const { correspondenceTableName, letterTableName, recipientTableName } = config;

export const handler: APIGatewayProxyHandler = async (event) => {
  const headers = getHeaders(event);

  try {
    const correspondenceId = event.pathParameters?.id;

    if (!correspondenceId) {
      return new BadRequestError(
        'Correspondence ID is required in the path parameters.',
      ).build(headers);
    }

    // Request body validation is handled by the API gateway model.

    if (!event.body) {
      return new BadRequestError('Request body is required.').build(headers);
    }

    let parsedBody: CorrespondenceUpdateInput;
    try {
      parsedBody = JSON.parse(event.body);
    } catch {
      return new BadRequestError('Invalid JSON in request body.').build(
        headers,
      );
    }

    const { recipient, correspondence, letters } = parsedBody;
    const { reason, status, title } = correspondence;
    const now = new Date().toISOString();

    const existingCorrespondence = await dynamoClient.send(
      new GetCommand({
        TableName: correspondenceTableName,
        Key: { correspondenceId },
      }),
    );

    if (!existingCorrespondence.Item) {
      return new NotFoundError('Correspondence not found.').build(headers);
    }

    const storedRecipientId = existingCorrespondence.Item.recipientId as string;
    const transactItems: TransactionItem[] = [];

    // Step 1: Construct correspondence update params.

    const correspondenceUpdateParams: UpdateParams = {
      TableName: correspondenceTableName as string,
      Key: { correspondenceId },
      ConditionExpression: 'attribute_exists(correspondenceId)',
      UpdateExpression:
        'SET #reason = :reason, #status = :status, #title = :title, #updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#reason': 'reason',
        '#status': 'status',
        '#title': 'title',
        '#updatedAt': 'updatedAt',
      },
      ExpressionAttributeValues: {
        ':reason': reason,
        ':status': status,
        ':title': title,
        ':updatedAt': now,
      },
    };

    transactItems.push({
      Update: correspondenceUpdateParams,
    });

    // Step 2: Construct recipient update params using stored recipientId.

    const recipientUpdateParams: UpdateParams = {
      TableName: recipientTableName as string,
      Key: { recipientId: storedRecipientId },
      ConditionExpression: 'attribute_exists(recipientId)',
      UpdateExpression:
        'SET #firstName = :firstName, #lastName = :lastName, #address = :address, #updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#firstName': 'firstName',
        '#lastName': 'lastName',
        '#address': 'address',
        '#updatedAt': 'updatedAt',
      },
      ExpressionAttributeValues: {
        ':firstName': recipient.firstName,
        ':lastName': recipient.lastName,
        ':address': recipient.address,
        ':updatedAt': now,
      },
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

    if (recipient.organization === undefined) {
      recipientRemoveExpressions.push('#organization');
      recipientUpdateParams.ExpressionAttributeNames['#organization'] =
        'organization';
    } else {
      recipientUpdateParams.UpdateExpression +=
        ', #organization = :organization';
      recipientUpdateParams.ExpressionAttributeValues[':organization'] =
        recipient.organization;
      recipientUpdateParams.ExpressionAttributeNames['#organization'] =
        'organization';
    }

    if (recipientRemoveExpressions.length > 0) {
      recipientUpdateParams.UpdateExpression +=
        ' REMOVE ' + recipientRemoveExpressions.join(', ');
    }

    transactItems.push({
      Update: recipientUpdateParams,
    });

    // Step 3: Construct all letter update params.

    for (const letter of letters) {
      const { letterId, ...letterData } = letter;

      const letterUpdateParams: UpdateParams = {
        TableName: letterTableName as string,
        Key: { correspondenceId, letterId },
        ConditionExpression:
          'attribute_exists(correspondenceId) AND attribute_exists(letterId)',
        UpdateExpression:
          'SET #imageURLs = :imageURLs, #method = :method, #status = :status, #text = :text, #title = :title, #type = :type, #updatedAt = :updatedAt',
        ExpressionAttributeNames: {
          '#imageURLs': 'imageURLs',
          '#method': 'method',
          '#status': 'status',
          '#text': 'text',
          '#title': 'title',
          '#type': 'type',
          '#updatedAt': 'updatedAt',
        },
        ExpressionAttributeValues: {
          ':imageURLs': letterData.imageURLs,
          ':method': letterData.method,
          ':status': letterData.status,
          ':text': letterData.text,
          ':title': letterData.title,
          ':type': letterData.type,
          ':updatedAt': now,
        },
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

      if (letterData.receivedAt === undefined) {
        removeExpressions.push('#receivedAt');
        letterUpdateParams.ExpressionAttributeNames['#receivedAt'] =
          'receivedAt';
      } else {
        letterUpdateParams.UpdateExpression += ', #receivedAt = :receivedAt';
        letterUpdateParams.ExpressionAttributeValues[':receivedAt'] =
          letterData.receivedAt;
        letterUpdateParams.ExpressionAttributeNames['#receivedAt'] =
          'receivedAt';
      }

      if (letterData.sentAt === undefined) {
        removeExpressions.push('#sentAt');
        letterUpdateParams.ExpressionAttributeNames['#sentAt'] = 'sentAt';
      } else {
        letterUpdateParams.UpdateExpression += ', #sentAt = :sentAt';
        letterUpdateParams.ExpressionAttributeValues[':sentAt'] =
          letterData.sentAt;
        letterUpdateParams.ExpressionAttributeNames['#sentAt'] = 'sentAt';
      }

      if (removeExpressions.length > 0) {
        letterUpdateParams.UpdateExpression +=
          ' REMOVE ' + removeExpressions.join(', ');
      }

      transactItems.push({ Update: letterUpdateParams });
    }

    // Step 4: Delete missing letters.

    const lettersParams = {
      TableName: letterTableName,
      IndexName: 'CorrespondenceIndex',
      KeyConditionExpression: 'correspondenceId = :correspondenceId',
      ExpressionAttributeValues: {
        ':correspondenceId': correspondenceId,
      },
    };

    const lettersCommand = new QueryCommand(lettersParams);
    const lettersResult = await dynamoClient.send(lettersCommand);
    const existingLetterIds = new Set(
      lettersResult.Items?.map((letter) => letter.letterId),
    );
    const incomingLetterIds = new Set(
      letters.map((letter: LetterUpdateInput) => letter.letterId),
    );

    existingLetterIds.forEach((letterId) => {
      if (!incomingLetterIds.has(letterId)) {
        transactItems.push({
          Delete: {
            TableName: letterTableName as string,
            Key: { correspondenceId, letterId },
          },
        });
      }
    });

    // Step 5: Execute transaction.

    const command = new TransactWriteCommand({ TransactItems: transactItems });
    await dynamoClient.send(command);

    // Step 6: Re-fetch the updated correspondence data.

    const correspondenceData = await dynamoClient.send(
      new GetCommand({
        TableName: correspondenceTableName,
        Key: { correspondenceId },
      }),
    );

    const recipientData = await dynamoClient.send(
      new GetCommand({
        TableName: recipientTableName,
        Key: { recipientId: storedRecipientId },
      }),
    );

    const updatedLettersParams = {
      TableName: letterTableName,
      IndexName: 'CorrespondenceIndex',
      KeyConditionExpression: 'correspondenceId = :correspondenceId',
      ExpressionAttributeValues: {
        ':correspondenceId': correspondenceId,
      },
    };

    const updatedLettersCommand = new QueryCommand(updatedLettersParams);
    const updatedLettersResult = await dynamoClient.send(updatedLettersCommand);

    return {
      statusCode: 200,
      body: JSON.stringify({
        data: {
          correspondence: correspondenceData.Item,
          recipient: recipientData.Item,
          letters: updatedLettersResult.Items,
        },
        message: 'Correspondence updated successfully!',
      }),
      headers,
    };
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === 'ConditionalCheckFailedException' ||
        error.name === 'TransactionCanceledException')
    ) {
      return new NotFoundError(
        'Correspondence, recipient, or letter not found.',
      ).build(headers);
    }
    logger.error('Error updating correspondence: ', error);
    return new DatabaseError('Internal Server Error').build(headers);
  }
};

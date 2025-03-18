import { APIGatewayProxyHandler } from 'aws-lambda';
import {
  BadRequestError,
  DatabaseError,
  NotFoundError,
} from '../../common/errors';
import { UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { config } from '../../common/config';
import { dynamoClient, logger } from '../../common/util';
import { UpdateParams } from '../../types';

const { correspondenceTableName, letterTableName } = config;

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const letterId = event.pathParameters?.id;

    if (!letterId) {
      return new BadRequestError('Letter ID is required.').build();
    }

    // Request body validation is handled by the API gateway model.

    if (!event.body) {
      return new BadRequestError('Request body is required.').build();
    }

    const body = JSON.parse(event.body);

    const {
      correspondenceId,
      description,
      imageURLs,
      method,
      receivedAt,
      sentAt,
      status,
      text,
      title,
      type,
    } = body;

    const checkCorrespondenceParams = {
      TableName: correspondenceTableName,
      KeyConditionExpression: 'correspondenceId = :correspondenceId',
      ExpressionAttributeValues: {
        ':correspondenceId': correspondenceId,
      },
    };

    const correspondenceResult = await dynamoClient.send(
      new QueryCommand(checkCorrespondenceParams),
    );

    if (
      !correspondenceResult.Items ||
      correspondenceResult.Items.length === 0
    ) {
      return new NotFoundError('Correspondence ID not found.').build();
    }

    const updateParams: UpdateParams = {
      TableName: letterTableName as string,
      Key: {
        correspondenceId,
        letterId,
      },
      UpdateExpression:
        'SET #imageURLs = :imageURLs, #method = :method, #status = :status, #text = :text, #title = :title, #type = :type',
      ExpressionAttributeNames: {
        '#imageURLs': 'imageURLs',
        '#method': 'method',
        '#status': 'status',
        '#text': 'text',
        '#title': 'title',
        '#type': 'type',
      },
      ExpressionAttributeValues: {
        ':imageURLs': imageURLs,
        ':method': method,
        ':status': status,
        ':text': text,
        ':title': title,
        ':type': type,
      },
      ReturnValues: 'ALL_NEW',
    };

    let removeExpressions: string[] = [];

    if (description === undefined) {
      removeExpressions.push('#description');
      updateParams.ExpressionAttributeNames['#description'] = 'description';
    } else {
      updateParams.UpdateExpression += ', #description = :description';
      updateParams.ExpressionAttributeValues[':description'] = description;
      updateParams.ExpressionAttributeNames['#description'] = 'description';
    }

    if (removeExpressions.length > 0) {
      updateParams.UpdateExpression +=
        ' REMOVE ' + removeExpressions.join(', ');
    }

    if (receivedAt) {
      updateParams.UpdateExpression += ', #receivedAt = :receivedAt';
      updateParams.ExpressionAttributeNames!['#receivedAt'] = 'receivedAt';
      updateParams.ExpressionAttributeValues[':receivedAt'] = receivedAt;
    }

    if (sentAt) {
      updateParams.UpdateExpression += ', #sentAt = :sentAt';
      updateParams.ExpressionAttributeNames!['#sentAt'] = 'sentAt';
      updateParams.ExpressionAttributeValues[':sentAt'] = sentAt;
    }

    const command = new UpdateCommand(updateParams);
    const result = await dynamoClient.send(command);

    if (!result.Attributes) {
      return new NotFoundError('Letter not found.').build();
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        data: result.Attributes,
        message: 'Letter updated successfully!',
      }),
    };
  } catch (error) {
    logger.error('Error updating letter in DynamoDB: ', error);
    return new DatabaseError('Internal Server Error').build();
  }
};

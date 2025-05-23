import { APIGatewayProxyHandler } from 'aws-lambda';
import {
  BadRequestError,
  DatabaseError,
  NotFoundError,
} from '../../common/errors';
import { UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { config } from '../../common/config';
import { dynamoClient, getHeaders, logger } from '../../common/util';
import { UpdateParams } from '../../types';

const { correspondenceTableName, letterTableName } = config;

export const handler: APIGatewayProxyHandler = async (event) => {
  const headers = getHeaders(event);

  try {
    const letterId = event.pathParameters?.id;

    if (!letterId) {
      return new BadRequestError('Letter ID is required.').build(headers);
    }

    // Request body validation is handled by the API gateway model.

    if (!event.body) {
      return new BadRequestError('Request body is required.').build(headers);
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
      return new NotFoundError('Correspondence ID not found.').build(headers);
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

    if (receivedAt === undefined) {
      removeExpressions.push('#receivedAt');
      updateParams.ExpressionAttributeNames['#receivedAt'] = 'receivedAt';
    } else {
      updateParams.UpdateExpression += ', #receivedAt = :receivedAt';
      updateParams.ExpressionAttributeNames!['#receivedAt'] = 'receivedAt';
      updateParams.ExpressionAttributeValues[':receivedAt'] = receivedAt;
    }

    if (sentAt === undefined) {
      removeExpressions.push('#sentAt');
      updateParams.ExpressionAttributeNames['#sentAt'] = 'sentAt';
    } else {
      updateParams.UpdateExpression += ', #sentAt = :sentAt';
      updateParams.ExpressionAttributeNames!['#sentAt'] = 'sentAt';
      updateParams.ExpressionAttributeValues[':sentAt'] = sentAt;
    }

    if (removeExpressions.length > 0) {
      updateParams.UpdateExpression +=
        ' REMOVE ' + removeExpressions.join(', ');
    }

    const command = new UpdateCommand(updateParams);
    const result = await dynamoClient.send(command);

    if (!result.Attributes) {
      return new NotFoundError('Letter not found.').build(headers);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        data: result.Attributes,
        message: 'Letter updated successfully!',
      }),
      headers,
    };
  } catch (error) {
    logger.error('Error updating letter in DynamoDB: ', error);
    return new DatabaseError('Internal Server Error').build(headers);
  }
};

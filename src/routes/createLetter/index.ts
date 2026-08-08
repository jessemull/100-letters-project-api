import { APIGatewayProxyHandler } from 'aws-lambda';
import {
  BadRequestError,
  DatabaseError,
  NotFoundError,
} from '../../common/errors';
import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { config } from '../../common/config';
import { dynamoClient } from '../../common/util/dynamo';
import { logger } from '../../common/util/logger';
import { getHeaders } from '../../common/util/headers';
import { Letter } from '../../types';
import { randomUUID } from 'crypto';

const { correspondenceTableName, letterTableName } = config;

export const handler: APIGatewayProxyHandler = async (event) => {
  const headers = getHeaders(event);

  try {
    // Request body validation is handled by the API gateway model.

    if (!event.body) {
      return new BadRequestError('Request body is required.').build(headers);
    }

    let body;
    try {
      body = JSON.parse(event.body);
    } catch {
      return new BadRequestError('Invalid JSON in request body.').build(
        headers,
      );
    }

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

    const letterId = randomUUID();
    const now = new Date().toISOString();

    const letterData: Letter = {
      description,
      letterId,
      correspondenceId,
      createdAt: now,
      imageURLs,
      method,
      receivedAt,
      searchPartition: 'LETTER',
      sentAt,
      status,
      text,
      title: title.trim(),
      type,
      updatedAt: now,
    };

    const params = {
      TableName: letterTableName,
      Item: letterData,
      ConditionExpression: 'attribute_not_exists(letterId)',
    };

    const command = new PutCommand(params);
    await dynamoClient.send(command);

    return {
      statusCode: 201,
      body: JSON.stringify({
        data: letterData,
        message: 'Letter created successfully!',
      }),
      headers,
    };
  } catch (error) {
    logger.error('Error creating letter in DynamoDB: ', error);
    return new DatabaseError('Internal Server Error').build(headers);
  }
};

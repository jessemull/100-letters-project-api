import { APIGatewayProxyHandler } from 'aws-lambda';
import {
  BadRequestError,
  DatabaseError,
  NotFoundError,
} from '../../common/errors';
import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { config } from '../../common/config';
import { dynamoClient, getHeaders, logger } from '../../common/util';
import { Letter } from '../../types';
import { v4 as uuidv4 } from 'uuid';

const { correspondenceTableName, letterTableName } = config;

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
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

    const letterId = uuidv4();

    const letterData: Letter = {
      letterId,
      correspondenceId,
      imageURLs,
      method,
      status,
      text,
      title,
      type,
    };

    if (description) {
      letterData.description = description;
    }

    if (receivedAt) {
      letterData.receivedAt = receivedAt;
    }

    if (sentAt) {
      letterData.sentAt = sentAt;
    }

    const params = {
      TableName: letterTableName,
      Item: letterData,
    };

    const command = new PutCommand(params);
    await dynamoClient.send(command);

    return {
      statusCode: 201,
      body: JSON.stringify({
        data: letterData,
        message: 'Letter created successfully!',
      }),
      headers: getHeaders(event),
    };
  } catch (error) {
    logger.error('Error creating letter in DynamoDB: ', error);
    return new DatabaseError('Internal Server Error').build();
  }
};

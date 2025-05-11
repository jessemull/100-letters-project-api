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
  const headers = getHeaders(event);

  try {
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

    const letterId = uuidv4();

    const letterData: Letter = {
      description,
      letterId,
      correspondenceId,
      imageURLs,
      method,
      receivedAt,
      searchPartition: 'LETTER',
      sentAt,
      status,
      text,
      title: title.trim(),
      type,
    };

    logger.error(letterData);

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
      headers,
    };
  } catch (error) {
    logger.error('Error creating letter in DynamoDB: ', error);
    return new DatabaseError('Internal Server Error').build(headers);
  }
};

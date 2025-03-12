import { APIGatewayProxyHandler } from 'aws-lambda';
import {
  BadRequestError,
  DatabaseError,
  NotFoundError,
} from '../../common/errors';
import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoClient, logger } from '../../common/util';
import { Letter } from '../../types';
import { v4 as uuidv4 } from 'uuid';

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    if (!event.body) {
      return new BadRequestError('Request body is required.').build();
    }

    const body = JSON.parse(event.body);

    const {
      correspondenceId,
      date,
      description,
      imageURL,
      method,
      status,
      text,
      title,
      type,
    } = body;

    if (
      !correspondenceId ||
      !date ||
      !imageURL ||
      !method ||
      !status ||
      !text ||
      !title ||
      !type
    ) {
      return new BadRequestError(
        'Correspondence ID, date, imageURL, method, status, text, title, and type are required.',
      ).build();
    }

    const checkCorrespondenceParams = {
      TableName: 'OneHundredLettersCorrespondenceTable',
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
      date,
      imageURL,
      method,
      status,
      text,
      title,
      type,
    };

    if (description) {
      letterData.description = description;
    }

    const params = {
      TableName: 'OneHundredLettersLetterTable',
      Item: letterData,
    };

    const command = new PutCommand(params);
    await dynamoClient.send(command);

    return {
      statusCode: 201,
      body: JSON.stringify({
        message: 'Letter created successfully!',
        data: letterData,
      }),
    };
  } catch (error) {
    logger.error('Error creating letter in DynamoDB: ', error);
    return new DatabaseError('Internal Server Error').build();
  }
};

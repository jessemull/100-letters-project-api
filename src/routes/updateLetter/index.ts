import { APIGatewayProxyHandler } from 'aws-lambda';
import { BadRequestError, DatabaseError } from '../../common/errors';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoClient, logger } from '../../common/util';
import { UpdateParamsNoNames } from '../../types';

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const letterId = event.pathParameters?.id;

    if (!letterId) {
      return new BadRequestError('Letter ID is required.').build();
    }

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

    const updateParams: UpdateParamsNoNames = {
      TableName: 'OneHundredLettersLetterTable',
      Key: {
        correspondenceId,
        letterId,
      },
      UpdateExpression:
        'SET #date = :date, #imageURL = :imageURL, #method = :method, #status = :status, #text = :text, #title = :title, #type = :type',
      ExpressionAttributeValues: {
        ':date': date,
        ':imageURL': imageURL,
        ':method': method,
        ':status': status,
        ':text': text,
        ':title': title,
        ':type': type,
      },
      ReturnValues: 'ALL_NEW',
    };

    if (description) {
      updateParams.UpdateExpression += ', #description = :description';
      updateParams.ExpressionAttributeValues[':description'] = description;
    }

    const command = new UpdateCommand(updateParams);
    const result = await dynamoClient.send(command);

    if (!result.Attributes) {
      return new BadRequestError('Letter not found.').build();
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Letter updated successfully!',
        data: result.Attributes,
      }),
    };
  } catch (error) {
    logger.error('Error updating letter in DynamoDB: ', error);
    return new DatabaseError('Internal Server Error').build();
  }
};

import { APIGatewayProxyHandler } from 'aws-lambda';
import {
  BadRequestError,
  DatabaseError,
  NotFoundError,
} from '../../common/errors';
import { UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoClient, logger } from '../../common/util';
import { UpdateParams } from '../../types';

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

    const updateParams: UpdateParams = {
      TableName: 'OneHundredLettersLetterTable',
      Key: {
        correspondenceId,
        letterId,
      },
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
        '#description': 'description',
      },
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

    if (description !== undefined) {
      updateParams.UpdateExpression += ', #description = :description';
      updateParams.ExpressionAttributeValues[':description'] = description;
    } else {
      updateParams.UpdateExpression += ', REMOVE #description';
    }

    const command = new UpdateCommand(updateParams);
    const result = await dynamoClient.send(command);

    if (!result.Attributes) {
      return new NotFoundError('Letter not found.').build();
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

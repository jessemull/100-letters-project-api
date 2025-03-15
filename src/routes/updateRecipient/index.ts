import { APIGatewayProxyHandler } from 'aws-lambda';
import {
  BadRequestError,
  DatabaseError,
  NotFoundError,
} from '../../common/errors';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { UpdateParams } from '../../types';
import { dynamoClient, logger } from '../../common/util';

// Request body validation is handled by the API gateway model.

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const recipientId = event.pathParameters?.id;

    if (!recipientId) {
      return new BadRequestError('Recipient ID is required.').build();
    }

    if (!event.body) {
      return new BadRequestError('Request body is required.').build();
    }

    const body = JSON.parse(event.body);

    const {
      address,
      description,
      firstName,
      lastName,
      occupation,
      organization,
    } = body;

    const updateParams: UpdateParams = {
      TableName: 'OneHundredLettersRecipientTable',
      Key: {
        recipientId,
      },
      UpdateExpression:
        'set #address = :address, #firstName = :firstName, #lastName = :lastName',
      ExpressionAttributeNames: {
        '#address': 'address',
        '#firstName': 'firstName',
        '#lastName': 'lastName',
      },
      ExpressionAttributeValues: {
        ':address': address,
        ':firstName': firstName,
        ':lastName': lastName,
      },
      ReturnValues: 'ALL_NEW',
    };

    if (description) {
      updateParams.UpdateExpression += ', #description = :description';
      updateParams.ExpressionAttributeNames['#description'] = 'description';
      updateParams.ExpressionAttributeValues[':description'] = description;
    }

    if (occupation) {
      updateParams.UpdateExpression += ', #occupation = :occupation';
      updateParams.ExpressionAttributeNames['#occupation'] = 'occupation';
      updateParams.ExpressionAttributeValues[':occupation'] = occupation;
    }

    if (organization) {
      updateParams.UpdateExpression += ', #organization = :organization';
      updateParams.ExpressionAttributeNames['#organization'] = 'organization';
      updateParams.ExpressionAttributeValues[':organization'] = occupation;
    }

    const command = new UpdateCommand(updateParams);
    const result = await dynamoClient.send(command);

    if (!result.Attributes) {
      return new NotFoundError('Recipient not found.').build();
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Recipient updated successfully!',
        data: result.Attributes,
      }),
    };
  } catch (error) {
    logger.error('Error updating recipient in DynamoDB: ', error);
    return new DatabaseError('Internal Server Error').build();
  }
};

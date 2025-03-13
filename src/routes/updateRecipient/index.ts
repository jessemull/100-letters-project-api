import { APIGatewayProxyHandler } from 'aws-lambda';
import {
  BadRequestError,
  DatabaseError,
  NotFoundError,
} from '../../common/errors';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { UpdateParams } from '../../types';
import { dynamoClient, logger } from '../../common/util';

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

    const { address, description, firstName, lastName, occupation } = body;

    if (!firstName || !lastName || !address) {
      return new BadRequestError(
        'First name, last name, and address are required.',
      ).build();
    }

    const updateParams: UpdateParams = {
      TableName: 'OneHundredLettersRecipientTable',
      Key: {
        recipientId,
      },
      UpdateExpression:
        'SET #address = :address, #firstName = :firstName, #lastName = :lastName',
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

    if (description !== undefined) {
      updateParams.UpdateExpression += ', #description = :description';
      updateParams.ExpressionAttributeNames!['#description'] = 'description';
      updateParams.ExpressionAttributeValues[':description'] = description;
    } else {
      updateParams.UpdateExpression += ' REMOVE #description';
      updateParams.ExpressionAttributeNames!['#description'] = 'description';
    }

    if (occupation !== undefined) {
      updateParams.UpdateExpression += ', #occupation = :occupation';
      updateParams.ExpressionAttributeNames!['#occupation'] = 'occupation';
      updateParams.ExpressionAttributeValues[':occupation'] = occupation;
    } else {
      updateParams.UpdateExpression += ' REMOVE #occupation';
      updateParams.ExpressionAttributeNames!['#occupation'] = 'occupation';
    }

    logger.info(updateParams);

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

import { APIGatewayProxyHandler } from 'aws-lambda';
import {
  BadRequestError,
  DatabaseError,
  NotFoundError,
} from '../../common/errors';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { UpdateParams } from '../../types';
import { config } from '../../common/config';
import { dynamoClient, getHeaders, logger } from '../../common/util';

const { recipientTableName } = config;

export const handler: APIGatewayProxyHandler = async (event) => {
  const headers = getHeaders(event);

  try {
    const recipientId = event.pathParameters?.id;

    if (!recipientId) {
      return new BadRequestError('Recipient ID is required.').build(headers);
    }

    // Request body validation is handled by the API gateway model.

    if (!event.body) {
      return new BadRequestError('Request body is required.').build(headers);
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
      TableName: recipientTableName as string,
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

    let removeExpressions: string[] = [];

    if (description === undefined) {
      removeExpressions.push('#description');
      updateParams.ExpressionAttributeNames['#description'] = 'description';
    } else {
      updateParams.UpdateExpression += ', #description = :description';
      updateParams.ExpressionAttributeValues[':description'] = description;
      updateParams.ExpressionAttributeNames['#description'] = 'description';
    }

    if (occupation === undefined) {
      removeExpressions.push('#occupation');
      updateParams.ExpressionAttributeNames['#occupation'] = 'occupation';
    } else {
      updateParams.UpdateExpression += ', #occupation = :occupation';
      updateParams.ExpressionAttributeValues[':occupation'] = occupation;
      updateParams.ExpressionAttributeNames['#occupation'] = 'occupation';
    }

    if (organization === undefined) {
      removeExpressions.push('#organization');
      updateParams.ExpressionAttributeNames['#organization'] = 'organization';
    } else {
      updateParams.UpdateExpression += ', #organization = :organization';
      updateParams.ExpressionAttributeValues[':organization'] = organization;
      updateParams.ExpressionAttributeNames['#organization'] = 'organization';
    }

    if (removeExpressions.length > 0) {
      updateParams.UpdateExpression +=
        ' REMOVE ' + removeExpressions.join(', ');
    }

    const command = new UpdateCommand(updateParams);
    const result = await dynamoClient.send(command);

    if (!result.Attributes) {
      return new NotFoundError('Recipient not found.').build(headers);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        data: result.Attributes,
        message: 'Recipient updated successfully!',
      }),
      headers,
    };
  } catch (error) {
    logger.error('Error updating recipient in DynamoDB: ', error);
    return new DatabaseError('Internal Server Error').build(headers);
  }
};

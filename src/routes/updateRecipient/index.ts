import { APIGatewayProxyHandler } from 'aws-lambda';
import {
  BadRequestError,
  DatabaseError,
  NotFoundError,
} from '../../common/errors';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { UpdateParams } from '../../types';
import { config } from '../../common/config';
import { dynamoClient } from '../../common/util/dynamo';
import { logger } from '../../common/util/logger';
import { getHeaders } from '../../common/util/headers';

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

    let body;
    try {
      body = JSON.parse(event.body);
    } catch {
      return new BadRequestError('Invalid JSON in request body.').build(
        headers,
      );
    }

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
      ConditionExpression: 'attribute_exists(recipientId)',
      UpdateExpression:
        'SET #address = :address, #firstName = :firstName, #lastName = :lastName, #updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#address': 'address',
        '#firstName': 'firstName',
        '#lastName': 'lastName',
        '#updatedAt': 'updatedAt',
      },
      ExpressionAttributeValues: {
        ':address': address,
        ':firstName': firstName,
        ':lastName': lastName,
        ':updatedAt': new Date().toISOString(),
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

    return {
      statusCode: 200,
      body: JSON.stringify({
        data: result.Attributes,
        message: 'Recipient updated successfully!',
      }),
      headers,
    };
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === 'ConditionalCheckFailedException'
    ) {
      return new NotFoundError('Recipient not found.').build(headers);
    }
    logger.error('Error updating recipient in DynamoDB: ', error);
    return new DatabaseError('Internal Server Error').build(headers);
  }
};

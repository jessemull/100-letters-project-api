import { APIGatewayProxyHandler } from 'aws-lambda';
import { BadRequestError, DatabaseError } from '../../common/errors';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { Recipient } from '../../types';
import { config } from '../../common/config';
import { dynamoClient, getHeaders, logger } from '../../common/util';
import { v4 as uuidv4 } from 'uuid';

const { recipientTableName } = config;

export const handler: APIGatewayProxyHandler = async (event) => {
  const headers = getHeaders(event);

  try {
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

    const recipientId = uuidv4();

    const recipientData: Recipient = {
      address,
      description,
      firstName,
      lastName,
      occupation,
      organization,
      recipientId,
      searchPartition: 'RECIPIENT',
    };

    const params = {
      TableName: recipientTableName,
      Item: recipientData,
    };

    const command = new PutCommand(params);

    await dynamoClient.send(command);

    return {
      statusCode: 201,
      body: JSON.stringify({
        data: recipientData,
        message: 'Recipient created successfully!',
      }),
      headers,
    };
  } catch (error) {
    logger.error('Error creating recipient in DynamoDB: ', error);
    return new DatabaseError('Internal Server Error').build(headers);
  }
};

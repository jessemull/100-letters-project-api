import { APIGatewayProxyHandler } from 'aws-lambda';
import { BadRequestError, DatabaseError } from '../../common/errors';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { Recipient } from '../../types';
import { dynamoClient, logger } from '../../common/util';
import { v4 as uuidv4 } from 'uuid';

// Request body validation is handled by the API gateway model.

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
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

    const recipientId = uuidv4();

    const recipientData: Recipient = {
      address,
      firstName,
      lastName,
      recipientId,
    };

    if (description) {
      recipientData.description = body.description;
    }

    if (occupation) {
      recipientData.occupation = body.occupation;
    }

    if (organization) {
      recipientData.organization = body.organization;
    }

    const params = {
      TableName: 'OneHundredLettersRecipientTable',
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
    };
  } catch (error) {
    logger.error('Error creating recipient in DynamoDB: ', error);
    return new DatabaseError('Internal Server Error').build();
  }
};

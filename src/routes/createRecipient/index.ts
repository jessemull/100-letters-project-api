import { APIGatewayProxyHandler } from 'aws-lambda';
import { BadRequestError, DatabaseError } from '../../common/errors';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { Recipient } from '../../types';
import { dynamoClient, logger } from '../../common/util';

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
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

    const recipientId = `${firstName.toLowerCase()}-${lastName.toLowerCase()}`;

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

    const params = {
      TableName: 'OneHundredLettersRecipientTable',
      Item: recipientData,
    };

    const command = new PutCommand(params);

    await dynamoClient.send(command);

    return {
      statusCode: 201,
      body: JSON.stringify({
        message: 'Recipient created successfully!',
        data: recipientData,
      }),
    };
  } catch (error) {
    logger.error('Error creating recipient in DynamoDB: ', error);
    return new DatabaseError('Internal Server Error').build();
  }
};

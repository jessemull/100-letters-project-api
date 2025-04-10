import { APIGatewayProxyHandler } from 'aws-lambda';
import { BadRequestError, InternalServerError } from '../../common/errors';
import { config } from '../../common/config';
import { logger, sesClient } from '../../common/util';

const source = process.env.SES_SOURCE as string;
const contact = process.env.SES_CONTACT as string;

const { headers } = config;

export const handler: APIGatewayProxyHandler = async (event) => {
  const { email, firstName, lastName, message } = JSON.parse(
    event.body || '{}',
  );

  if (!firstName || !lastName || !email || !message) {
    return new BadRequestError(
      'Name, email, and message are required.',
    ).build();
  }

  const emailSubject = `New Contact Form Submission from ${firstName} ${lastName}`;
  const emailBody = `
    You have a new contact form submission:

    First Name: ${firstName}
    Last Name: ${lastName}
    Email: ${email}

    Message:
    ${message}
  `;

  const params = {
    Source: source,
    Destination: {
      ToAddresses: [contact],
    },
    Message: {
      Subject: {
        Data: emailSubject,
      },
      Body: {
        Text: {
          Data: emailBody,
        },
      },
    },
  };

  try {
    await sesClient.sendEmail(params).promise();
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Email sent successfully.',
      }),
      headers,
    };
  } catch (error) {
    logger.error('Error sending email: ', error);
    return new InternalServerError(
      'There was an error sending the email.',
    ).build();
  }
};

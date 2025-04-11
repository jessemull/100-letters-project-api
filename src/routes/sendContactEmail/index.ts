import { APIGatewayProxyHandler } from 'aws-lambda';
import { BadRequestError, InternalServerError } from '../../common/errors';
import { config } from '../../common/config';
import { logger, sesClient } from '../../common/util';

const captchaSecret = process.env.RECAPTCHA_SECRET_KEY as string;
const contact = process.env.SES_CONTACT as string;
const source = process.env.SES_SOURCE as string;

const CAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';

const { headers } = config;

export const handler: APIGatewayProxyHandler = async (event) => {
  const { email, firstName, lastName, message } = JSON.parse(
    event.body || '{}',
  );

  const captchaToken =
    event.headers['g-recaptcha-response'] ||
    event.headers['G-Recaptcha-Response'];

  if (!firstName || !lastName || !email || !message || !captchaToken) {
    return new BadRequestError(
      'Name, email, message and CAPTCHA are required.',
    ).build();
  }

  try {
    const captchaResponse = await fetch(CAPTCHA_VERIFY_URL, {
      method: 'POST',
      body: new URLSearchParams({
        secret: captchaSecret,
        response: captchaToken,
      }),
    });

    const captchaData = await captchaResponse.json();

    if (!captchaData.success) {
      return new BadRequestError('Invalid CAPTCHA. Please try again.').build();
    }
  } catch (error) {
    logger.error('Error verifying CAPTCHA: ', error);
    return new InternalServerError(
      'There was an error verifying the CAPTCHA.',
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

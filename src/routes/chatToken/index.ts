import crypto from 'crypto';
import { APIGatewayProxyHandler } from 'aws-lambda';
import { InternalServerError } from '../../common/errors';
import { getHeaders, logger } from '../../common/util';

// Simple HMAC token used to call lambda directly for generating chat bot responses.

export const handler: APIGatewayProxyHandler = async (event) => {
  const headers = getHeaders(event);
  const secret = process.env.CHAT_SECRET;

  try {
    if (!secret) {
      throw new Error('Secret is not defined!');
    }

    const expires = Math.floor(Date.now() / 1000) + 30 * 60;
    const payload = `expires=${expires}`;
    const sig = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    const token = `${payload}&sig=${sig}`;

    return {
      statusCode: 200,
      body: JSON.stringify({
        data: {
          token,
        },
        message: 'Token generated successfully!',
      }),
      headers,
    };
  } catch (error) {
    logger.error('Error generating chat token: ', error);
    return new InternalServerError('Failed to generate chat token!').build(
      headers,
    );
  }
};

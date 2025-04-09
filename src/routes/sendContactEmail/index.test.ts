import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from 'aws-lambda';
import { handler } from './index';
import { sesClient, logger } from '../../common/util';

jest.mock('../../common/util', () => ({
  sesClient: {
    sendEmail: jest.fn(),
  },
  logger: {
    error: jest.fn(),
    info: jest.fn(),
  },
}));

describe('Contact Form Handler', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return a 200 response when the email is sent successfully', async () => {
    const mockSendEmailPromise = jest.fn().mockResolvedValueOnce({});
    (sesClient.sendEmail as jest.Mock).mockReturnValueOnce({
      promise: mockSendEmailPromise,
    });

    const event: APIGatewayProxyEvent = {
      body: JSON.stringify({
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        message: 'Hello, I need help!',
      }),
      headers: {},
      httpMethod: 'POST',
      isBase64Encoded: false,
      path: '/contact',
      pathParameters: null,
      queryStringParameters: null,
      stageVariables: null,
      requestContext: {} as APIGatewayProxyEvent['requestContext'],
      resource: '',
    } as unknown as APIGatewayProxyEvent;

    const context: Context = {} as Context;

    const result = (await handler(
      event,
      context,
      () => {},
    )) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body || '').message).toBe(
      'Email sent successfully.',
    );
    expect(sesClient.sendEmail).toHaveBeenCalled();
  });

  it('should return a 400 response if the required fields are missing', async () => {
    const event: APIGatewayProxyEvent = {
      body: JSON.stringify({
        email: 'test@example.com',
        firstName: 'John',
      }),
      headers: {},
      httpMethod: 'POST',
      isBase64Encoded: false,
      path: '/contact',
      pathParameters: null,
      queryStringParameters: null,
      stageVariables: null,
      requestContext: {} as APIGatewayProxyEvent['requestContext'],
      resource: '',
    } as unknown as APIGatewayProxyEvent;

    const context: Context = {} as Context;

    const result = (await handler(
      event,
      context,
      () => {},
    )) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body || '').error).toBe('BadRequestError');
    expect(JSON.parse(result.body || '').message).toBe(
      'Name, email, and message are required.',
    );
  });

  it('should return a 400 response if the body is missing', async () => {
    const event: APIGatewayProxyEvent = {
      headers: {},
      httpMethod: 'POST',
      isBase64Encoded: false,
      path: '/contact',
      pathParameters: null,
      queryStringParameters: null,
      stageVariables: null,
      requestContext: {} as APIGatewayProxyEvent['requestContext'],
      resource: '',
    } as unknown as APIGatewayProxyEvent;

    const context: Context = {} as Context;

    const result = (await handler(
      event,
      context,
      () => {},
    )) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body || '').error).toBe('BadRequestError');
    expect(JSON.parse(result.body || '').message).toBe(
      'Name, email, and message are required.',
    );
  });

  it('should return a 500 response if there is an internal server error', async () => {
    const errorMessage = 'SES error occurred';
    const mockSendEmailPromise = jest
      .fn()
      .mockRejectedValueOnce(new Error(errorMessage));
    (sesClient.sendEmail as jest.Mock).mockReturnValueOnce({
      promise: mockSendEmailPromise,
    });

    const event: APIGatewayProxyEvent = {
      body: JSON.stringify({
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        message: 'Hello, I need help!',
      }),
      headers: {},
      httpMethod: 'POST',
      isBase64Encoded: false,
      path: '/contact',
      pathParameters: null,
      queryStringParameters: null,
      stageVariables: null,
      requestContext: {} as APIGatewayProxyEvent['requestContext'],
      resource: '',
    } as unknown as APIGatewayProxyEvent;

    const context: Context = {} as Context;

    const result = (await handler(
      event,
      context,
      () => {},
    )) as APIGatewayProxyResult;

    const responseBody = JSON.parse(result.body || '');
    expect(result.statusCode).toBe(500);
    expect(responseBody.error).toBe('InternalServerError');
    expect(responseBody.message).toBe('There was an error sending the email.');
    expect(logger.error).toHaveBeenCalledWith(
      'Error sending email: ',
      expect.any(Error),
    );
  });
});

import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from 'aws-lambda';
import { dynamoClient, logger } from '../../common/util';
import { handler } from './index';
import { v4 as uuidv4 } from 'uuid';

jest.mock('../../common/util', () => ({
  dynamoClient: {
    send: jest.fn(),
  },
  logger: {
    error: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock('uuid', () => ({
  v4: jest.fn(),
}));

describe('createLetter', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully create a letter when required fields are provided', async () => {
    (uuidv4 as jest.Mock).mockReturnValueOnce('mock-letter-uuid');

    const body = {
      correspondenceId: 'mock-correspondence-id',
      date: '2025-03-10',
      imageURL: 'http://image.url',
      method: 'email',
      status: 'sent',
      text: 'Hello, this is a letter.',
      title: 'Letter to John',
      type: 'sent',
    };

    const context: Context = {} as Context;
    const event: APIGatewayProxyEvent = {
      body: JSON.stringify(body),
      headers: {},
      httpMethod: 'POST',
      isBase64Encoded: false,
      path: '/letter',
      pathParameters: null,
      queryStringParameters: null,
      stageVariables: null,
      requestContext: {} as APIGatewayProxyEvent['requestContext'],
      resource: '',
    } as unknown as APIGatewayProxyEvent;

    const result = (await handler(
      event,
      context,
      () => {},
    )) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(201);
    const responseBody = JSON.parse(result.body || '');
    expect(responseBody.message).toBe('Letter created successfully!');
    expect(responseBody.data).toEqual({
      correspondenceId: 'mock-correspondence-id',
      date: '2025-03-10',
      imageURL: 'http://image.url',
      letterId: 'mock-letter-uuid',
      method: 'email',
      status: 'sent',
      text: 'Hello, this is a letter.',
      title: 'Letter to John',
      type: 'sent',
    });
  });

  it('should return 400 error if required fields are missing', async () => {
    const body = { correspondenceId: 'mock-correspondence-id' }; // Missing required fields
    const context: Context = {} as Context;
    const event: APIGatewayProxyEvent = {
      body: JSON.stringify(body),
      headers: {},
      httpMethod: 'POST',
      isBase64Encoded: false,
      path: '/letter',
      pathParameters: null,
      queryStringParameters: null,
      stageVariables: null,
      requestContext: {} as APIGatewayProxyEvent['requestContext'],
      resource: '',
    } as unknown as APIGatewayProxyEvent;

    const result = (await handler(
      event,
      context,
      () => {},
    )) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(400);
    const responseBody = JSON.parse(result.body || '');
    expect(responseBody.message).toBe(
      'Correspondence ID, date, imageURL, method, status, text, title, and type are required.',
    );
  });

  it('should return 400 error if body is missing', async () => {
    const context: Context = {} as Context;
    const event: APIGatewayProxyEvent = {
      body: null,
      headers: {},
      httpMethod: 'POST',
      isBase64Encoded: false,
      path: '/letter',
      pathParameters: null,
      queryStringParameters: null,
      stageVariables: null,
      requestContext: {} as APIGatewayProxyEvent['requestContext'],
      resource: '',
    } as unknown as APIGatewayProxyEvent;

    const result = (await handler(
      event,
      context,
      () => {},
    )) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(400);
    const responseBody = JSON.parse(result.body || '');
    expect(responseBody.message).toBe('Request body is required.');
  });

  it('should return 500 error if there is a DynamoDB error', async () => {
    const body = {
      correspondenceId: 'mock-correspondence-id',
      date: '2025-03-10',
      imageURL: 'http://image.url',
      method: 'email',
      status: 'sent',
      text: 'Hello, this is a letter.',
      title: 'Letter to John',
      type: 'sent',
    };

    (dynamoClient.send as jest.Mock).mockRejectedValueOnce(
      new Error('DynamoDB error'),
    );

    const context: Context = {} as Context;
    const event: APIGatewayProxyEvent = {
      body: JSON.stringify(body),
      headers: {},
      httpMethod: 'POST',
      isBase64Encoded: false,
      path: '/letter',
      pathParameters: null,
      queryStringParameters: null,
      stageVariables: null,
      requestContext: {} as APIGatewayProxyEvent['requestContext'],
      resource: '',
    } as unknown as APIGatewayProxyEvent;

    const result = (await handler(
      event,
      context,
      () => {},
    )) as APIGatewayProxyResult;

    const responseBody = JSON.parse(result.body || '');
    expect(result.statusCode).toBe(500);
    expect(responseBody.error).toBe('DatabaseError');
    expect(responseBody.message).toBe('Internal Server Error');
    expect(logger.error).toHaveBeenCalledWith(
      'Error creating letter in DynamoDB: ',
      expect.any(Error),
    );
  });

  it('should successfully create a letter with description if provided', async () => {
    (uuidv4 as jest.Mock).mockReturnValueOnce('mock-letter-uuid');

    const body = {
      correspondenceId: 'mock-correspondence-id',
      date: '2025-03-10',
      imageURL: 'http://image.url',
      method: 'email',
      status: 'sent',
      text: 'Hello, this is a letter.',
      title: 'Letter to John',
      type: 'sent',
      description: 'This is a description of the letter.', // Include description
    };

    const context: Context = {} as Context;
    const event: APIGatewayProxyEvent = {
      body: JSON.stringify(body),
      headers: {},
      httpMethod: 'POST',
      isBase64Encoded: false,
      path: '/letter',
      pathParameters: null,
      queryStringParameters: null,
      stageVariables: null,
      requestContext: {} as APIGatewayProxyEvent['requestContext'],
      resource: '',
    } as unknown as APIGatewayProxyEvent;

    const result = (await handler(
      event,
      context,
      () => {},
    )) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(201);
    const responseBody = JSON.parse(result.body || '');
    expect(responseBody.message).toBe('Letter created successfully!');
    expect(responseBody.data).toEqual({
      correspondenceId: 'mock-correspondence-id',
      date: '2025-03-10',
      imageURL: 'http://image.url',
      letterId: 'mock-letter-uuid',
      method: 'email',
      status: 'sent',
      text: 'Hello, this is a letter.',
      title: 'Letter to John',
      type: 'sent',
      description: 'This is a description of the letter.', // Ensure description is present
    });
  });
});

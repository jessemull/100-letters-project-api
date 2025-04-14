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
  getHeaders: jest.fn(),
  logger: {
    error: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock('uuid', () => ({
  v4: jest.fn(),
}));

describe('Create Letter Handler', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully create a letter', async () => {
    (uuidv4 as jest.Mock).mockReturnValueOnce('mock-letter-uuid');
    (dynamoClient.send as jest.Mock).mockResolvedValueOnce({
      Items: [{ correspondenceId: 'mock-correspondence-id' }],
    });

    const body = {
      correspondenceId: 'mock-correspondence-id',
      imageURLs: ['http://image.url'],
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
      imageURLs: ['http://image.url'],
      letterId: 'mock-letter-uuid',
      method: 'email',
      status: 'sent',
      text: 'Hello, this is a letter.',
      title: 'Letter to John',
      type: 'sent',
    });
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
      imageURLs: ['http://image.url'],
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

  it('should successfully create a letter with optional properties if provided', async () => {
    (uuidv4 as jest.Mock).mockReturnValueOnce('mock-letter-uuid');
    (dynamoClient.send as jest.Mock).mockResolvedValueOnce({
      Items: [{ correspondenceId: 'mock-correspondence-id' }],
    });

    const body = {
      correspondenceId: 'mock-correspondence-id',
      description: 'This is a description of the letter.',
      imageURLs: ['http://image.url'],
      method: 'email',
      receivedAt: '2025-03-10',
      sentAt: '2025-03-10',
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
      description: 'This is a description of the letter.',
      imageURLs: ['http://image.url'],
      letterId: 'mock-letter-uuid',
      method: 'email',
      receivedAt: '2025-03-10',
      sentAt: '2025-03-10',
      status: 'sent',
      text: 'Hello, this is a letter.',
      title: 'Letter to John',
      type: 'sent',
    });
  });

  it('should return 404 error if correspondence is not found', async () => {
    const body = {
      correspondenceId: 'mock-correspondence-id',
      imageURLs: ['http://image.url'],
      method: 'email',
      status: 'sent',
      text: 'Hello, this is a letter.',
      title: 'Letter to John',
      type: 'sent',
    };

    (dynamoClient.send as jest.Mock).mockResolvedValueOnce({
      Items: [],
    });

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

    expect(result.statusCode).toBe(404);
    const responseBody = JSON.parse(result.body || '');
    expect(responseBody.error).toBe('NotFoundError');
    expect(responseBody.message).toBe('Correspondence ID not found.');
  });
});

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

describe('Create Recipient Handler', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully create a recipient', async () => {
    (uuidv4 as jest.Mock).mockReturnValueOnce('mock-uuid');

    const body = {
      firstName: 'John',
      lastName: 'Doe',
      address: '123 Street',
      description: 'A description',
      occupation: 'Engineer',
      organization: 'Toyota',
    };

    const context: Context = {} as Context;
    const event: APIGatewayProxyEvent = {
      body: JSON.stringify(body),
      headers: {},
      httpMethod: 'POST',
      isBase64Encoded: false,
      path: '/recipient',
      pathParameters: null,
      queryStringParameters: null,
      searchPartition: 'RECIPIENT',
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
    expect(responseBody.message).toBe('Recipient created successfully!');
    expect(responseBody.data).toEqual({
      recipientId: 'mock-uuid',
      firstName: 'John',
      lastName: 'Doe',
      address: '123 Street',
      description: 'A description',
      occupation: 'Engineer',
      organization: 'Toyota',
      searchPartition: 'RECIPIENT',
    });
  });

  it('should return 400 error if body is missing', async () => {
    const context: Context = {} as Context;
    const event: APIGatewayProxyEvent = {
      body: null,
      headers: {},
      httpMethod: 'POST',
      isBase64Encoded: false,
      path: '/recipient',
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
      firstName: 'John',
      lastName: 'Doe',
      address: '123 Street',
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
      path: '/recipient',
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
      'Error creating recipient in DynamoDB: ',
      expect.any(Error),
    );
  });
});

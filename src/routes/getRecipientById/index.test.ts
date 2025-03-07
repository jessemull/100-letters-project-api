import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from 'aws-lambda';
import { dynamoClient, logger } from '../../common/util';
import { handler } from './index';

jest.mock('../../common/util', () => ({
  dynamoClient: {
    send: jest.fn(),
  },
  logger: {
    error: jest.fn(),
    info: jest.fn(),
  },
}));

describe('getRecipientById', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return the recipient when found', async () => {
    const mockRecipient = { id: '1', lastName: 'Xavier' };
    (dynamoClient.send as jest.Mock).mockResolvedValueOnce({
      Item: mockRecipient,
    });
    const context: Context = {} as Context;
    const event: APIGatewayProxyEvent = {
      body: null,
      headers: {},
      httpMethod: 'GET',
      isBase64Encoded: false,
      path: `/recipient/1`,
      pathParameters: { id: '1' },
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
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body || '').data).toEqual(mockRecipient);
  });

  it('should return a 400 error if no recipientId is provided', async () => {
    const context: Context = {} as Context;
    const event: APIGatewayProxyEvent = {
      body: null,
      headers: {},
      httpMethod: 'GET',
      isBase64Encoded: false,
      path: '/recipient', // Path without ID
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
    expect(JSON.parse(result.body || '').message).toBe(
      'Recipient ID is required!',
    );
  });

  it('should return a 404 error if the recipient is not found', async () => {
    const recipientId = '1';

    (dynamoClient.send as jest.Mock).mockResolvedValueOnce({});

    const context: Context = {} as Context;
    const event: APIGatewayProxyEvent = {
      body: null,
      headers: {},
      httpMethod: 'GET',
      isBase64Encoded: false,
      path: `/recipient/${recipientId}`,
      pathParameters: { id: recipientId },
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
    expect(result.statusCode).toBe(404);
    expect(responseBody.error).toBe('NotFoundError');
    expect(responseBody.message).toBe(
      `Recipient with ID ${recipientId} not found!`,
    );
  });

  it('should return a 500 error if there is a DynamoDB error', async () => {
    const errorMessage = 'DynamoDB error occurred';

    (dynamoClient.send as jest.Mock).mockRejectedValueOnce(
      new Error(errorMessage),
    );

    const context: Context = {} as Context;
    const event: APIGatewayProxyEvent = {
      body: null,
      headers: {},
      httpMethod: 'GET',
      isBase64Encoded: false,
      path: '/recipient/1',
      pathParameters: { id: '1' },
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
      'Error fetching recipient from DynamoDB: ',
      expect.any(Error),
    );
  });
});

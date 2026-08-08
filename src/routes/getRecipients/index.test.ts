import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from 'aws-lambda';
import { dynamoClient } from '../../common/util/dynamo';
import { logger } from '../../common/util/logger';
import { handler } from './index';

jest.mock('../../common/util/dynamo', () => ({
  dynamoClient: {
    send: jest.fn(),
  },
}));

jest.mock('../../common/util/headers', () => ({
  getHeaders: jest.fn(),
}));

jest.mock('../../common/util/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
  },
}));

describe('Get Recipients Handler', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return all recipients', async () => {
    const mockData = [
      { id: '1', lastName: 'Xavier' },
      { id: '2' },
      { id: '3', lastName: 'Adams' },
      { id: '4' },
      { id: '5' },
      { id: '6' },
    ];
    (dynamoClient.send as jest.Mock).mockResolvedValueOnce({
      Items: mockData,
      LastEvaluatedKey: 'lastEvaluatedKey',
    });
    const context: Context = {} as Context;
    const event: APIGatewayProxyEvent = {
      body: null,
      headers: {},
      httpMethod: 'GET',
      isBase64Encoded: false,
      path: '',
      pathParameters: null,
      queryStringParameters: {
        lastEvaluatedKey: JSON.stringify('lastEvaluatedKey'),
        limit: '5',
      },
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
    expect(JSON.parse(result.body).lastEvaluatedKey).toBe(
      '%22lastEvaluatedKey%22',
    );
    expect(JSON.parse(result.body || '').data).toEqual(mockData);
  });

  it('should return an empty array if no recipients exist', async () => {
    (dynamoClient.send as jest.Mock).mockResolvedValueOnce({});
    const context: Context = {} as Context;
    const event: APIGatewayProxyEvent = {
      body: null,
      headers: {},
      httpMethod: 'GET',
      isBase64Encoded: false,
      path: '',
      pathParameters: null,
      queryStringParameters: null,
      stageVariables: null,
      requestContext: {} as APIGatewayProxyEvent['requestContext'],
      resource: '',
    } as APIGatewayProxyEvent;
    const result = (await handler(
      event,
      context,
      () => {},
    )) as APIGatewayProxyResult;
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body || '').data).toEqual([]);
  });

  it('should return an error on failure', async () => {
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
      path: '',
      pathParameters: null,
      queryStringParameters: null,
      stageVariables: null,
      requestContext: {} as APIGatewayProxyEvent['requestContext'],
      resource: '',
    } as APIGatewayProxyEvent;
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
      'Error querying recipients: ',
      expect.any(Error),
    );
  });

  it('should query recipients with search prefix', async () => {
    const mockData = [{ id: '1', lastName: 'Smith' }];
    (dynamoClient.send as jest.Mock).mockResolvedValueOnce({
      Items: mockData,
    });

    const context: Context = {} as Context;
    const event: APIGatewayProxyEvent = {
      body: null,
      headers: {},
      httpMethod: 'GET',
      isBase64Encoded: false,
      path: '',
      pathParameters: null,
      queryStringParameters: {
        search: 'Sm',
      },
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
    const body = JSON.parse(result.body || '');
    expect(body.data).toEqual(mockData);

    const callArgs = (dynamoClient.send as jest.Mock).mock.calls[0][0].input;
    expect(callArgs.KeyConditionExpression).toContain(
      'begins_with(lastName, :prefix)',
    );
    expect(callArgs.ExpressionAttributeValues[':prefix']).toBe('Sm');
  });

  it('should return null for lastEvaluatedKey when item count equals limit but no LastEvaluatedKey is present', async () => {
    const mockData = [
      { id: '1' },
      { id: '2' },
      { id: '3' },
      { id: '4' },
      { id: '5' },
    ];

    (dynamoClient.send as jest.Mock).mockResolvedValueOnce({
      Items: mockData,
      // No LastEvaluatedKey
    });

    const context: Context = {} as Context;
    const event: APIGatewayProxyEvent = {
      body: null,
      headers: {},
      httpMethod: 'GET',
      isBase64Encoded: false,
      path: '',
      pathParameters: null,
      queryStringParameters: {
        limit: '5',
      },
      stageVariables: null,
      requestContext: {} as APIGatewayProxyEvent['requestContext'],
      resource: '',
    } as unknown as APIGatewayProxyEvent;

    const result = (await handler(
      event,
      context,
      () => {},
    )) as APIGatewayProxyResult;
    const body = JSON.parse(result.body || '');

    expect(result.statusCode).toBe(200);
    expect(body.data).toEqual(mockData);
    expect(body.lastEvaluatedKey).toBeNull();
  });

  it('should return 400 for invalid lastEvaluatedKey', async () => {
    const result = (await handler(
      {
        queryStringParameters: { lastEvaluatedKey: '%7Bnot-json' },
        headers: {},
      } as unknown as APIGatewayProxyEvent,
      {} as Context,
      () => {},
    )) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body || '').message).toBe(
      'Invalid lastEvaluatedKey.',
    );
  });
});

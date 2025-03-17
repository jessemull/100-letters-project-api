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
        limit: '25',
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
      'Error scanning from DynamoDB: ',
      expect.any(Error),
    );
  });
});

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

describe('getLetterById', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return the letter when found', async () => {
    const mockLetter = { letterId: '1', lastName: 'Xavier' };
    (dynamoClient.send as jest.Mock).mockResolvedValueOnce({
      Items: [mockLetter], // Corrected response structure
    });
    const context: Context = {} as Context;
    const event: APIGatewayProxyEvent = {
      body: null,
      headers: {},
      httpMethod: 'GET',
      isBase64Encoded: false,
      path: `/letter/1`,
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
    expect(JSON.parse(result.body || '').data).toEqual(mockLetter);
  });

  it('should return a 400 error if no letterId is provided', async () => {
    const context: Context = {} as Context;
    const event: APIGatewayProxyEvent = {
      body: null,
      headers: {},
      httpMethod: 'GET',
      isBase64Encoded: false,
      path: '/letter', // Path without ID
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
      'Letter ID is required!',
    );
  });

  it('should return a 404 error if the letter is not found', async () => {
    const letterId = '1';

    (dynamoClient.send as jest.Mock).mockResolvedValueOnce({
      Items: [],
    });

    const context: Context = {} as Context;
    const event: APIGatewayProxyEvent = {
      body: null,
      headers: {},
      httpMethod: 'GET',
      isBase64Encoded: false,
      path: `/letter/${letterId}`,
      pathParameters: { id: letterId },
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
    expect(responseBody.message).toBe(`Letter with ID ${letterId} not found!`);
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
      path: '/letter/1',
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
      'Error fetching letter from DynamoDB: ',
      expect.any(Error),
    );
  });

  it('should return a 404 error if result.Items is undefined', async () => {
    const letterId = '1';

    (dynamoClient.send as jest.Mock).mockResolvedValueOnce({
      Items: undefined,
    });

    const context: Context = {} as Context;
    const event: APIGatewayProxyEvent = {
      body: null,
      headers: {},
      httpMethod: 'GET',
      isBase64Encoded: false,
      path: `/letter/${letterId}`,
      pathParameters: { id: letterId },
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
    expect(responseBody.message).toBe(`Letter with ID ${letterId} not found!`);
  });
});

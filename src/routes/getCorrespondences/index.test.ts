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
  getHeaders: jest.fn(),
  logger: {
    error: jest.fn(),
    info: jest.fn(),
  },
}));

describe('Get Correspondences Handler', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should return all correspondences with recipient and letters', async () => {
    const mockCorrespondences = [
      { correspondenceId: '1', recipientId: '123' },
      { correspondenceId: '2', recipientId: '456' },
    ];

    const mockRecipient = { recipientId: '123', name: 'John Doe' };
    const mockLetters = [{ correspondenceId: '1', text: 'Letter 1' }];

    (dynamoClient.send as jest.Mock).mockResolvedValueOnce({
      Items: mockCorrespondences,
      LastEvaluatedKey: 'lastEvaluatedKey',
    });

    (dynamoClient.send as jest.Mock).mockResolvedValueOnce({
      Item: mockRecipient,
    });

    (dynamoClient.send as jest.Mock).mockResolvedValue({
      Items: mockLetters,
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
    expect(JSON.parse(result.body || '').data).toEqual([
      {
        correspondenceId: '1',
        recipientId: '123',
        recipient: mockRecipient,
        letters: mockLetters,
      },
      {
        correspondenceId: '2',
        recipientId: '456',
        recipient: null,
        letters: mockLetters,
      },
    ]);
  });

  it('should return empty array if no correspondences exist', async () => {
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

  it('should return an error if scanning for correspondences fails', async () => {
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
      'Error fetching correspondences:',
      expect.any(Error),
    );
  });

  it('should return an error if fetching recipient data fails', async () => {
    const mockCorrespondences = [{ correspondenceId: '1', recipientId: '123' }];

    const mockLetters = [{ correspondenceId: '1', text: 'Letter 1' }];

    (dynamoClient.send as jest.Mock).mockResolvedValueOnce({
      Items: mockCorrespondences,
    });

    (dynamoClient.send as jest.Mock).mockRejectedValueOnce(
      new Error('Recipient fetch error'),
    );
    (dynamoClient.send as jest.Mock).mockResolvedValueOnce({
      Items: mockLetters,
    });

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
    expect(JSON.parse(result.body || '').data).toEqual([
      {
        correspondenceId: '1',
        recipientId: '123',
        recipient: null,
        letters: mockLetters,
      },
    ]);
    expect(logger.error).toHaveBeenCalledWith(
      'Error fetching recipient with ID 123: ',
      expect.any(Error),
    );
  });

  it('should return an error if fetching letters data fails', async () => {
    const mockCorrespondences = [{ correspondenceId: '1', recipientId: '123' }];

    const mockRecipient = { recipientId: '123', name: 'John Doe' };

    (dynamoClient.send as jest.Mock).mockResolvedValueOnce({
      Items: mockCorrespondences,
    });

    (dynamoClient.send as jest.Mock).mockResolvedValueOnce({
      Item: mockRecipient,
    });

    (dynamoClient.send as jest.Mock).mockRejectedValueOnce(
      new Error('Letters fetch error'),
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

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body || '').data).toEqual([
      {
        correspondenceId: '1',
        recipientId: '123',
        recipient: mockRecipient,
        letters: [],
      },
    ]);
    expect(logger.error).toHaveBeenCalledWith(
      'Error fetching letters for correspondence ID 1: ',
      expect.any(Error),
    );
  });

  it('should return empty letters array if letters result is undefined', async () => {
    const mockCorrespondences = [{ correspondenceId: '1', recipientId: '123' }];
    const mockRecipient = { recipientId: '123', name: 'John Doe' };

    (dynamoClient.send as jest.Mock).mockResolvedValueOnce({
      Items: mockCorrespondences,
    });

    (dynamoClient.send as jest.Mock).mockResolvedValueOnce({
      Item: mockRecipient,
    });

    (dynamoClient.send as jest.Mock).mockResolvedValueOnce({
      Items: undefined,
    });

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
    expect(JSON.parse(result.body || '').data).toEqual([
      {
        correspondenceId: '1',
        recipientId: '123',
        recipient: mockRecipient,
        letters: [],
      },
    ]);
  });
});

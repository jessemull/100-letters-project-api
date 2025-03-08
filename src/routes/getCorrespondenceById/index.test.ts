import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
  Callback,
} from 'aws-lambda';
import { dynamoClient } from '../../common/util';
import { handler } from './index';

jest.mock('../../common/util', () => ({
  dynamoClient: {
    send: jest.fn(),
  },
  logger: {
    error: jest.fn(),
  },
}));

describe('Handler tests', () => {
  const mockEvent = {
    pathParameters: {
      id: '123',
    },
    body: null,
    queryStringParameters: null,
    headers: {},
    requestContext: {} as unknown,
    isBase64Encoded: false,
  } as unknown as APIGatewayProxyEvent;

  const mockContext: Context = {} as Context;
  const mockCallback: Callback = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  it('should return 400 if correspondenceId is missing in pathParameters', async () => {
    const eventWithoutId = {
      ...mockEvent,
      pathParameters: {},
    } as unknown as APIGatewayProxyEvent;

    const response = (await handler(
      eventWithoutId,
      mockContext,
      mockCallback,
    )) as APIGatewayProxyResult;

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).message).toBe(
      'Correspondence ID is required.',
    );
  });

  it('should return 400 if correspondenceId is undefined in pathParameters', async () => {
    const eventWithoutId = {
      ...mockEvent,
      pathParameters: undefined,
    } as unknown as APIGatewayProxyEvent;

    const response = (await handler(
      eventWithoutId,
      mockContext,
      mockCallback,
    )) as APIGatewayProxyResult;

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).message).toBe(
      'Correspondence ID is required.',
    );
  });

  it('should return 404 if correspondence is not found', async () => {
    (dynamoClient.send as jest.Mock).mockResolvedValueOnce({ Item: null });

    const response = (await handler(
      mockEvent,
      mockContext,
      mockCallback,
    )) as APIGatewayProxyResult;

    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.body).message).toBe('Correspondence not found!');
  });

  it('should return 404 if recipient is not found', async () => {
    (dynamoClient.send as jest.Mock).mockResolvedValueOnce({
      Item: { correspondenceId: '123', recipientId: '456' },
    });
    (dynamoClient.send as jest.Mock).mockResolvedValueOnce({});

    const response = (await handler(
      mockEvent,
      mockContext,
      mockCallback,
    )) as APIGatewayProxyResult;

    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.body).message).toBe('Recipient not found!');
  });

  it('should return 500 if there is an error fetching correspondence', async () => {
    (dynamoClient.send as jest.Mock).mockRejectedValueOnce(
      new Error('DynamoDB error'),
    );

    const response = (await handler(
      mockEvent,
      mockContext,
      mockCallback,
    )) as APIGatewayProxyResult;

    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.body).message).toBe('Internal Server Error');
  });

  it('should return 500 if there is an error fetching recipient', async () => {
    (dynamoClient.send as jest.Mock).mockResolvedValueOnce({
      Item: { correspondenceId: '123', recipientId: '456' },
    });
    (dynamoClient.send as jest.Mock).mockRejectedValueOnce(
      new Error('DynamoDB error'),
    );

    const response = (await handler(
      mockEvent,
      mockContext,
      mockCallback,
    )) as APIGatewayProxyResult;

    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.body).message).toBe('Internal Server Error');
  });

  it('should return 500 if there is an error fetching letters', async () => {
    (dynamoClient.send as jest.Mock).mockResolvedValueOnce({
      Item: { correspondenceId: '123', recipientId: '456' },
    });
    (dynamoClient.send as jest.Mock).mockResolvedValueOnce({
      Item: { recipientId: '456' },
    });
    (dynamoClient.send as jest.Mock).mockRejectedValueOnce(
      new Error('DynamoDB error'),
    );

    const response = (await handler(
      mockEvent,
      mockContext,
      mockCallback,
    )) as APIGatewayProxyResult;

    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.body).message).toBe('Internal Server Error');
  });

  it('should return 200 with correspondence, recipient, and letters', async () => {
    (dynamoClient.send as jest.Mock).mockResolvedValueOnce({
      Item: { correspondenceId: '123', recipientId: '456' },
    });
    (dynamoClient.send as jest.Mock).mockResolvedValueOnce({
      Item: { recipientId: '456' },
    });
    (dynamoClient.send as jest.Mock).mockResolvedValueOnce({
      Items: [{ letterId: 'abc', correspondenceId: '123' }],
    });

    const response = (await handler(
      mockEvent,
      mockContext,
      mockCallback,
    )) as APIGatewayProxyResult;

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).data.correspondence).toEqual({
      correspondenceId: '123',
      recipientId: '456',
    });
    expect(JSON.parse(response.body).data.recipient).toEqual({
      recipientId: '456',
    });
    expect(JSON.parse(response.body).data.letters).toEqual([
      { letterId: 'abc', correspondenceId: '123' },
    ]);
  });

  it('should handle undefined or null recipient in correspondence', async () => {
    (dynamoClient.send as jest.Mock).mockResolvedValueOnce({
      Item: { correspondenceId: '123' },
    });
    (dynamoClient.send as jest.Mock).mockResolvedValueOnce({});

    const response = (await handler(
      mockEvent,
      mockContext,
      mockCallback,
    )) as APIGatewayProxyResult;

    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.body).message).toBe('Recipient not found!');
  });

  it('should return empty array for letters when no letters are found', async () => {
    (dynamoClient.send as jest.Mock).mockResolvedValueOnce({
      Item: { correspondenceId: '123', recipientId: '456' },
    });

    (dynamoClient.send as jest.Mock).mockResolvedValueOnce({
      Item: { recipientId: '456', name: 'John Doe' },
    });

    (dynamoClient.send as jest.Mock).mockResolvedValueOnce({});

    const response: APIGatewayProxyResult = (await handler(
      mockEvent,
      mockContext,
      mockCallback,
    )) as APIGatewayProxyResult;

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).data.letters).toEqual([]);
  });

  it('should handle optional chaining with undefined values for pathParameters', async () => {
    const eventWithoutId = {
      ...mockEvent,
      pathParameters: undefined,
    } as unknown as APIGatewayProxyEvent;

    const response = (await handler(
      eventWithoutId,
      mockContext,
      mockCallback,
    )) as APIGatewayProxyResult;

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).message).toBe(
      'Correspondence ID is required.',
    );
  });
});

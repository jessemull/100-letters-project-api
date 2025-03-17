import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
  Callback,
  APIGatewayEventDefaultAuthorizerContext,
  APIGatewayEventRequestContextWithAuthorizer,
} from 'aws-lambda';
import { TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
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

describe('Delete Correspondence Handler', () => {
  const mockEvent = {
    pathParameters: {
      id: '123',
    },
    body: null,
    queryStringParameters: null,
    headers: {},
    requestContext:
      {} as APIGatewayEventRequestContextWithAuthorizer<APIGatewayEventDefaultAuthorizerContext>,
    isBase64Encoded: false,
  } as unknown as APIGatewayProxyEvent;

  const mockContext: Context = {} as Context;
  const mockCallback: Callback = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 404 if correspondence is not found', async () => {
    (dynamoClient.send as jest.Mock).mockResolvedValueOnce({ Item: null });

    const response: APIGatewayProxyResult = (await handler(
      mockEvent,
      mockContext,
      mockCallback,
    )) as APIGatewayProxyResult;

    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.body).message).toBe('Correspondence not found.');
  });

  it('should return 500 if there is an error retrieving correspondence', async () => {
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

  it('should delete correspondence, recipient, and letters if they exist', async () => {
    (dynamoClient.send as jest.Mock).mockResolvedValueOnce({
      Item: { correspondenceId: '123', recipientId: '456' },
    });

    (dynamoClient.send as jest.Mock).mockResolvedValueOnce({
      Items: [
        { letterId: 'abc', correspondenceId: '123' },
        { letterId: 'def', correspondenceId: '123' },
      ],
    });

    (dynamoClient.send as jest.Mock).mockResolvedValueOnce({});

    const response = (await handler(
      mockEvent,
      mockContext,
      mockCallback,
    )) as APIGatewayProxyResult;

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).message).toBe(
      'Correspondence, recipient and letters deleted successfully!',
    );
    expect(dynamoClient.send).toHaveBeenCalledWith(
      expect.any(TransactWriteCommand),
    );
  });

  it('should return 500 if there is an error performing the transaction', async () => {
    (dynamoClient.send as jest.Mock).mockResolvedValueOnce({
      Item: { correspondenceId: '123', recipientId: '456' },
    });

    (dynamoClient.send as jest.Mock).mockResolvedValueOnce({
      Items: [{ letterId: 'abc', correspondenceId: '123' }],
    });

    (dynamoClient.send as jest.Mock).mockRejectedValueOnce(
      new Error('Transaction error'),
    );

    const response = (await handler(
      mockEvent,
      mockContext,
      mockCallback,
    )) as APIGatewayProxyResult;

    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.body).message).toBe('Internal Server Error');
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

  it('should return 404 if pathParameters are missing', async () => {
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

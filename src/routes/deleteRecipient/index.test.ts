import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
  Callback,
} from 'aws-lambda';
import { handler } from './index';
import { dynamoClient } from '../../common/util';

jest.mock('../../common/util', () => ({
  dynamoClient: {
    send: jest.fn(),
  },
  getHeaders: jest.fn(),
  logger: {
    error: jest.fn(),
  },
}));

describe('Delete Recipient Handler', () => {
  const mockContext: Context = {} as Context;
  const mockCallback: Callback = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  it('should return 400 if recipientId is missing from path parameters', async () => {
    const event = {
      pathParameters: null,
    } as unknown as APIGatewayProxyEvent;

    const response = (await handler(
      event,
      mockContext,
      mockCallback,
    )) as APIGatewayProxyResult;

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).message).toBe('Recipient ID is required.');
  });

  it('should return 400 if recipient is attached to one or more correspondences', async () => {
    const event = {
      pathParameters: { id: '123' },
    } as unknown as APIGatewayProxyEvent;

    const mockQueryResult = { Items: [{ correspondenceId: '1' }] };
    (dynamoClient.send as jest.Mock).mockResolvedValueOnce(mockQueryResult);

    const response = (await handler(
      event,
      mockContext,
      mockCallback,
    )) as APIGatewayProxyResult;

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).message).toBe(
      'Cannot delete recipient. It is attached to one or more correspondences!',
    );
  });

  it('should return 500 if there is an error querying the correspondence table', async () => {
    const event = {
      pathParameters: { id: '123' },
    } as unknown as APIGatewayProxyEvent;

    (dynamoClient.send as jest.Mock).mockRejectedValueOnce(
      new Error('DynamoDB error'),
    );

    const response = (await handler(
      event,
      mockContext,
      mockCallback,
    )) as APIGatewayProxyResult;

    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.body).message).toBe('Internal Server Error');
  });

  it('should return 200 when recipient is deleted successfully', async () => {
    const event = {
      pathParameters: { id: '123' },
    } as unknown as APIGatewayProxyEvent;

    const mockQueryResult = { Items: [] };
    (dynamoClient.send as jest.Mock).mockResolvedValueOnce(mockQueryResult);

    const mockDeleteResult = {};

    (dynamoClient.send as jest.Mock).mockResolvedValueOnce(mockDeleteResult);

    const response = (await handler(
      event,
      mockContext,
      mockCallback,
    )) as APIGatewayProxyResult;

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).message).toBe(
      'Recipient deleted successfully!',
    );
  });

  it('should return 500 if there is an error deleting the recipient', async () => {
    const event = {
      pathParameters: { id: '123' },
    } as unknown as APIGatewayProxyEvent;

    const mockQueryResult = { Items: [] };
    (dynamoClient.send as jest.Mock).mockResolvedValueOnce(mockQueryResult);

    (dynamoClient.send as jest.Mock).mockRejectedValueOnce(
      new Error('DynamoDB error'),
    );

    const response = (await handler(
      event,
      mockContext,
      mockCallback,
    )) as APIGatewayProxyResult;

    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.body).message).toBe('Internal Server Error');
  });
});

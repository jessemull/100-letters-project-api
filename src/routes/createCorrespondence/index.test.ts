import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
  Callback,
} from 'aws-lambda';
import { handler } from './index';
import { dynamoClient } from '../../common/util/dynamo';
import { randomUUID } from 'crypto';

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
  },
}));

jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  randomUUID: jest.fn(),
}));

describe('Create Correspondence Handler', () => {
  const mockContext: Context = {} as Context;
  const mockCallback: Callback = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  it('should return 400 if request body is missing', async () => {
    const event = {
      body: null,
    } as unknown as APIGatewayProxyEvent;

    const response = (await handler(
      event,
      mockContext,
      mockCallback,
    )) as APIGatewayProxyResult;

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).message).toBe('Request body is required.');
  });

  it('should return 500 if there is an error during the transaction', async () => {
    const event = {
      body: JSON.stringify({
        recipient: { name: 'John Doe' },
        correspondence: {
          reason: {
            category: 'Technology',
            description: 'Test',
          },
          status: 'COMPLETED',
          title: 'Test Correspondence',
        },
        letters: [{ letterId: 'letter123', content: 'Hello' }],
      }),
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

  it('should return 400 if the create transaction is canceled', async () => {
    const event = {
      body: JSON.stringify({
        recipient: { name: 'John Doe' },
        correspondence: {
          reason: {
            category: 'Technology',
            description: 'Test',
          },
          status: 'COMPLETED',
          title: 'Test Correspondence',
        },
        letters: [{ letterId: 'letter123', content: 'Hello' }],
      }),
    } as unknown as APIGatewayProxyEvent;

    const canceledError = new Error('Transaction canceled');
    canceledError.name = 'TransactionCanceledException';
    (dynamoClient.send as jest.Mock).mockRejectedValueOnce(canceledError);

    const response = (await handler(
      event,
      mockContext,
      mockCallback,
    )) as APIGatewayProxyResult;

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).message).toBe(
      'One or more items already exist or the create transaction was canceled.',
    );
  });

  it('should return 201 when correspondence, recipient, and letters are successfully created', async () => {
    const event = {
      body: JSON.stringify({
        recipient: { recipientId: 'mock-uuid' },
        correspondence: {
          reason: {
            category: 'Technology',
            description: 'Test',
          },
          status: 'COMPLETE',
          title: 'Test Correspondence',
        },
        letters: [{ letterId: 'mock-uuid' }],
      }),
    } as unknown as APIGatewayProxyEvent;

    (randomUUID as jest.Mock).mockReturnValue('mock-uuid');

    (dynamoClient.send as jest.Mock).mockResolvedValueOnce({});

    const expected = {
      correspondence: {
        correspondenceId: 'mock-uuid',
        recipientId: 'mock-uuid',
        reason: {
          category: 'Technology',
          description: 'Test',
        },
        searchPartition: 'CORRESPONDENCE',
        status: 'COMPLETE',
        title: 'Test Correspondence',
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      },
      recipient: {
        recipientId: 'mock-uuid',
        searchPartition: 'RECIPIENT',
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      },
      letters: [
        {
          letterId: 'mock-uuid',
          correspondenceId: 'mock-uuid',
          searchPartition: 'LETTER',
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
      ],
    };

    const response = (await handler(
      event,
      mockContext,
      mockCallback,
    )) as APIGatewayProxyResult;

    expect(response.statusCode).toBe(201);
    expect(JSON.parse(response.body).message).toBe(
      'Correspondence created successfully!',
    );
    expect(JSON.parse(response.body).data).toEqual(expected);
  });

  it('should return 500 if there is an error during the put request', async () => {
    const event = {
      body: JSON.stringify({
        recipient: { name: 'John Doe' },
        correspondence: {
          reason: {
            category: 'Technology',
            description: 'Test',
          },
          status: 'COMPLETED',
          title: 'Test Correspondence',
        },
        letters: [{ letterId: 'letter123', content: 'Hello' }],
      }),
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

  it('should return 400 if too many letters for a single transaction', async () => {
    const letters = Array.from({ length: 99 }, (_, i) => ({
      letterId: `letter-${i}`,
      text: 'Hello',
    }));

    const event = {
      body: JSON.stringify({
        recipient: { firstName: 'John', lastName: 'Doe', address: '1 St' },
        correspondence: {
          reason: { category: 'Technology', description: 'Test' },
          status: 'COMPLETED',
          title: 'Test Correspondence',
        },
        letters,
      }),
    } as unknown as APIGatewayProxyEvent;

    const response = (await handler(
      event,
      mockContext,
      mockCallback,
    )) as APIGatewayProxyResult;

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).message).toContain(
      'Too many letters for a single transaction',
    );
  });
});

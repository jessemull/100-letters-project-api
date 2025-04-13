import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
  Callback,
} from 'aws-lambda';
import { handler } from './index';
import { dynamoClient } from '../../common/util';
import { v4 as uuidv4 } from 'uuid';

jest.mock('../../common/util', () => ({
  dynamoClient: {
    send: jest.fn(),
  },
  getHeaders: jest.fn(),
  logger: {
    error: jest.fn(),
  },
}));

jest.mock('uuid', () => ({
  v4: jest.fn(),
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
            description: 'Test',
            domain: 'Test Domain',
            impact: 'HIGH',
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

  it('should return 201 when correspondence, recipient, and letters are successfully created', async () => {
    const event = {
      body: JSON.stringify({
        recipient: { recipientId: 'mock-uuid' },
        correspondence: {
          reason: {
            description: 'Test',
            domain: 'Test Domain',
            impact: 'HIGH',
          },
          status: 'COMPLETE',
          title: 'Test Correspondence',
        },
        letters: [{ letterId: 'mock-uuid' }],
      }),
    } as unknown as APIGatewayProxyEvent;

    (uuidv4 as jest.Mock).mockReturnValue('mock-uuid');

    (dynamoClient.send as jest.Mock).mockResolvedValueOnce({});

    const expected = {
      correspondence: {
        correspondenceId: 'mock-uuid',
        recipientId: 'mock-uuid',
        reason: { description: 'Test', domain: 'Test Domain', impact: 'HIGH' },
        status: 'COMPLETE',
        title: 'Test Correspondence',
      },
      recipient: {
        recipientId: 'mock-uuid',
      },
      letters: [
        {
          letterId: 'mock-uuid',
          correspondenceId: 'mock-uuid',
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
            description: 'Test',
            domain: 'Test Domain',
            impact: 'HIGH',
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
});

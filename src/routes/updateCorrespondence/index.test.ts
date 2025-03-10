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
    body: JSON.stringify({
      recipient: {
        recipientId: '1',
        firstName: 'John',
        lastName: 'Doe',
        address: '123 Street',
      },
      correspondence: { reason: 'Just because' },
      letters: [
        {
          letterId: 'abc',
          date: '2025-03-09',
          imageURL: '',
          method: 'email',
          status: 'sent',
          text: 'Hello',
          title: 'Letter 1',
          type: 'formal',
        },
      ],
    }),
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
      'Correspondence ID is required in the path parameters.',
    );
  });

  it('should return 400 if no body is provided', async () => {
    const eventWithoutBody = {
      ...mockEvent,
      body: null,
    } as unknown as APIGatewayProxyEvent;

    const response = (await handler(
      eventWithoutBody,
      mockContext,
      mockCallback,
    )) as APIGatewayProxyResult;

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).message).toBe('Request body is required.');
  });

  it('should return 400 if recipient, correspondence, or letters are missing in the body', async () => {
    const eventMissingFields = {
      ...mockEvent,
      body: JSON.stringify({}),
    } as unknown as APIGatewayProxyEvent;

    const response = (await handler(
      eventMissingFields,
      mockContext,
      mockCallback,
    )) as APIGatewayProxyResult;

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).message).toBe(
      'Recipient, correspondence, and letters are required.',
    );
  });

  it('should update recipient with optional description and occupation fields, and handle letter description', async () => {
    const eventWithOptionalFields = {
      ...mockEvent,
      body: JSON.stringify({
        recipient: {
          recipientId: '1',
          firstName: 'John',
          lastName: 'Doe',
          address: '123 Street',
          description: 'A good friend',
          occupation: 'Writer',
        },
        correspondence: { reason: 'Just because' },
        letters: [
          {
            date: '2025-03-09',
            imageURL: '',
            method: 'email',
            status: 'sent',
            text: 'Hello',
            title: 'Letter 1',
            type: 'formal',
            description: 'First letter in the series',
          },
        ],
      }),
    } as unknown as APIGatewayProxyEvent;

    (dynamoClient.send as jest.Mock).mockResolvedValueOnce({});
    (dynamoClient.send as jest.Mock).mockResolvedValueOnce({ Item: {} });
    (dynamoClient.send as jest.Mock).mockResolvedValueOnce({ Item: {} });
    (dynamoClient.send as jest.Mock).mockResolvedValueOnce({ Item: {} });

    const response = (await handler(
      eventWithOptionalFields,
      mockContext,
      mockCallback,
    )) as APIGatewayProxyResult;

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).message).toBe(
      'Correspondence updated successfully.',
    );
    expect(
      JSON.stringify((dynamoClient.send as jest.Mock).mock.calls).includes(
        '#description = :description',
      ),
    );
    expect(
      JSON.stringify((dynamoClient.send as jest.Mock).mock.calls).includes(
        '#occupation = :occupation',
      ),
    );
  });

  it('should return 500 if there is a DynamoDB error', async () => {
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
    (dynamoClient.send as jest.Mock)
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        Item: { correspondenceId: '123', recipientId: '456' },
      })
      .mockResolvedValueOnce({
        Item: { recipientId: '456', firstName: 'John', lastName: 'Doe' },
      })
      .mockResolvedValueOnce({
        Item: {
          letterId: 'abc',
          correspondenceId: '123',
          text: 'Hello',
          title: 'Letter 1',
        },
      });

    const response = (await handler(
      mockEvent,
      mockContext,
      mockCallback,
    )) as APIGatewayProxyResult;

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      message: 'Correspondence updated successfully.',
      data: {
        correspondence: { correspondenceId: '123', recipientId: '456' },
        recipient: { recipientId: '456', firstName: 'John', lastName: 'Doe' },
        letters: [
          {
            letterId: 'abc',
            correspondenceId: '123',
            text: 'Hello',
            title: 'Letter 1',
          },
        ],
      },
    });
  });

  it('should return 500 if an unexpected error occurs', async () => {
    (dynamoClient.send as jest.Mock).mockRejectedValueOnce(
      new Error('Unexpected error'),
    );

    const response = (await handler(
      mockEvent,
      mockContext,
      mockCallback,
    )) as APIGatewayProxyResult;

    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.body).message).toBe('Internal Server Error');
  });

  it('should return 400 if pathParameters is undefined', async () => {
    const eventWithoutPathParams = {
      ...mockEvent,
      pathParameters: undefined,
    } as unknown as APIGatewayProxyEvent;

    const response = (await handler(
      eventWithoutPathParams,
      mockContext,
      mockCallback,
    )) as APIGatewayProxyResult;

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).message).toBe(
      'Correspondence ID is required in the path parameters.',
    );
  });
});

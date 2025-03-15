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
  logger: {
    error: jest.fn(),
  },
}));

describe('Update Letter Handler', () => {
  const mockContext: Context = {} as Context;
  const mockCallback: Callback = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  it('should return 400 if letterId is missing from path parameters', async () => {
    const event = {
      body: JSON.stringify({
        correspondenceId: '123',
        date: '2025-03-12',
        imageURLs: 'http://example.com',
        method: 'email',
        status: 'sent',
        text: 'Sample text',
        title: 'Sample title',
        type: 'Update',
      }),
    } as unknown as APIGatewayProxyEvent;

    const response = (await handler(
      event,
      mockContext,
      mockCallback,
    )) as APIGatewayProxyResult;

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).message).toBe('Letter ID is required.');
  });

  it('should return 404 if letter is not found', async () => {
    const event = {
      pathParameters: { id: '123' },
      body: JSON.stringify({
        correspondenceId: 'abc',
        date: '2025-03-12',
        imageURLs: ['http://example.com/image.jpg'],
        method: 'email',
        status: 'sent',
        text: 'Sample text',
        title: 'Sample title',
        type: 'update',
      }),
    } as unknown as APIGatewayProxyEvent;

    const mockCorrespondenceResult = {
      Items: [{ correspondenceId: 'abc' }],
    };

    const mockLetterResult = {
      Attributes: undefined,
    };

    (dynamoClient.send as jest.Mock).mockResolvedValueOnce(
      mockCorrespondenceResult,
    );
    (dynamoClient.send as jest.Mock).mockResolvedValueOnce(mockLetterResult);

    const response = (await handler(
      event,
      mockContext,
      mockCallback,
    )) as APIGatewayProxyResult;

    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.body).message).toBe('Letter not found.');
  });

  it('should return 400 if request body is missing', async () => {
    const event = {
      pathParameters: { id: '123' },
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

  it('should return 404 if correspondence ID is not found in DynamoDB', async () => {
    const event = {
      pathParameters: { id: '123' },
      body: JSON.stringify({
        correspondenceId: '123',
        date: '2025-03-12',
        imageURLs: 'http://example.com',
        method: 'email',
        status: 'sent',
        text: 'Sample text',
        title: 'Sample title',
        type: 'Update',
      }),
    } as unknown as APIGatewayProxyEvent;

    (dynamoClient.send as jest.Mock).mockResolvedValueOnce({ Items: [] });

    const response = (await handler(
      event,
      mockContext,
      mockCallback,
    )) as APIGatewayProxyResult;

    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.body).message).toBe(
      'Correspondence ID not found.',
    );
  });

  it('should return 500 if there is an error during the update operation', async () => {
    const event = {
      pathParameters: { id: '123' },
      body: JSON.stringify({
        correspondenceId: '123',
        date: '2025-03-12',
        imageURLs: 'http://example.com',
        method: 'email',
        status: 'sent',
        text: 'Sample text',
        title: 'Sample title',
        type: 'Update',
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

  it('should return 404 if letter not found in DynamoDB', async () => {
    const event = {
      pathParameters: { id: '123' },
      body: JSON.stringify({
        correspondenceId: 'abc',
        date: '2025-03-12',
        imageURLs: ['http://example.com/image.jpg'],
        method: 'email',
        status: 'sent',
        text: 'Sample text',
        title: 'Sample title',
        type: 'update',
      }),
    } as unknown as APIGatewayProxyEvent;

    (dynamoClient.send as jest.Mock).mockResolvedValueOnce({ Items: [] });

    const response = (await handler(
      event,
      mockContext,
      mockCallback,
    )) as APIGatewayProxyResult;

    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.body).message).toBe(
      'Correspondence ID not found.',
    );
  });

  it('should update letter successfully when all required fields are provided', async () => {
    const event = {
      pathParameters: { id: '123' },
      body: JSON.stringify({
        correspondenceId: 'abc',
        date: '2025-03-12',
        imageURLs: ['http://example.com/image.jpg'],
        method: 'email',
        status: 'sent',
        text: 'Sample text',
        title: 'Sample title',
        type: 'update',
      }),
    } as unknown as APIGatewayProxyEvent;

    const mockCorrespondenceResult = {
      Items: [{ correspondenceId: 'abc' }],
    };
    const mockLetterResult = {
      Attributes: {
        letterId: '123',
        correspondenceId: 'abc',
        date: '2025-03-12',
        imageURLs: ['http://example.com/image.jpg'],
        method: 'email',
        status: 'sent',
        text: 'Sample text',
        title: 'Sample title',
        type: 'update',
      },
    };

    (dynamoClient.send as jest.Mock).mockResolvedValueOnce(
      mockCorrespondenceResult,
    );
    (dynamoClient.send as jest.Mock).mockResolvedValueOnce(mockLetterResult);

    const response = (await handler(
      event,
      mockContext,
      mockCallback,
    )) as APIGatewayProxyResult;

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).message).toBe(
      'Letter updated successfully!',
    );
    expect(JSON.parse(response.body).data).toEqual(mockLetterResult.Attributes);
  });

  it('should correctly handle optional properties if provided', async () => {
    const event = {
      pathParameters: { id: '123' },
      body: JSON.stringify({
        correspondenceId: 'abc',
        date: '2025-03-12',
        description: 'Sample description',
        imageURLs: ['http://example.com/image.jpg'],
        method: 'email',
        receivedAt: '2025-03-12',
        sentAt: '2025-03-12',
        status: 'sent',
        text: 'Sample text',
        title: 'Sample title',
        type: 'update',
      }),
    } as unknown as APIGatewayProxyEvent;

    const mockCorrespondenceResult = {
      Items: [{ correspondenceId: 'abc' }],
    };
    const mockLetterResult = {
      Attributes: {
        correspondenceId: 'abc',
        date: '2025-03-12',
        description: 'Sample description',
        imageURLs: ['http://example.com/image.jpg'],
        letterId: '123',
        method: 'email',
        receivedAt: '2025-03-12',
        sentAt: '2025-03-12',
        status: 'sent',
        text: 'Sample text',
        title: 'Sample title',
        type: 'update',
      },
    };

    (dynamoClient.send as jest.Mock).mockResolvedValueOnce(
      mockCorrespondenceResult,
    );
    (dynamoClient.send as jest.Mock).mockResolvedValueOnce(mockLetterResult);

    const response = (await handler(
      event,
      mockContext,
      mockCallback,
    )) as APIGatewayProxyResult;

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).message).toBe(
      'Letter updated successfully!',
    );
    expect(JSON.parse(response.body).data.description).toBe(
      'Sample description',
    );
  });
});

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

  it('should return 400 if letterId is missing from the path parameters', async () => {
    const event = {
      pathParameters: {},
      body: JSON.stringify({
        correspondenceId: '456',
        date: '2025-03-10',
        imageURL: 'https://example.com/image.jpg',
        method: 'email',
        status: 'sent',
        text: 'Hello world',
        title: 'First letter',
        type: 'sent',
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

  it('should return 400 if required fields are missing in the body', async () => {
    const event = {
      pathParameters: { id: '123' },
      body: JSON.stringify({}),
    } as unknown as APIGatewayProxyEvent;

    const response = (await handler(
      event,
      mockContext,
      mockCallback,
    )) as APIGatewayProxyResult;

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).message).toBe(
      'Correspondence ID, date, imageURL, method, status, text, title, and type are required.',
    );
  });

  it('should return 500 if there is an error during the update operation', async () => {
    const event = {
      pathParameters: { id: '123' },
      body: JSON.stringify({
        correspondenceId: '456',
        date: '2025-03-10',
        imageURL: 'https://example.com/image.jpg',
        method: 'email',
        status: 'sent',
        text: 'Hello world',
        title: 'First letter',
        type: 'sent',
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

  it('should return 200 when the letter is updated successfully', async () => {
    const event = {
      pathParameters: { id: '123' },
      body: JSON.stringify({
        correspondenceId: '456',
        date: '2025-03-10',
        imageURL: 'https://example.com/image.jpg',
        method: 'email',
        status: 'sent',
        text: 'Hello world',
        title: 'First letter',
        type: 'sent',
      }),
    } as unknown as APIGatewayProxyEvent;

    const mockResult = {
      Attributes: {
        correspondenceId: '456',
        letterId: '123',
        date: '2025-03-10',
        imageURL: 'https://example.com/image.jpg',
        method: 'email',
        status: 'sent',
        text: 'Hello world',
        title: 'First letter',
        type: 'sent',
      },
    };

    (dynamoClient.send as jest.Mock).mockResolvedValueOnce(mockResult);

    const response = (await handler(
      event,
      mockContext,
      mockCallback,
    )) as APIGatewayProxyResult;

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).message).toBe(
      'Letter updated successfully!',
    );
    expect(JSON.parse(response.body).data).toEqual(mockResult.Attributes);
  });

  it('should return 400 if the letter is not found in DynamoDB', async () => {
    const event = {
      pathParameters: { id: '123' },
      body: JSON.stringify({
        correspondenceId: '456',
        date: '2025-03-10',
        imageURL: 'https://example.com/image.jpg',
        method: 'email',
        status: 'sent',
        text: 'Hello world',
        title: 'First letter',
        type: 'sent',
      }),
    } as unknown as APIGatewayProxyEvent;

    (dynamoClient.send as jest.Mock).mockResolvedValueOnce({});

    const response = (await handler(
      event,
      mockContext,
      mockCallback,
    )) as APIGatewayProxyResult;

    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.body).message).toBe('Letter not found.');
  });

  it('should correctly handle optional fields (description)', async () => {
    const event = {
      pathParameters: { id: '123' },
      body: JSON.stringify({
        correspondenceId: '456',
        date: '2025-03-10',
        imageURL: 'https://example.com/image.jpg',
        method: 'email',
        status: 'sent',
        text: 'Hello world',
        title: 'First letter',
        type: 'sent',
        description: 'A test letter',
      }),
    } as unknown as APIGatewayProxyEvent;

    const mockResult = {
      Attributes: {
        correspondenceId: '456',
        letterId: '123',
        date: '2025-03-10',
        imageURL: 'https://example.com/image.jpg',
        method: 'email',
        status: 'sent',
        text: 'Hello world',
        title: 'First letter',
        type: 'sent',
        description: 'A test letter',
      },
    };

    (dynamoClient.send as jest.Mock).mockResolvedValueOnce(mockResult);

    const response = (await handler(
      event,
      mockContext,
      mockCallback,
    )) as APIGatewayProxyResult;

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).message).toBe(
      'Letter updated successfully!',
    );
    expect(JSON.parse(response.body).data.description).toBe('A test letter');
  });

  it('should return 400 if pathParameters is undefined', async () => {
    const event = {
      pathParameters: undefined,
      body: JSON.stringify({
        correspondenceId: '456',
        date: '2025-03-10',
        imageURL: 'https://example.com/image.jpg',
        method: 'email',
        status: 'sent',
        text: 'Hello world',
        title: 'First letter',
        type: 'sent',
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
});

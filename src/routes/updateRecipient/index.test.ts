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

describe('updateRecipient', () => {
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

  it('should return 400 if recipientId, firstName, lastName, or address is missing from body', async () => {
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
      'First name, last name, and address are required.',
    );
  });

  it('should return 400 if recipientId is missing from the path parameters', async () => {
    const event = {
      pathParameters: {},
      body: JSON.stringify({
        firstName: 'John',
        lastName: 'Doe',
        address: '123 Main St',
      }),
    } as unknown as APIGatewayProxyEvent;

    const response = (await handler(
      event,
      mockContext,
      mockCallback,
    )) as APIGatewayProxyResult;

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).message).toBe('Recipient ID is required.');
  });

  it('should return 400 if description or occupation is provided but not addressed', async () => {
    const event = {
      pathParameters: { id: '123' },
      body: JSON.stringify({
        firstName: 'John',
        lastName: 'Doe',
      }),
    } as unknown as APIGatewayProxyEvent;

    const response = (await handler(
      event,
      mockContext,
      mockCallback,
    )) as APIGatewayProxyResult;

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).message).toBe(
      'First name, last name, and address are required.',
    );
  });

  it('should return 500 if there is an error during the update operation', async () => {
    const event = {
      pathParameters: { id: '123' },
      body: JSON.stringify({
        firstName: 'John',
        lastName: 'Doe',
        address: '123 Main St',
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

  it('should return 200 when recipient is updated successfully', async () => {
    const event = {
      pathParameters: { id: '123' },
      body: JSON.stringify({
        firstName: 'John',
        lastName: 'Doe',
        address: '123 Main St',
      }),
    } as unknown as APIGatewayProxyEvent;

    const mockResult = {
      Attributes: {
        recipientId: '123',
        firstName: 'John',
        lastName: 'Doe',
        address: '123 Main St',
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
      'Recipient updated successfully!',
    );
  });

  it('should return 400 if the recipient is not found in DynamoDB', async () => {
    const event = {
      pathParameters: { id: '123' },
      body: JSON.stringify({
        firstName: 'John',
        lastName: 'Doe',
        address: '123 Main St',
      }),
    } as unknown as APIGatewayProxyEvent;

    (dynamoClient.send as jest.Mock).mockResolvedValueOnce({});

    const response = (await handler(
      event,
      mockContext,
      mockCallback,
    )) as APIGatewayProxyResult;

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).message).toBe('Recipient not found.');
  });

  it('should correctly handle optional fields (description, occupation)', async () => {
    const event = {
      pathParameters: { id: '123' },
      body: JSON.stringify({
        firstName: 'John',
        lastName: 'Doe',
        address: '123 Main St',
        description: 'Test description',
        occupation: 'Engineer',
      }),
    } as unknown as APIGatewayProxyEvent;

    const mockResult = {
      Attributes: {
        recipientId: '123',
        firstName: 'John',
        lastName: 'Doe',
        address: '123 Main St',
        description: 'Test description',
        occupation: 'Engineer',
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
      'Recipient updated successfully!',
    );
    expect(mockResult.Attributes.description).toBe('Test description');
    expect(mockResult.Attributes.occupation).toBe('Engineer');
  });

  it('should return 400 if pathParameters is undefined', async () => {
    const event = {
      pathParameters: undefined,
      body: JSON.stringify({
        firstName: 'John',
        lastName: 'Doe',
        address: '123 Main St',
      }),
    } as unknown as APIGatewayProxyEvent;

    const response = (await handler(
      event,
      mockContext,
      mockCallback,
    )) as APIGatewayProxyResult;

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).message).toBe('Recipient ID is required.');
  });
});

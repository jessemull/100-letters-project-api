import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
  Callback,
} from 'aws-lambda';
import { handler } from './index';
import { dynamoClient, logger } from '../../common/util';
import { v4 as uuidv4 } from 'uuid';

jest.mock('../../common/util', () => ({
  dynamoClient: {
    send: jest.fn(),
  },
  logger: {
    error: jest.fn(),
  },
}));

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mocked-uuid'),
}));

describe('Handler tests', () => {
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

  it('should return 400 if correspondenceId, person, correspondence, or letters are missing', async () => {
    const event = {
      body: JSON.stringify({
        correspondenceId: 'mock-id',
        person: {},
        correspondence: {},
        letters: null,
      }),
    } as unknown as APIGatewayProxyEvent;

    const response = (await handler(
      event,
      mockContext,
      mockCallback,
    )) as APIGatewayProxyResult;

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).message).toBe(
      'Correspondence ID, person, correspondence, and letters are required.',
    );
  });

  it('should return 500 if there is an error during the transaction', async () => {
    const event = {
      body: JSON.stringify({
        correspondenceId: 'mock-id',
        person: { personId: 'mock-person-id' },
        correspondence: { reason: 'Test reason' },
        letters: [{ letterId: 'letter123', text: 'Hello' }],
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

  it('should return 200 when correspondence is successfully updated', async () => {
    const event = {
      body: JSON.stringify({
        correspondenceId: 'mock-id',
        person: { personId: 'mock-person-id' },
        correspondence: { reason: 'Test reason' },
        letters: [{ letterId: 'letter123', text: 'Hello' }],
      }),
    } as unknown as APIGatewayProxyEvent;

    (dynamoClient.send as jest.Mock).mockResolvedValueOnce({});

    const response = (await handler(
      event,
      mockContext,
      mockCallback,
    )) as APIGatewayProxyResult;

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).message).toBe(
      'Correspondence updated successfully.',
    );
    expect(JSON.parse(response.body).correspondenceId).toBe('mock-id');
  });

  it('should correctly handle new letters and generate a UUID', async () => {
    const event = {
      body: JSON.stringify({
        correspondenceId: 'mock-id',
        person: { personId: 'mock-person-id' },
        correspondence: { reason: 'Test reason' },
        letters: [{ text: 'New Letter' }],
      }),
    } as unknown as APIGatewayProxyEvent;

    (dynamoClient.send as jest.Mock).mockResolvedValueOnce({});

    const response = (await handler(
      event,
      mockContext,
      mockCallback,
    )) as APIGatewayProxyResult;

    expect(response.statusCode).toBe(200);
    expect(uuidv4).toHaveBeenCalledTimes(1);
    expect(JSON.parse(response.body).correspondenceId).toBe('mock-id');
  });

  it('should handle missing letterId and create a new letter with a UUID', async () => {
    const event = {
      body: JSON.stringify({
        correspondenceId: 'mock-id',
        person: { personId: 'mock-person-id' },
        correspondence: { reason: 'Test reason' },
        letters: [{ text: 'New Letter Without ID' }],
      }),
    } as unknown as APIGatewayProxyEvent;

    (dynamoClient.send as jest.Mock).mockResolvedValueOnce({});

    const response = (await handler(
      event,
      mockContext,
      mockCallback,
    )) as APIGatewayProxyResult;
    const responseBody = JSON.parse(response.body);

    expect(response.statusCode).toBe(200);
    expect(responseBody.message).toBe('Correspondence updated successfully.');
    expect(responseBody.correspondenceId).toBe('mock-id');
  });

  it('should return 400 if letters array is missing', async () => {
    const event = {
      body: JSON.stringify({
        correspondenceId: 'mock-id',
        person: { personId: 'mock-person-id' },
        correspondence: { reason: 'Test reason' },
      }),
    } as unknown as APIGatewayProxyEvent;

    const response = (await handler(
      event,
      mockContext,
      mockCallback,
    )) as APIGatewayProxyResult;

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).message).toBe(
      'Correspondence ID, person, correspondence, and letters are required.',
    );
  });

  it('should call logger.error if there is an internal error', async () => {
    const event = {
      body: JSON.stringify({
        correspondenceId: 'mock-id',
        person: { personId: 'mock-person-id' },
        correspondence: { reason: 'Test reason' },
        letters: [{ letterId: 'letter123', text: 'Hello' }],
      }),
    } as unknown as APIGatewayProxyEvent;

    (dynamoClient.send as jest.Mock).mockRejectedValueOnce(
      new Error('DynamoDB error'),
    );

    await handler(event, mockContext, mockCallback);

    expect(logger.error).toHaveBeenCalledWith(
      'Error updating correspondence: ',
      expect.any(Error),
    );
  });

  it('should correctly handle description and occupation updates for person and description update for letter', async () => {
    const event = {
      body: JSON.stringify({
        correspondenceId: 'mock-id',
        person: {
          personId: 'mock-person-id',
          firstName: 'John',
          lastName: 'Doe',
          address: '123 Main St',
          description: 'Test description',
          occupation: 'Engineer',
        },
        correspondence: { reason: 'Test reason' },
        letters: [
          {
            letterId: 'letter123',
            text: 'Hello',
            description: 'Letter description',
          },
        ],
      }),
    } as unknown as APIGatewayProxyEvent;

    (dynamoClient.send as jest.Mock).mockResolvedValueOnce({});

    const response = (await handler(
      event,
      mockContext,
      mockCallback,
    )) as APIGatewayProxyResult;

    expect(response.statusCode).toBe(200);
    const responseBody = JSON.parse(response.body);

    expect(responseBody.correspondenceId).toBe('mock-id');

    const receivedString = JSON.stringify(
      (dynamoClient.send as jest.Mock).mock.calls[0][0],
    );

    expect(receivedString).toContain(':description":"Test description');
    expect(receivedString).toContain(':occupation":"Engineer');
    expect(receivedString).toContain(':description":"Letter description');
    expect(receivedString).toContain(
      'TableName":"OneHundredLettersPersonTable',
    );
    expect(receivedString).toContain(
      'TableName":"OneHundredLettersLetterTable',
    );
    expect(receivedString).toContain('#description = :description');
  });
});

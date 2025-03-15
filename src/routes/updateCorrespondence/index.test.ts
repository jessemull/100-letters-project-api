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

jest.mock('uuid', () => ({
  v4: jest.fn(),
}));

describe('Update Correspondence Handler', () => {
  const mockContext: Context = {} as Context;
  const mockCallback: Callback = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();
  });

  it('should return 400 if request body is missing', async () => {
    const event = {
      body: null,
      pathParameters: { id: 'mock-id' },
    } as unknown as APIGatewayProxyEvent;

    const response = (await handler(
      event,
      mockContext,
      mockCallback,
    )) as APIGatewayProxyResult;

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).message).toBe('Request body is required.');
  });

  it('should return 400 if correspondenceId is missing', async () => {
    const event = {
      body: JSON.stringify({
        recipient: { name: 'John Doe' },
        correspondence: {
          reason: { description: 'Test', domain: 'Test', impact: 'HIGH' },
        },
        letters: [{ letterId: 'letter123', content: 'Hello' }],
      }),
      pathParameters: {},
    } as unknown as APIGatewayProxyEvent;

    const response = (await handler(
      event,
      mockContext,
      mockCallback,
    )) as APIGatewayProxyResult;

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).message).toBe(
      'Correspondence ID is required in the path parameters.',
    );
  });

  it('should return 500 if there is an error during DynamoDB transaction', async () => {
    const event = {
      body: JSON.stringify({
        recipient: { recipientId: 'mock-recipient-id' },
        correspondence: {
          reason: {
            description: 'Test',
            domain: 'Test Domain',
            impact: 'HIGH',
          },
        },
        letters: [{ letterId: 'mock-letter-id', content: 'Hello' }],
      }),
      pathParameters: { id: 'mock-id' },
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

  it('should return 200 when correspondence, recipient, and letters are successfully updated', async () => {
    const event = {
      body: JSON.stringify({
        recipient: {
          address: '123 Fake Street',
          recipientId: 'mock-recipient-id',
          firstName: 'John',
          lastName: 'Doe',
        },
        correspondence: {
          reason: {
            description: 'Test',
            domain: 'Test Domain',
            impact: 'HIGH',
          },
        },
        letters: [
          { letterId: 'mock-letter-id', text: 'Updated letter content' },
        ],
      }),
      pathParameters: { id: 'mock-id' },
    } as unknown as APIGatewayProxyEvent;

    (dynamoClient.send as jest.Mock).mockResolvedValueOnce({
      Items: [
        { letterId: 'mock-letter-id' },
        { letterId: 'mock-letter-id-missing' },
      ],
    });
    (dynamoClient.send as jest.Mock).mockResolvedValueOnce({});
    (dynamoClient.send as jest.Mock).mockResolvedValueOnce({
      Item: { correspondenceId: 'mock-id' },
    });
    (dynamoClient.send as jest.Mock).mockResolvedValueOnce({
      Item: { recipientId: 'mock-recipient-id' },
    });
    (dynamoClient.send as jest.Mock).mockResolvedValueOnce({
      Items: [{ letterId: 'mock-letter-id' }],
    });

    const expectedResponse = {
      correspondence: { correspondenceId: 'mock-id' },
      recipient: { recipientId: 'mock-recipient-id' },
      letters: [{ letterId: 'mock-letter-id' }],
    };

    const response = (await handler(
      event,
      mockContext,
      mockCallback,
    )) as APIGatewayProxyResult;

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).message).toBe(
      'Correspondence updated successfully.',
    );
    expect(JSON.parse(response.body).data).toEqual(expectedResponse);
  });

  it('should return 500 if there is an error during letter data retrieval', async () => {
    const event = {
      body: JSON.stringify({
        recipient: { recipientId: 'mock-recipient-id' },
        correspondence: {
          reason: {
            description: 'Test',
            domain: 'Test Domain',
            impact: 'HIGH',
          },
        },
        letters: [{ letterId: 'mock-letter-id', content: 'Hello' }],
      }),
      pathParameters: { id: 'mock-id' },
    } as unknown as APIGatewayProxyEvent;

    (dynamoClient.send as jest.Mock).mockResolvedValueOnce({});
    (dynamoClient.send as jest.Mock).mockRejectedValueOnce(
      new Error('Error retrieving letter data'),
    );

    const response = (await handler(
      event,
      mockContext,
      mockCallback,
    )) as APIGatewayProxyResult;

    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.body).message).toBe('Internal Server Error');
  });

  it('should include optional properties in recipient update if provided', async () => {
    const event = {
      body: JSON.stringify({
        recipient: {
          recipientId: 'mock-recipient-id',
          firstName: 'John',
          lastName: 'Doe',
          description: 'A passionate developer',
          occupation: 'Software Engineer',
          organization: 'USDA',
        },
        correspondence: {
          reason: {
            description: 'Test',
            domain: 'Test Domain',
            impact: 'HIGH',
          },
        },
        letters: [
          { letterId: 'mock-letter-id', text: 'Updated letter content' },
        ],
      }),
      pathParameters: { id: 'mock-id' },
    } as unknown as APIGatewayProxyEvent;

    (dynamoClient.send as jest.Mock).mockResolvedValueOnce({
      Item: { letterId: 'mock-letter-id' },
    });
    (dynamoClient.send as jest.Mock).mockResolvedValueOnce({});
    (dynamoClient.send as jest.Mock).mockResolvedValueOnce({
      Item: { correspondenceId: 'mock-id' },
    });
    (dynamoClient.send as jest.Mock).mockResolvedValueOnce({
      Item: { recipientId: 'mock-recipient-id' },
    });
    (dynamoClient.send as jest.Mock).mockResolvedValueOnce({
      Items: [{ letterId: 'mock-letter-id' }],
    });

    const response = (await handler(
      event,
      mockContext,
      mockCallback,
    )) as APIGatewayProxyResult;

    expect(
      JSON.stringify((dynamoClient.send as jest.Mock).mock.calls).includes(
        '#description = :description',
      ),
    ).toBeTruthy();
    expect(
      JSON.stringify((dynamoClient.send as jest.Mock).mock.calls).includes(
        '#occupation = :occupation',
      ),
    ).toBeTruthy();
    expect(
      JSON.stringify((dynamoClient.send as jest.Mock).mock.calls).includes(
        '#organization = :organization',
      ),
    ).toBeTruthy();
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).message).toBe(
      'Correspondence updated successfully.',
    );
  });

  it('should include optional properties in update expression if provided in letter data', async () => {
    const event = {
      body: JSON.stringify({
        recipient: {
          recipientId: 'mock-recipient-id',
          firstName: 'John',
          lastName: 'Doe',
        },
        correspondence: {
          reason: {
            description: 'Test',
            domain: 'Test Domain',
            impact: 'HIGH',
          },
        },
        letters: [
          {
            description: 'Sample description for letter',
            letterId: 'mock-letter-id',
            receivedAt: '2015-10-22',
            sentAt: '2015-10-22',
            text: 'Updated letter content',
          },
        ],
      }),
      pathParameters: { id: 'mock-id' },
    } as unknown as APIGatewayProxyEvent;

    (dynamoClient.send as jest.Mock).mockResolvedValueOnce({
      Item: { letterId: 'mock-letter-id' },
    });
    (dynamoClient.send as jest.Mock).mockResolvedValueOnce({});
    (dynamoClient.send as jest.Mock).mockResolvedValueOnce({
      Item: { correspondenceId: 'mock-id' },
    });
    (dynamoClient.send as jest.Mock).mockResolvedValueOnce({
      Item: { recipientId: 'mock-recipient-id' },
    });
    (dynamoClient.send as jest.Mock).mockResolvedValueOnce({
      Items: [{ letterId: 'mock-letter-id' }],
    });

    const response = (await handler(
      event,
      mockContext,
      mockCallback,
    )) as APIGatewayProxyResult;

    expect(
      JSON.stringify((dynamoClient.send as jest.Mock).mock.calls).includes(
        '#description = :description',
      ),
    ).toBeTruthy();
    expect(
      JSON.stringify((dynamoClient.send as jest.Mock).mock.calls).includes(
        '#receivedAt = :receivedAt',
      ),
    ).toBeTruthy();
    expect(
      JSON.stringify((dynamoClient.send as jest.Mock).mock.calls).includes(
        '#sentAt = :sentAt',
      ),
    ).toBeTruthy();
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).message).toBe(
      'Correspondence updated successfully.',
    );
  });

  it('should return 400 if pathParameters is missing the id', async () => {
    const event = {
      body: JSON.stringify({
        recipient: { name: 'John Doe' },
        correspondence: {
          reason: { description: 'Test', domain: 'Test', impact: 'HIGH' },
        },
        letters: [{ letterId: 'letter123', content: 'Hello' }],
      }),
      pathParameters: undefined, // pathParameters is undefined
    } as unknown as APIGatewayProxyEvent;

    const response = (await handler(
      event,
      mockContext,
      mockCallback,
    )) as APIGatewayProxyResult;

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).message).toBe(
      'Correspondence ID is required in the path parameters.',
    );
  });
});

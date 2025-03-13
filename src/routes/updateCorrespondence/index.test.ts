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

  it('should return 400 if recipient, correspondence, or letters are missing', async () => {
    const event = {
      body: JSON.stringify({ recipient: {}, correspondence: {} }),
      pathParameters: { id: 'mock-id' },
    } as unknown as APIGatewayProxyEvent;

    const response = (await handler(
      event,
      mockContext,
      mockCallback,
    )) as APIGatewayProxyResult;

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).message).toBe(
      'Recipient, correspondence, and letters are required.',
    );
  });

  it('should return 400 if reason is missing or invalid', async () => {
    const event = {
      body: JSON.stringify({
        recipient: { name: 'John Doe' },
        correspondence: { title: 'Test Correspondence' },
        letters: [{ letterId: 'letter123', content: 'Hello' }],
      }),
      pathParameters: { id: 'mock-id' },
    } as unknown as APIGatewayProxyEvent;

    const response = (await handler(
      event,
      mockContext,
      mockCallback,
    )) as APIGatewayProxyResult;

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).message).toBe(
      'Reason must include description, domain, and valid impact.',
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

  it('should include description and occupation in recipient update if provided', async () => {
    const event = {
      body: JSON.stringify({
        recipient: {
          recipientId: 'mock-recipient-id',
          firstName: 'John',
          lastName: 'Doe',
          description: 'A passionate developer',
          occupation: 'Software Engineer',
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
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).message).toBe(
      'Correspondence updated successfully.',
    );
  });

  it('should include description in update expression if description is provided in letter data', async () => {
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
            letterId: 'mock-letter-id',
            text: 'Updated letter content',
            description: 'Updated letter description',
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
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).message).toBe(
      'Correspondence updated successfully.',
    );
  });

  it('should return 400 when letter ID is missing', async () => {
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
        letters: [{ text: 'Updated letter content' }],
      }),
      pathParameters: { id: 'mock-id' },
    } as unknown as APIGatewayProxyEvent;

    const response = (await handler(
      event,
      mockContext,
      mockCallback,
    )) as APIGatewayProxyResult;

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body).message).toBe(
      'Letter ID is required for update.',
    );
  });

  it('should return 400 when correspondence ID is missing from path parameters', async () => {
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
        letters: [{ id: 'mock-letter-id', text: 'Updated letter content' }],
      }),
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

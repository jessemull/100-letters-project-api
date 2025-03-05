import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Callback,
  Context,
} from 'aws-lambda';
import { handler } from './index';
import { logger, prisma } from '../../common/util';

jest.mock('../../common/util', () => ({
  prisma: {
    person: {
      findMany: jest.fn(),
    },
  },
  logger: {
    error: jest.fn(),
  },
}));

describe('Get Recipients Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return recipients', async () => {
    const mockRecipients = [
      { id: 1, name: 'Frank Castle', address: '123 Main St' },
      { id: 2, name: 'Charles Xavier', address: '456 Oak Rd' },
    ];
    (prisma.person.findMany as jest.Mock).mockResolvedValue(mockRecipients);
    const event: APIGatewayProxyEvent = {} as APIGatewayProxyEvent;
    const context: Context = {} as Context;
    const callback: Callback = jest.fn();
    const expectedResult: APIGatewayProxyResult = {
      statusCode: 200,
      body: JSON.stringify({
        data: mockRecipients,
      }),
    };
    const result = await handler(event, context, callback);
    expect(result).toEqual(expectedResult);
    expect(prisma.person.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.person.findMany).toHaveBeenCalledWith({
      select: {
        id: true,
        name: true,
        address: true,
      },
    });
  });

  it('should return 500 on error', async () => {
    const errorMessage = 'Database connection error';
    (prisma.person.findMany as jest.Mock).mockRejectedValue(
      new Error(errorMessage),
    );
    const event: APIGatewayProxyEvent = {} as APIGatewayProxyEvent;
    const context: Context = {} as Context;
    const callback: Callback = jest.fn();
    const expectedResult: APIGatewayProxyResult = {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal Server Error' }),
    };
    const result = await handler(event, context, callback);
    expect(result).toEqual(expectedResult);
    expect(prisma.person.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.person.findMany).toHaveBeenCalledWith({
      select: {
        id: true,
        name: true,
        address: true,
      },
    });
    expect(logger.error).toHaveBeenCalledWith(
      'Error fetching recipients: ',
      expect.any(Error),
    );
  });
});

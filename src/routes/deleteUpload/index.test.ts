import {
  APIGatewayProxyEvent,
  Context,
  APIGatewayProxyResult,
} from 'aws-lambda';
import { handler } from './index';
import { logger, s3 } from '../../common/util';

jest.mock('../../common/util', () => ({
  s3: {
    deleteObject: jest.fn().mockReturnValue({ promise: jest.fn() }),
  },
  getHeaders: jest.fn().mockReturnValue({
    'Content-Type': 'application/json',
  }),
  logger: {
    error: jest.fn(),
  },
}));

describe('Delete Upload Handler', () => {
  const context = {} as Context;

  const baseEvent = (overrides = {}): APIGatewayProxyEvent =>
    ({
      queryStringParameters: {
        fileKey: 'abc123___def456___front___uuid.jpeg',
        ...overrides,
      },
      headers: {},
    }) as unknown as APIGatewayProxyEvent;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 400 if fileKey is missing', async () => {
    const event = baseEvent({ fileKey: undefined });
    const result = (await handler(
      event,
      context,
      () => {},
    )) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).message).toBe('Missing file key!');
  });

  it('should return 400 if fileKey format is invalid', async () => {
    const event = baseEvent({ fileKey: 'bad___format.jpeg' });
    const result = (await handler(
      event,
      context,
      () => {},
    )) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).message).toContain(
      'Invalid file key format',
    );
  });

  it('should delete original, thumbnail, and large keys successfully', async () => {
    const mockPromise = jest.fn().mockResolvedValue({});
    (s3.deleteObject as jest.Mock).mockReturnValue({ promise: mockPromise });

    process.env.IMAGE_S3_BUCKET_NAME = 'mock-bucket';

    const event = baseEvent();
    const result = (await handler(
      event,
      context,
      () => {},
    )) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body).message).toBe(
      'Image and variants deleted successfully!',
    );
    expect(s3.deleteObject).toHaveBeenCalledTimes(3);
    expect(mockPromise).toHaveBeenCalledTimes(3);
  });

  it('should return 500 and log error on failure', async () => {
    const mockPromise = jest.fn().mockRejectedValue(new Error('s3 fail'));
    (s3.deleteObject as jest.Mock).mockReturnValue({ promise: mockPromise });

    const event = baseEvent();
    const result = (await handler(
      event,
      context,
      () => {},
    )) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body).message).toBe('Error deleting image.');
    expect(logger.error).toHaveBeenCalledWith(
      'Error deleting image: ',
      expect.any(Error),
    );
  });

  it('should return 400 if queryStringParameters is undefined', async () => {
    const event = {
      headers: {},
      queryStringParameters: undefined,
    } as unknown as APIGatewayProxyEvent;

    const result = (await handler(
      event,
      context,
      () => {},
    )) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).message).toBe('Missing file key!');
  });
});

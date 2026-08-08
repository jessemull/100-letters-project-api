import {
  APIGatewayProxyEvent,
  Context,
  APIGatewayProxyResult,
} from 'aws-lambda';
import { handler } from './index';
import { logger } from '../../common/util/logger';
import { s3 } from '../../common/util/s3';

jest.mock('../../common/util/s3', () => {
  const actualS3 = jest.requireActual('@aws-sdk/client-s3');
  return {
    DeleteObjectCommand: actualS3.DeleteObjectCommand,
    s3: {
      send: jest.fn(),
    },
  };
});

jest.mock('../../common/util/headers', () => ({
  getHeaders: jest.fn().mockReturnValue({
    'Content-Type': 'application/json',
  }),
}));

jest.mock('../../common/util/logger', () => ({
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
    (s3.send as jest.Mock).mockResolvedValue({});

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
    expect(s3.send).toHaveBeenCalledTimes(3);
    const deletedKeys = (s3.send as jest.Mock).mock.calls.map(
      ([command]) => command.input.Key,
    );
    expect(deletedKeys).toEqual(
      expect.arrayContaining([
        'abc123___def456___front___uuid.jpeg',
        expect.stringMatching(/_thumb\.jpg$/),
        expect.stringMatching(/_large\.jpg$/),
      ]),
    );
  });

  it('should return 500 and log error on failure', async () => {
    (s3.send as jest.Mock).mockRejectedValue(new Error('s3 fail'));

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

  it('should return 400 if queryStringParameters is null', async () => {
    const event = {
      queryStringParameters: null,
      headers: {},
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

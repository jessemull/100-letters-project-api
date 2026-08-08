import {
  APIGatewayProxyEvent,
  Context,
  APIGatewayProxyResult,
} from 'aws-lambda';
import { handler, resolveDeleteKeys } from './index';
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

describe('resolveDeleteKeys', () => {
  it('parses unprocessed ___ keys', () => {
    expect(
      resolveDeleteKeys(
        'unprocessed/abc123___def456___LETTER_FRONT___uuid-1.jpeg',
      ),
    ).toEqual([
      'unprocessed/abc123___def456___LETTER_FRONT___uuid-1.jpeg',
      'images/abc123/def456/LETTER_FRONT/uuid-1_thumb.jpg',
      'images/abc123/def456/LETTER_FRONT/uuid-1_large.jpg',
    ]);
  });

  it('parses processed images/ keys including seed _large_N', () => {
    const corr = '6c18f8f5-bc49-4229-8a13-3d3471425f29';
    const letter = '2e5d1072-9dcb-446b-b972-eac5d9e1fc9c';
    const uuid = 'd4f872a4-1e32-4514-870f-1ffeeeb10058';
    const fileKey = `images/${corr}/${letter}/LETTER_FRONT/${uuid}_large_8.jpg`;

    const keys = resolveDeleteKeys(fileKey);

    expect(keys).toEqual(
      expect.arrayContaining([
        fileKey,
        `images/${corr}/${letter}/LETTER_FRONT/${uuid}_thumb.jpg`,
        `images/${corr}/${letter}/LETTER_FRONT/${uuid}_large.jpg`,
        `unprocessed/${corr}___${letter}___LETTER_FRONT___${uuid}.jpg`,
      ]),
    );
  });

  it('returns null for invalid keys', () => {
    expect(resolveDeleteKeys('bad___format.jpeg')).toBeNull();
    expect(resolveDeleteKeys('images/not/a/valid.jpg')).toBeNull();
  });
});

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

  it('should delete processed seed-style images/ keys', async () => {
    (s3.send as jest.Mock).mockResolvedValue({});
    process.env.IMAGE_S3_BUCKET_NAME = 'mock-bucket';

    const corr = '6c18f8f5-bc49-4229-8a13-3d3471425f29';
    const letter = '2e5d1072-9dcb-446b-b972-eac5d9e1fc9c';
    const uuid = 'd4f872a4-1e32-4514-870f-1ffeeeb10058';
    const fileKey = `images/${corr}/${letter}/LETTER_FRONT/${uuid}_large_8.jpg`;

    const event = baseEvent({ fileKey });
    const result = (await handler(
      event,
      context,
      () => {},
    )) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(200);
    const deletedKeys = (s3.send as jest.Mock).mock.calls.map(
      ([command]) => command.input.Key,
    );
    expect(deletedKeys).toEqual(expect.arrayContaining([fileKey]));
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

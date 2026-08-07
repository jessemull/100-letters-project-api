import { Context, S3Event } from 'aws-lambda';
import { Jimp } from 'jimp';
import { handler } from './index';
import { logger, s3 } from '../../common/util';

jest.mock('jimp');

jest.mock('../../common/util', () => {
  const actualS3 = jest.requireActual('@aws-sdk/client-s3');
  return {
    GetObjectCommand: actualS3.GetObjectCommand,
    PutObjectCommand: actualS3.PutObjectCommand,
    s3: {
      send: jest.fn(),
    },
    logger: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
  };
});

describe('Image Processor Lambda', () => {
  const context = {} as Context;
  const callback = jest.fn();
  const mockImage = {
    clone: jest.fn().mockReturnThis(),
    resize: jest.fn().mockReturnThis(),
    getBuffer: jest.fn(),
  };

  const mockS3Event = (key: string): S3Event =>
    ({
      Records: [
        {
          s3: {
            bucket: { name: 'test-bucket' },
            object: { key },
          },
        },
      ],
    }) as unknown as S3Event;

  const mockBody = (bytes: Buffer) => ({
    transformToByteArray: jest.fn().mockResolvedValue(Uint8Array.from(bytes)),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (Jimp.read as jest.Mock).mockResolvedValue(mockImage);
    mockImage.getBuffer = jest
      .fn()
      .mockResolvedValueOnce(Buffer.from('large'))
      .mockResolvedValueOnce(Buffer.from('thumb'));

    (s3.send as jest.Mock).mockImplementation(async (command) => {
      const name = command.constructor.name;
      if (name === 'GetObjectCommand') {
        return { Body: mockBody(Buffer.from('mockImageData')) };
      }
      return {};
    });
  });

  it('should process valid image and upload large and thumbnail versions', async () => {
    const key = 'unprocessed/abc___def___front___uuid.jpeg';
    await handler(mockS3Event(key), context, callback);

    expect(s3.send).toHaveBeenCalled();
    expect(Jimp.read).toHaveBeenCalledWith(Buffer.from('mockImageData'));

    expect(mockImage.clone).toHaveBeenCalledTimes(2);
    expect(mockImage.resize).toHaveBeenCalledTimes(2);
    expect(mockImage.getBuffer).toHaveBeenCalledTimes(2);

    const putCalls = (s3.send as jest.Mock).mock.calls.filter(
      ([command]) => command.constructor.name === 'PutObjectCommand',
    );
    expect(putCalls).toHaveLength(2);
    expect(putCalls[0][0].input.Key).toMatch(/_large\.jpg$/);
    expect(putCalls[0][0].input.Body).toEqual(Buffer.from('large'));
    expect(putCalls[1][0].input.Key).toMatch(/_thumb\.jpg$/);
    expect(putCalls[1][0].input.Body).toEqual(Buffer.from('thumb'));
  });

  it('should skip file if key is not under unprocessed/', async () => {
    const key = 'processed/abc___def___front___uuid.jpeg';
    await handler(mockS3Event(key), context, callback);

    expect(logger.warn).toHaveBeenCalledWith(
      'Skipping non-unprocessed image: processed/abc___def___front___uuid.jpeg',
    );
    expect(s3.send).not.toHaveBeenCalled();
  });

  it('should skip file if filename format is invalid', async () => {
    const key = 'unprocessed/abc___def___badname.jpeg';
    await handler(mockS3Event(key), context, callback);

    expect(logger.error).toHaveBeenCalledWith(
      'Invalid file name format: unprocessed/abc___def___badname.jpeg',
    );
    expect(s3.send).not.toHaveBeenCalled();
  });

  it('should log and rethrow on unexpected error', async () => {
    (s3.send as jest.Mock).mockRejectedValue(new Error('S3 failure'));

    const key = 'unprocessed/abc___def___front___uuid.jpeg';

    await expect(handler(mockS3Event(key), context, callback)).rejects.toThrow(
      'S3 failure',
    );
    expect(logger.error).toHaveBeenCalledWith(
      'Error processing image:',
      expect.any(Error),
    );
  });

  it('should log an error if uploading the large image fails', async () => {
    const key = 'unprocessed/abc___def___front___uuid.jpeg';
    let putCount = 0;

    (s3.send as jest.Mock).mockImplementation(async (command) => {
      if (command.constructor.name === 'GetObjectCommand') {
        return { Body: mockBody(Buffer.from('mockImageData')) };
      }
      putCount += 1;
      if (putCount === 1) {
        throw new Error('Large upload failed');
      }
      return {};
    });

    await handler(mockS3Event(key), context, callback);

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Error uploading'),
      expect.any(Error),
    );
  });

  it('should log an error if uploading the thumbnail image fails', async () => {
    const key = 'unprocessed/abc___def___front___uuid.jpeg';
    let putCount = 0;

    (s3.send as jest.Mock).mockImplementation(async (command) => {
      if (command.constructor.name === 'GetObjectCommand') {
        return { Body: mockBody(Buffer.from('mockImageData')) };
      }
      putCount += 1;
      if (putCount === 2) {
        throw new Error('Thumbnail upload failed');
      }
      return {};
    });

    await handler(mockS3Event(key), context, callback);

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Error uploading'),
      expect.any(Error),
    );
  });

  it('should throw if S3 body is empty', async () => {
    const key = 'unprocessed/abc___def___front___uuid.jpeg';

    (s3.send as jest.Mock).mockResolvedValueOnce({ Body: undefined });

    await expect(handler(mockS3Event(key), context, callback)).rejects.toThrow(
      'Empty S3 object body',
    );
  });
});

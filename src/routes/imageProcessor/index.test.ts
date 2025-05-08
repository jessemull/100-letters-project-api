import { Context, S3Event } from 'aws-lambda';
import { Jimp } from 'jimp';
import { WithImplicitCoercion } from 'buffer';
import { handler } from './index';
import { logger, s3 } from '../../common/util';

jest.mock('jimp');

jest.mock('../../common/util', () => ({
  s3: {
    getObject: jest.fn(),
    putObject: jest.fn(),
  },
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

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

  beforeEach(() => {
    jest.clearAllMocks();
    (Jimp.read as jest.Mock).mockResolvedValue(mockImage);
    mockImage.getBuffer = jest
      .fn()
      .mockResolvedValueOnce(Buffer.from('large'))
      .mockResolvedValueOnce(Buffer.from('thumb'));

    (s3.getObject as jest.Mock).mockReturnValue({
      promise: jest.fn().mockResolvedValue({
        Body: Buffer.from('mockImageData'),
      }),
    });

    (s3.putObject as jest.Mock).mockReturnValue({
      promise: jest.fn().mockResolvedValue({}),
    });
  });

  it('should process valid image and upload large and thumbnail versions', async () => {
    const key = 'unprocessed/abc___def___front___uuid.jpeg';
    await handler(mockS3Event(key), context, callback);

    expect(s3.getObject).toHaveBeenCalledWith({
      Bucket: 'test-bucket',
      Key: key,
    });

    expect(Jimp.read).toHaveBeenCalledWith(Buffer.from('mockImageData'));

    expect(mockImage.clone).toHaveBeenCalledTimes(2);
    expect(mockImage.resize).toHaveBeenCalledTimes(2);
    expect(mockImage.getBuffer).toHaveBeenCalledTimes(2);

    expect(s3.putObject).toHaveBeenCalledTimes(2);
    expect(s3.putObject).toHaveBeenCalledWith(
      expect.objectContaining({
        Key: expect.stringMatching(/_large\.jpg$/),
        Body: Buffer.from('large'),
      }),
    );
    expect(s3.putObject).toHaveBeenCalledWith(
      expect.objectContaining({
        Key: expect.stringMatching(/_thumb\.jpg$/),
        Body: Buffer.from('thumb'),
      }),
    );
  });

  it('should skip file if key is not under unprocessed/', async () => {
    const key = 'processed/abc___def___front___uuid.jpeg';
    await handler(mockS3Event(key), context, callback);

    expect(logger.warn).toHaveBeenCalledWith(
      'Skipping non-unprocessed image: processed/abc___def___front___uuid.jpeg',
    );
    expect(s3.getObject).not.toHaveBeenCalled();
  });

  it('should skip file if filename format is invalid', async () => {
    const key = 'unprocessed/abc___def___badname.jpeg';
    await handler(mockS3Event(key), context, callback);

    expect(logger.error).toHaveBeenCalledWith(
      'Invalid file name format: unprocessed/abc___def___badname.jpeg',
    );
    expect(s3.getObject).not.toHaveBeenCalled();
  });

  it('should log and rethrow on unexpected error', async () => {
    (s3.getObject as jest.Mock).mockReturnValue({
      promise: jest.fn().mockRejectedValue(new Error('S3 failure')),
    });

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

    (s3.putObject as jest.Mock)
      .mockImplementationOnce(() => ({
        promise: jest
          .fn()
          .mockRejectedValueOnce(new Error('Large upload failed')),
      }))
      .mockImplementationOnce(() => ({
        promise: jest.fn().mockResolvedValueOnce({}),
      }));

    await handler(mockS3Event(key), context, callback);

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Error uploading'),
      expect.any(Error),
    );
  });

  it('should log an error if uploading the thumbnail image fails', async () => {
    const key = 'unprocessed/abc___def___front___uuid.jpeg';

    (s3.putObject as jest.Mock)
      .mockImplementationOnce(() => ({
        promise: jest.fn().mockResolvedValueOnce({}),
      }))
      .mockImplementationOnce(() => ({
        promise: jest
          .fn()
          .mockRejectedValueOnce(new Error('Thumbnail upload failed')),
      }));

    await handler(mockS3Event(key), context, callback);

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('Error uploading'),
      expect.any(Error),
    );
  });

  it('should convert non-buffer S3 body to buffer', async () => {
    const key = 'unprocessed/abc___def___front___uuid.jpeg';

    const bodyString = 'mockImageDataString';
    (s3.getObject as jest.Mock).mockReturnValueOnce({
      promise: jest.fn().mockResolvedValue({
        Body: bodyString,
      }),
    });

    await handler(mockS3Event(key), context, callback);

    expect(Buffer.isBuffer(bodyString)).toBe(false);
    expect(Jimp.read).toHaveBeenCalledWith(
      Buffer.from(
        bodyString as unknown as WithImplicitCoercion<ArrayLike<number>>,
      ),
    );
  });
});

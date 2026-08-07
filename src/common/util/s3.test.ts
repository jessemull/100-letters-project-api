import { createPresignedPutUrl, s3 } from './s3';

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://signed.example/put'),
}));

jest.mock('@aws-sdk/client-s3', () => {
  const actual = jest.requireActual('@aws-sdk/client-s3');
  return {
    ...actual,
    S3Client: jest.fn().mockImplementation(() => ({
      send: jest.fn(),
    })),
  };
});

describe('s3 util', () => {
  it('creates a presigned put URL with default expiry', async () => {
    const { getSignedUrl } = jest.requireMock('@aws-sdk/s3-request-presigner');

    const url = await createPresignedPutUrl({
      Bucket: 'bucket',
      ContentType: 'image/jpeg',
      Key: 'unprocessed/key.jpg',
    });

    expect(url).toBe('https://signed.example/put');
    expect(getSignedUrl).toHaveBeenCalledWith(
      s3,
      expect.objectContaining({
        input: expect.objectContaining({
          Bucket: 'bucket',
          ContentType: 'image/jpeg',
          Key: 'unprocessed/key.jpg',
        }),
      }),
      { expiresIn: 60 },
    );
  });

  it('creates a presigned put URL with custom expiry', async () => {
    const { getSignedUrl } = jest.requireMock('@aws-sdk/s3-request-presigner');

    await createPresignedPutUrl({
      Bucket: 'bucket',
      ContentType: 'image/png',
      Key: 'key.png',
      expiresIn: 120,
    });

    expect(getSignedUrl).toHaveBeenCalledWith(s3, expect.any(Object), {
      expiresIn: 120,
    });
  });
});

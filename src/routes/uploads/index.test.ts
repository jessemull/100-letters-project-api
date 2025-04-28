import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from 'aws-lambda';
import { handler } from './index';
import { s3, getHeaders } from '../../common/util';

jest.mock('../../common/util', () => ({
  s3: {
    getSignedUrlPromise: jest.fn(),
  },
  getHeaders: jest.fn(),
  logger: {
    error: jest.fn(),
  },
}));

jest.mock('../../common/errors', () => ({
  BadRequestError: jest.fn().mockImplementation((message: string) => ({
    build: (headers: unknown) => ({
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'BadRequestError', message }),
    }),
  })),
  DatabaseError: jest.fn().mockImplementation((message: string) => ({
    build: (headers: unknown) => ({
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'InternalServerError', message }),
    }),
  })),
}));

describe('Generate Signed URL Handler', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  const context: Context = {} as Context;

  it('should return 400 if body is missing', async () => {
    (getHeaders as jest.Mock).mockReturnValue({});

    const event = {
      body: null,
    } as unknown as APIGatewayProxyEvent;

    const result = (await handler(
      event,
      context,
      () => {},
    )) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({
      error: 'BadRequestError',
      message: 'Request body is required.',
    });
    expect(getHeaders).toHaveBeenCalledWith(event);
  });

  it('should return 400 if required fields are missing', async () => {
    (getHeaders as jest.Mock).mockReturnValue({});

    const event = {
      body: JSON.stringify({
        correspondenceId: '123',
        letterId: '456',
        // fileType missing
        view: 'front',
      }),
    } as unknown as APIGatewayProxyEvent;

    const result = (await handler(
      event,
      context,
      () => {},
    )) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({
      error: 'BadRequestError',
      message: 'Missing required fields.',
    });
    expect(getHeaders).toHaveBeenCalledWith(event);
  });

  it('should return 200 and signed URL if all fields are provided', async () => {
    (getHeaders as jest.Mock).mockReturnValue({
      'Content-Type': 'application/json',
    });
    (s3.getSignedUrlPromise as jest.Mock).mockResolvedValue(
      'https://signed-url.com',
    );

    const event = {
      body: JSON.stringify({
        correspondenceId: '123',
        letterId: '456',
        fileType: 'image/jpeg',
        view: 'front',
      }),
    } as unknown as APIGatewayProxyEvent;

    const result = (await handler(
      event,
      context,
      () => {},
    )) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({
      url: 'https://signed-url.com',
    });
    expect(getHeaders).toHaveBeenCalledWith(event);
    expect(s3.getSignedUrlPromise).toHaveBeenCalledWith(
      'putObject',
      expect.objectContaining({
        Bucket: process.env.IMAGE_S3_BUCKET_NAME,
        ContentType: 'image/jpeg',
      }),
    );
  });

  it('should return 500 if there is an error generating signed URL', async () => {
    (getHeaders as jest.Mock).mockReturnValue({});
    (s3.getSignedUrlPromise as jest.Mock).mockRejectedValue(
      new Error('S3 error'),
    );

    const event = {
      body: JSON.stringify({
        correspondenceId: '123',
        letterId: '456',
        fileType: 'image/jpeg',
        view: 'front',
      }),
    } as unknown as APIGatewayProxyEvent;

    const result = (await handler(
      event,
      context,
      () => {},
    )) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toEqual({
      error: 'InternalServerError',
      message: 'Error generating pre-signed URL.',
    });
    expect(getHeaders).toHaveBeenCalledWith(event);
  });
});

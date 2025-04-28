import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from 'aws-lambda';
import { handler } from './index';
import { s3, getHeaders } from '../../common/util';

jest.mock('../../common/util', () => ({
  s3: {
    deleteObject: jest.fn(),
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

describe('Delete Image Handler', () => {
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
        // view missing
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

  it('should return 200 and delete the image if all fields are provided', async () => {
    (getHeaders as jest.Mock).mockReturnValue({
      'Content-Type': 'application/json',
    });
    (s3.deleteObject as jest.Mock).mockImplementation(() => ({
      promise: jest.fn().mockResolvedValue({}),
    }));

    const event = {
      body: JSON.stringify({
        correspondenceId: '123',
        letterId: '456',
        fileType: 'image/gif',
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
      message: 'Image deleted successfully!',
    });
    expect(getHeaders).toHaveBeenCalledWith(event);
    expect(s3.deleteObject).toHaveBeenCalledWith(
      expect.objectContaining({
        Bucket: process.env.IMAGE_S3_BUCKET_NAME,
        Key: '123/456/front',
      }),
    );
  });

  it('should return 500 if there is an error deleting the image', async () => {
    (getHeaders as jest.Mock).mockReturnValue({});
    (s3.deleteObject as jest.Mock).mockImplementation(() => ({
      promise: jest.fn().mockRejectedValue(new Error('Mock error!')),
    }));

    const event = {
      body: JSON.stringify({
        correspondenceId: '123',
        letterId: '456',
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
      message: 'Error deleting image.',
    });
    expect(getHeaders).toHaveBeenCalledWith(event);
  });
});

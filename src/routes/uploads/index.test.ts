import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from 'aws-lambda';
import { handler } from './index';
import { s3, decodeJwtPayload, logger } from '../../common/util';

jest.mock('../../common/util', () => ({
  decodeJwtPayload: jest.fn(() => ({ 'cognito:username': 'mock-user' })),
  s3: {
    getSignedUrlPromise: jest.fn(),
  },
  getHeaders: jest.fn().mockReturnValue({
    'Content-Type': 'application/json',
  }),
  logger: {
    error: jest.fn(),
  },
}));

describe('Lambda Handler - Pre-signed Image Upload URL', () => {
  const context = {} as Context;

  const baseEvent = (overrides = {}): APIGatewayProxyEvent =>
    ({
      body: JSON.stringify({
        correspondenceId: 'abc123',
        letterId: 'def456',
        mimeType: 'image/jpeg',
        view: 'front',
        ...overrides,
      }),
      headers: {
        Authorization: 'Bearer mock.token.payload',
      },
      httpMethod: 'POST',
      isBase64Encoded: false,
      path: '',
      pathParameters: null,
      queryStringParameters: null,
      stageVariables: null,
      requestContext: {},
      resource: '',
    }) as unknown as APIGatewayProxyEvent;

  beforeEach(() => {
    jest.clearAllMocks();
    (s3.getSignedUrlPromise as jest.Mock).mockResolvedValue(
      'https://signed.url',
    );
    jest.spyOn(global, 'Buffer').mockImplementationOnce(() => {
      const originalBuffer = jest.requireActual('buffer').Buffer;
      return Object.assign(originalBuffer, {
        from: () =>
          originalBuffer.from(
            JSON.stringify({ 'cognito:username': 'mock-user' }),
            'utf-8',
          ),
      });
    });
  });

  it('should return 400 if body is missing', async () => {
    const event = baseEvent();
    event.body = null;

    const result = (await handler(
      event,
      context,
      () => {},
    )) as APIGatewayProxyResult;
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).message).toBe('Request body is required.');
  });

  it('should return 400 if required fields are missing', async () => {
    const event = baseEvent({ view: undefined });
    const result = (await handler(
      event,
      context,
      () => {},
    )) as APIGatewayProxyResult;
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).message).toBe('Missing required fields.');
  });

  it('should return 400 if mimeType is unsupported', async () => {
    const event = baseEvent({ mimeType: 'application/pdf' });
    const result = (await handler(
      event,
      context,
      () => {},
    )) as APIGatewayProxyResult;
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).message).toBe(
      'Unsupported MIME type: application/pdf',
    );
  });

  it('should return 400 if Authorization header is missing or malformed', async () => {
    const event = baseEvent();
    event.headers = {};
    const result = (await handler(
      event,
      context,
      () => {},
    )) as APIGatewayProxyResult;
    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).message).toBe(
      'Missing or malformed Authorization header',
    );
  });

  it('should return 200 and signed URL with valid input', async () => {
    const event = baseEvent();
    const result = (await handler(
      event,
      context,
      () => {},
    )) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(200);

    const body = JSON.parse(result.body);

    expect(body.data.signedUrl).toBe('https://signed.url');
    expect(body.message).toBe('Signed URL created successfully!');
    expect(s3.getSignedUrlPromise).toHaveBeenCalled();
  });

  it('should use default domain if PUBLIC_IMAGE_DOMAIN is not set', async () => {
    delete process.env.PUBLIC_IMAGE_DOMAIN;
    const event = baseEvent();
    const result = (await handler(
      event,
      context,
      () => {},
    )) as APIGatewayProxyResult;

    const body = JSON.parse(result.body);
    expect(body.data.imageURL).toContain('dev.onehundredletters.com');
  });

  it('should use environment domain if PUBLIC_IMAGE_DOMAIN is set', async () => {
    process.env.PUBLIC_IMAGE_DOMAIN = 'cdn.example.com';
    const event = baseEvent();
    const result = (await handler(
      event,
      context,
      () => {},
    )) as APIGatewayProxyResult;

    const body = JSON.parse(result.body);
    expect(body.data.imageURL).toContain('cdn.example.com');
  });

  it('should handle thrown error and return 500', async () => {
    (s3.getSignedUrlPromise as jest.Mock).mockRejectedValueOnce(
      new Error('fail'),
    );
    const event = baseEvent();
    const result = (await handler(
      event,
      context,
      () => {},
    )) as APIGatewayProxyResult;
    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body).message).toBe(
      'Error generating pre-signed URL.',
    );
    expect(logger.error).toHaveBeenCalledWith(
      'Error generating pre-signed URL: ',
      expect.any(Error),
    );
  });

  it('should return 400 if both Authorization and authorization headers are missing', async () => {
    const event = baseEvent();
    event.headers = { 'Content-Type': 'application/json' };
    const result = (await handler(
      event,
      context,
      () => {},
    )) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).message).toBe(
      'Missing or malformed Authorization header',
    );
  });

  it('should return 400 if headers is completely undefined', async () => {
    const { headers, ...rest } = baseEvent(); // eslint-disable-line @typescript-eslint/no-unused-vars

    const result = (await handler(
      rest as APIGatewayProxyEvent,
      context,
      () => {},
    )) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body).message).toBe(
      'Missing or malformed Authorization header',
    );
  });

  it('should set uploadedBy to "unknown-user" if cognito:username is missing', async () => {
    (decodeJwtPayload as jest.Mock).mockReturnValue({});

    const event = baseEvent();
    const result = (await handler(
      event,
      context,
      () => {},
    )) as APIGatewayProxyResult;

    expect(result.statusCode).toBe(200);

    const body = JSON.parse(result.body);
    expect(body.data.uploadedBy).toBe('unknown-user');
  });
});

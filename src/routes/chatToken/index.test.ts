import crypto from 'crypto';
import { handler } from './index';
import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from 'aws-lambda';

jest.mock('../../common/util', () => ({
  getHeaders: jest.fn(() => ({
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'X-Custom-Header': 'custom',
  })),
  logger: {
    error: jest.fn(),
  },
}));

describe('Chat Token Handler', () => {
  const OLD_ENV = process.env;
  const mockEvent = {} as APIGatewayProxyEvent;
  const mockContext = {} as Context;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV, CHAT_SECRET: 'test-secret' };
  });

  afterEach(() => {
    process.env = OLD_ENV;
    jest.clearAllMocks();
  });

  it('should return a valid token and status 200', async () => {
    const result = (await handler(
      mockEvent,
      mockContext,
      () => {},
    )) as APIGatewayProxyResult;
    const body = JSON.parse(result.body || '{}');
    const match = body.data.token.match(/^expires=(\d+)&sig=([a-f0-9]+)$/);
    const [, expires, sig] = match!;
    const expectedSig = crypto
      .createHmac('sha256', 'test-secret')
      .update(`expires=${expires}`)
      .digest('hex');
    expect(body.message).toBe('Token generated successfully!');
    expect(match).not.toBeNull();
    expect(result.statusCode).toBe(200);
    expect(sig).toBe(expectedSig);
    expect(result.headers).toEqual({
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'X-Custom-Header': 'custom',
    });
  });

  it('should return 500 if secret is missing', async () => {
    delete process.env.CHAT_SECRET;
    const result = (await handler(
      mockEvent,
      mockContext,
      () => {},
    )) as APIGatewayProxyResult;
    const body = JSON.parse(result.body || '{}');
    expect(result.statusCode).toBe(500);
    expect(body.error).toBe('InternalServerError');
    expect(body.message).toBe('Failed to generate chat token!');
  });
});

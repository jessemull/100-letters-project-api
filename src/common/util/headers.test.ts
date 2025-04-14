import { getHeaders } from './headers';
import { APIGatewayProxyEvent } from 'aws-lambda';

jest.mock('../config', () => ({
  config: {
    accessControlAllowOrigins: [
      'http://localhost:3000',
      'https://dev.onehundredletters.com',
    ],
    headers: {
      'Content-Type': 'application/json',
    },
  },
}));

describe('getHeaders', () => {
  it('should return default headers when origin is not present', () => {
    const event = {
      headers: {},
    } as unknown as APIGatewayProxyEvent;

    const result = getHeaders(event);

    expect(result).toEqual({
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '',
    });
  });

  it('should return headers with matching Access-Control-Allow-Origin if origin is allowed', () => {
    const event = {
      headers: {
        origin: 'http://localhost:3000',
      },
    } as unknown as APIGatewayProxyEvent;

    const result = getHeaders(event);

    expect(result).toEqual({
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': 'http://localhost:3000',
    });
  });

  it('should normalize and match case-insensitive Origin header', () => {
    const event = {
      headers: {
        Origin: 'HTTPS://DEV.ONEHUNDREDLETTERS.COM',
      },
    } as unknown as APIGatewayProxyEvent;

    const result = getHeaders(event);

    expect(result).toEqual({
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': 'HTTPS://DEV.ONEHUNDREDLETTERS.COM',
    });
  });

  it('should return Access-Control-Allow-Origin as empty string if origin is not allowed', () => {
    const event = {
      headers: {
        origin: 'https://evil.com',
      },
    } as unknown as APIGatewayProxyEvent;

    const result = getHeaders(event);

    expect(result).toEqual({
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '',
    });
  });

  it('should trim whitespace from origin before checking', () => {
    const event = {
      headers: {
        origin: '  http://localhost:3000  ',
      },
    } as unknown as APIGatewayProxyEvent;

    const result = getHeaders(event);

    expect(result).toEqual({
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '  http://localhost:3000  ',
    });
  });
});

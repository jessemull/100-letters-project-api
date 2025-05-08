import { APIGatewayProxyEvent } from 'aws-lambda';
import { config } from '../config';

const { accessControlAllowOrigins, headers } = config;

export const getHeaders = (
  event: APIGatewayProxyEvent,
): { [header: string]: string | number | boolean } => {
  const origin = event.headers.origin || event.headers.Origin || '';
  const normalizedOrigin = origin.trim().toLowerCase();
  return {
    ...headers,
    'Access-Control-Allow-Origin':
      origin && accessControlAllowOrigins.includes(normalizedOrigin)
        ? origin
        : '',
  };
};

export function decodeJwtPayload(token: string): {
  'cognito:username': string;
} {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid JWT token format');
  const payload = Buffer.from(parts[1], 'base64').toString('utf-8');
  return JSON.parse(payload);
}

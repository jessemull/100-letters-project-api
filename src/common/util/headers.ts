import { APIGatewayProxyEvent } from 'aws-lambda';
import { config } from '../config';
import { logger } from './logger';

const { accessControlAllowOrigins, headers } = config;

export const getHeaders = (
  event: APIGatewayProxyEvent,
): { [header: string]: string | number | boolean } => {
  logger.error('HEADERS', event.headers, 'ORIGINS', accessControlAllowOrigins);
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

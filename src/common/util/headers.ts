import { APIGatewayProxyEvent } from 'aws-lambda';
import { config } from '../config';
import { logger } from './logger';

const { accessControlAllowOrigins, headers } = config;

export const getHeaders = (
  event: APIGatewayProxyEvent,
): { [header: string]: string | number | boolean } => {
  const origin = event.headers.origin || event.headers.Origin || '';
  logger.error(
    origin,
    event.headers.origin,
    event.headers.Origin,
    accessControlAllowOrigins,
  );
  return {
    ...headers,
    'Access-Control-Allow-Origin':
      origin && accessControlAllowOrigins.includes(origin) ? origin : '',
  };
};

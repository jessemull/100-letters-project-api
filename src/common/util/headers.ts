import { APIGatewayProxyEvent } from 'aws-lambda';
import { config } from '../config';

const { accessControlAllowOrigins, headers } = config;

export const getHeaders = (
  event: APIGatewayProxyEvent,
): { [header: string]: string | number | boolean } => {
  const origin = event.headers.origin || event.headers.Origin || '';
  return {
    ...headers,
    'Access-Control-Allow-Origin':
      origin && accessControlAllowOrigins.includes(origin) ? origin : '',
  };
};

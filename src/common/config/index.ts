import * as dotenv from 'dotenv';

dotenv.config();

const config = {
  correspondenceTableName: process.env.CORRESPONDENCE_TABLE_NAME,
  environment: process.env.ENVIRONMENT || 'dev',
  headers: {
    'Access-Control-Allow-Origin':
      process.env.ACCESS_CONTROL_ALLOW_ORIGIN || '',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, x-amz-date, x-api-key',
  },
  letterTableName: process.env.LETTER_TABLE_NAME,
  recipientTableName: process.env.RECIPIENT_TABLE_NAME,
};

export { config };

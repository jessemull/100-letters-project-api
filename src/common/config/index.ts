import * as dotenv from 'dotenv';

dotenv.config();

const config = {
  correspondenceTableName: process.env.CORRESPONDENCE_TABLE_NAME,
  environment: process.env.ENVIRONMENT || 'dev',
  letterTableName: process.env.LETTER_TABLE_NAME,
  recipientTableName: process.env.RECIPIENT_TABLE_NAME,
};

export { config };

// Load .env only outside Lambda (local scripts/tests). Webpack IgnorePlugin
// keeps dotenv out of route bundles.
if (!process.env.AWS_EXECUTION_ENV && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('dotenv').config();
  } catch {
    // optional dependency for local use
  }
}

const config = {
  accessControlAllowOrigins: process.env.ACCESS_CONTROL_ALLOW_ORIGIN
    ? process.env.ACCESS_CONTROL_ALLOW_ORIGIN.split(',').map((o) =>
        o.trim().toLowerCase(),
      )
    : [],
  correspondenceTableName: process.env.CORRESPONDENCE_TABLE_NAME,
  environment: process.env.ENVIRONMENT || 'dev',
  headers: {
    'Access-Control-Allow-Origin':
      process.env.ACCESS_CONTROL_ALLOW_ORIGIN || '',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, x-amz-date, x-api-key, g-recaptcha-response',
  },
  letterTableName: process.env.LETTER_TABLE_NAME,
  recipientTableName: process.env.RECIPIENT_TABLE_NAME,
};

export { config };

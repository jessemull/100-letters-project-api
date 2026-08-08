import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const sesClient = new SESClient({
  // Lambda sets AWS_REGION; us-west-2 fallback is for local scripts/tests only.
  region: process.env.AWS_REGION || 'us-west-2',
});

export { SESClient, SendEmailCommand, sesClient };

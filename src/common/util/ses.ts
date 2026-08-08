import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const sesClient = new SESClient({
  region: process.env.AWS_REGION || 'us-west-2',
});

export { SESClient, SendEmailCommand, sesClient };

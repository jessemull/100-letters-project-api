import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const sesClient = new SESClient({ region: 'us-west-2' });

export { SESClient, SendEmailCommand, sesClient };

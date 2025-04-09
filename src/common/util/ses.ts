import { SES } from 'aws-sdk';

const sesClient = new SES({ region: 'us-east-1' });

export { sesClient };

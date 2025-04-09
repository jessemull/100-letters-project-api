import { SES } from 'aws-sdk';

const sesClient = new SES({ region: 'us-west-2' });

export { sesClient };

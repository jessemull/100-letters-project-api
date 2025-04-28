import { S3 } from 'aws-sdk';

const s3 = new S3({
  region: 'us-west-2',
});

export { s3 };

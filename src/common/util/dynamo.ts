import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

const dynamoClient = new DynamoDBClient({
  region: 'us-west-2',
});

export { dynamoClient };

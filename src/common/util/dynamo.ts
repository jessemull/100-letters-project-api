import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({
  // Lambda sets AWS_REGION; us-west-2 fallback is for local scripts/tests only.
  region: process.env.AWS_REGION || 'us-west-2',
});

const dynamoClient = DynamoDBDocumentClient.from(client);

export { dynamoClient };

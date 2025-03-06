import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({
  region: 'us-west-2',
});

const dynamoClient = DynamoDBDocumentClient.from(client);

export { dynamoClient };

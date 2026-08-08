import { QueryCommand, type QueryCommandInput } from '@aws-sdk/lib-dynamodb';
import { dynamoClient } from './dynamo';

/** Default page size when following LastEvaluatedKey across Query pages. */
export const DYNAMO_QUERY_PAGE_SIZE = 100;

/** DynamoDB TransactWriteItems hard limit. */
export const DYNAMO_TRANSACT_MAX_ITEMS = 100;

/** Max `limit` query param for list endpoints (aligned with OpenAPI). */
export const MAX_LIST_LIMIT = 100;

/**
 * Run a DynamoDB Query and follow LastEvaluatedKey until all matching
 * items are collected.
 */
export async function queryAllPages<T = Record<string, unknown>>(
  params: Omit<QueryCommandInput, 'ExclusiveStartKey'>,
): Promise<T[]> {
  const items: T[] = [];
  let exclusiveStartKey: QueryCommandInput['ExclusiveStartKey'];

  do {
    const result = await dynamoClient.send(
      new QueryCommand({
        ...params,
        Limit: params.Limit ?? DYNAMO_QUERY_PAGE_SIZE,
        ExclusiveStartKey: exclusiveStartKey,
      }),
    );

    if (result.Items?.length) {
      items.push(...(result.Items as T[]));
    }

    exclusiveStartKey = result.LastEvaluatedKey;
  } while (exclusiveStartKey);

  return items;
}

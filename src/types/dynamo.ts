export type TransactionItem = {
  Update?: {
    TableName: string;
    Key: Record<string, unknown>;
    UpdateExpression: string;
    ExpressionAttributeNames: Record<string, string>;
    ExpressionAttributeValues: Record<string, unknown>;
  };
  Put?: {
    TableName: string;
    Item: Record<string, unknown>;
    ConditionExpression?: string;
  };
};

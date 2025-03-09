import { ReturnValue } from '@aws-sdk/client-dynamodb';

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

export interface UpdateParams {
  TableName: string;
  Key: {
    [key: string]: string;
  };
  UpdateExpression: string;
  ExpressionAttributeNames: {
    [key: string]: string;
  };
  ExpressionAttributeValues: {
    [key: string]: string;
  };
  ReturnValues: ReturnValue;
}

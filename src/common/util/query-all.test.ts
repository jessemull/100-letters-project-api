import { queryAllPages, DYNAMO_QUERY_PAGE_SIZE } from './query-all';
import { dynamoClient } from './dynamo';

jest.mock('./dynamo', () => ({
  dynamoClient: {
    send: jest.fn(),
  },
}));

describe('queryAllPages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns items from a single page', async () => {
    (dynamoClient.send as jest.Mock).mockResolvedValueOnce({
      Items: [{ letterId: 'a' }],
    });

    const items = await queryAllPages({
      TableName: 'letters',
      KeyConditionExpression: 'correspondenceId = :id',
      ExpressionAttributeValues: { ':id': 'c1' },
    });

    expect(items).toEqual([{ letterId: 'a' }]);
    expect(dynamoClient.send).toHaveBeenCalledTimes(1);
  });

  it('follows LastEvaluatedKey across pages', async () => {
    (dynamoClient.send as jest.Mock)
      .mockResolvedValueOnce({
        Items: [{ letterId: 'a' }],
        LastEvaluatedKey: { letterId: 'a' },
      })
      .mockResolvedValueOnce({
        Items: [{ letterId: 'b' }],
      });

    const items = await queryAllPages({
      TableName: 'letters',
      KeyConditionExpression: 'correspondenceId = :id',
      ExpressionAttributeValues: { ':id': 'c1' },
      Limit: DYNAMO_QUERY_PAGE_SIZE,
    });

    expect(items).toEqual([{ letterId: 'a' }, { letterId: 'b' }]);
    expect(dynamoClient.send).toHaveBeenCalledTimes(2);
    expect(
      (dynamoClient.send as jest.Mock).mock.calls[1][0].input.ExclusiveStartKey,
    ).toEqual({ letterId: 'a' });
  });
});

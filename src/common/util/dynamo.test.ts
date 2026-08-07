import { dynamoClient } from './dynamo';

describe('Dynamo DB Client', () => {
  afterAll(() => {
    dynamoClient.destroy();
  });

  it('should be defined', () => {
    expect(dynamoClient).toBeDefined();
  });
});

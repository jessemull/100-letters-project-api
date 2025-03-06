import { dynamoClient } from './index';

describe('Dynamo DB Client', () => {
  it('should be defined', () => {
    expect(dynamoClient).toBeDefined();
  });
});

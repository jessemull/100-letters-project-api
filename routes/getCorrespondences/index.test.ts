import { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { handler } from './index';

describe('Get Correspondences Route', () => {
  it('Should return 200 with message.', async () => {
    const event: APIGatewayProxyEvent = {} as APIGatewayProxyEvent;
    const context: Context = {} as Context;
    const result = await handler(event, context, () => {}) as APIGatewayProxyResult;
    expect(result.statusCode).toBe(200);
    expect(result.body).toBe(
      JSON.stringify({
        message: 'Get Correspondences',
      })
    );
  });
});

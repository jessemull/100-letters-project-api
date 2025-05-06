import { Context, S3Event } from 'aws-lambda';
import { handler } from './index';

describe('imageProcessor Route', () => {
  it('Should return 200 with message.', async () => {
    const event: S3Event = {} as S3Event;
    const context: Context = {} as Context;
    await handler(event, context, () => {});
  });
});

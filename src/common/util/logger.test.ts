import * as bunyan from 'bunyan';
import BunyanCloudWatch from 'bunyan-cloudwatch';
import { logger } from './index';

jest.mock('bunyan-cloudwatch', () => jest.fn(() => ({ write: jest.fn() })));

describe('Logger', () => {
  it('should be defined', () => {
    expect(logger).toBeDefined();
  });

  it('should create a logger with the correct name', () => {
    expect(logger.fields.name).toBe('one-hundred-letters-api-logger');
  });

  it('should use the correct log level', () => {
    expect(logger.level()).toBe(bunyan.INFO); // Bunyan's "info" level is 30
  });

  it('should configure a CloudWatch stream with the correct parameters', () => {
    expect(BunyanCloudWatch).toHaveBeenCalledWith(
      expect.objectContaining({
        logGroupName: '/aws/lambda/one-hundred-letters-api-log-group',
        logStreamName: 'one-hundred-letters-api-log-stream',
        awsRegion: 'us-west-2',
      }),
    );
  });
});

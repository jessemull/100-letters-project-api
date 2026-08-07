import * as bunyan from 'bunyan';
import { logger } from './logger';

describe('Logger', () => {
  it('should be defined', () => {
    expect(logger).toBeDefined();
  });

  it('should create a logger with the correct name', () => {
    expect(logger.fields.name).toBe('one-hundred-letters-api-logger');
  });

  it('should use the correct log level', () => {
    expect(logger.level()).toBe(bunyan.INFO);
  });

  it('should log to stdout only (Lambda ships stdout to CloudWatch)', () => {
    const streams = (
      logger as bunyan & { streams: { type?: string; stream?: unknown }[] }
    ).streams;
    expect(streams).toHaveLength(1);
    expect(streams[0].stream).toBe(process.stdout);
  });
});

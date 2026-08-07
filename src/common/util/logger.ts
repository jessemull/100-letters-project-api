import * as bunyan from 'bunyan';

// Lambda captures stdout/stderr into CloudWatch Logs automatically.
const logger = bunyan.createLogger({
  name: 'one-hundred-letters-api-logger',
  level: (process.env.LOG_LEVEL as bunyan.LogLevel) || 'info',
  serializers: bunyan.stdSerializers,
  streams: [
    {
      level: 'info',
      stream: process.stdout,
    },
  ],
});

export { logger };

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
var bunyan = require("bunyan");
var bunyan_cloudwatch_1 = require("bunyan-cloudwatch");
var logger = bunyan.createLogger({
    name: 'one-hundred-letters-api-logger',
    level: process.env.LOG_LEVEL || 'info',
    serializers: bunyan.stdSerializers,
    streams: [
        {
            level: 'info',
            stream: process.stdout,
        },
        {
            level: 'error',
            type: 'raw',
            stream: (0, bunyan_cloudwatch_1.default)({
                logGroupName: '/aws/lambda/one-hundred-letters-api-log-group',
                logStreamName: 'one-hundred-letters-api-log-stream',
                awsRegion: 'us-west-2',
            }),
        },
    ],
});
exports.logger = logger;

import { CustomError } from './custom-error';

class BadRequestError extends Error implements CustomError {
  statusCode: number;

  constructor(message: string) {
    super(message);
    this.name = 'BadRequestError';
    this.statusCode = 400;
    Object.setPrototypeOf(this, BadRequestError.prototype);
  }

  build(headers = {}) {
    return {
      headers,
      body: JSON.stringify({
        error: this.name,
        message: this.message,
      }),
      statusCode: this.statusCode,
    };
  }
}

export { BadRequestError };

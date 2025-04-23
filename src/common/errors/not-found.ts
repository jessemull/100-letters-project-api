import { CustomError } from './custom-error';

class NotFoundError extends Error implements CustomError {
  statusCode: number;

  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = 404;
    Object.setPrototypeOf(this, NotFoundError.prototype);
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

export { NotFoundError };

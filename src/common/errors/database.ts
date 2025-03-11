import { CustomError } from './custom-error';

class DatabaseError extends Error implements CustomError {
  statusCode: number;

  constructor(message: string) {
    super(message);
    this.name = 'DatabaseError';
    this.statusCode = 500;
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }

  build() {
    return {
      body: JSON.stringify({
        error: this.name,
        message: this.message,
      }),
      statusCode: this.statusCode,
    };
  }
}

export { DatabaseError };

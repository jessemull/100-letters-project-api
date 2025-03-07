class NotFoundError extends Error {
  statusCode: number;
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = 404;
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

export { NotFoundError };

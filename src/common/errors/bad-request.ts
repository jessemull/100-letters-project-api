class BadRequestError extends Error {
  statusCode: number;
  constructor(message: string) {
    super(message);
    this.name = 'BadRequestError';
    this.statusCode = 400;
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

export { BadRequestError };

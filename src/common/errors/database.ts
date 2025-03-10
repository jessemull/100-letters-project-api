class DatabaseError extends Error {
  statusCode: number;
  constructor(message: string) {
    super(message);
    this.name = 'DatabaseError';
    this.statusCode = 500;
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

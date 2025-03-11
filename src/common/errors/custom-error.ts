interface CustomError extends Error {
  statusCode: number;
  build(): { body: string; statusCode: number };
}

export { CustomError };

import { prisma } from './index';

describe('Prisma Client', () => {
  it('should be defined', () => {
    expect(prisma).toBeDefined();
  });
});

const { PrismaClient } = require('@prisma/client');
const { faker } = require('@faker-js/faker');

const prisma = new PrismaClient();

const seed = async () => {
  for (let i = 0; i < 10; i++) {
    const person = await prisma.person.create({
      data: {
        name: faker.person.fullName(),
        address: faker.location.streetAddress(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    for (let j = 0; j < 10; j++) {
      const correspondence = await prisma.correspondence.create({
        data: {
          personId: person.id,
          reason: faker.lorem.sentence(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      for (let k = 0; k < 2; k++) {
        await prisma.letter.create({
          data: {
            correspondenceId: correspondence.id,
            type: faker.helpers.arrayElement(['sent', 'received']),
            date: faker.date.recent(),
            text: faker.lorem.paragraph(),
            method: faker.helpers.arrayElement(['email', 'mail']),
            status: faker.helpers.arrayElement(['pending', 'responded']),
            title: faker.lorem.words(),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
      }
    }
  }

  console.log('Seeding completed!');
};

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

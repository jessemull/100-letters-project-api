const { DynamoDBClient, PutItemCommand } = require('@aws-sdk/client-dynamodb');
const { faker } = require('@faker-js/faker');

const dynamoDBClient = new DynamoDBClient({ region: 'us-west-2' });

const recipientTableName = 'OneHundredLettersRecipientTable';
const correspondenceTableName = 'OneHundredLettersCorrespondenceTable';
const letterTableName = 'OneHundredLettersLetterTable';

const numRecipients = 10;
const numCorrespondences = 20;
const numLetters = 30;

function generateRecipientData(id) {
  return {
    address: { M: {
      city: { S: faker.location.city() },
      country: { S: faker.location.country() },
      postalCode: { S: faker.location.zipCode() },
      state: { S: faker.location.state() },
      street: { S: faker.location.streetAddress() }
    }},
    createdAt: { S: faker.date.past().toISOString() },
    description: { S: faker.lorem.sentence() },
    firstName: { S: faker.person.firstName() },
    lastName: { S: faker.person.lastName() },
    occupation: { S: faker.person.jobTitle() },
    organization: { S: faker.company.name() },
    recipientId: { S: `RECIPIENT#${id}` },
    updatedAt: { S: faker.date.recent().toISOString() },
  };
}

function generateCorrespondenceData(recipientId, correspondenceId) {
  return {
    correspondenceId: { S: `CORRESPONDENCE#${correspondenceId}` },
    createdAt: { S: faker.date.past().toISOString() },
    recipientId: { S: `RECIPIENT#${recipientId}` },
    reason: { M: {
      description: { S: faker.lorem.sentence() },
      domain: { S: faker.person.jobArea() },
      impact: { S: faker.helpers.arrayElement(['LOW', 'MEDIUM', 'HIGH']) }
    }},
    status: { S: faker.helpers.arrayElement(['PENDING', 'RESPONDED', 'UNSENT', 'COMPLETED']) },
    title: { S: faker.lorem.words() },
    updatedAt: { S: faker.date.recent().toISOString() }
  };
}

function generateLetterData(correspondenceId, letterId) {
  return {
    correspondenceId: { S: `CORRESPONDENCE#${correspondenceId}` },
    createdAt: { S: faker.date.past().toISOString() },
    description: { S: faker.lorem.sentence() },
    imageURLs: { L: [{ S: faker.image.url() }, { S: faker.image.url() }] },
    letterId: { S: `LETTER#${letterId}` },
    method: { S: faker.helpers.arrayElement(['TYPED', 'HANDWRITTEN', 'PRINTED', 'DIGITAL', 'OTHER']) },
    status: { S: faker.helpers.arrayElement(['PENDING', 'SENT', 'RECEIVED', 'RESPONDED']) },
    text: { S: faker.lorem.paragraph() },
    title: { S: faker.lorem.words() },
    type: { S: faker.helpers.arrayElement(['MAIL', 'EMAIL', 'SMS', 'OTHER']) },
    updatedAt: { S: faker.date.recent().toISOString() },
  };
}

async function seedData() {
  try {
    for (let i = 1; i <= numRecipients; i++) {
      const recipient = generateRecipientData(i);
      await dynamoDBClient.send(new PutItemCommand({ TableName: recipientTableName, Item: recipient }));
      console.log(`Inserted recipient: ${recipient.recipientId.S}`);
    }

    for (let i = 1; i <= numCorrespondences; i++) {
      const recipientId = faker.helpers.arrayElement([...Array(numRecipients).keys()].map(i => i + 1));
      const correspondence = generateCorrespondenceData(recipientId, i);
      await dynamoDBClient.send(new PutItemCommand({ TableName: correspondenceTableName, Item: correspondence }));
      console.log(`Inserted correspondence: ${correspondence.correspondenceId.S}`);
    }

    for (let i = 1; i <= numLetters; i++) {
      const correspondenceId = faker.helpers.arrayElement([...Array(numCorrespondences).keys()].map(i => i + 1));
      const letter = generateLetterData(correspondenceId, i);
      await dynamoDBClient.send(new PutItemCommand({ TableName: letterTableName, Item: letter }));
      console.log(`Inserted letter: ${letter.letterId.S}`);
    }

    console.log('Seed data inserted successfully...');
  } catch (error) {
    console.error('Error seeding data: ', error);
  }
}

seedData();

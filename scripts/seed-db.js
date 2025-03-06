const { DynamoDBClient, PutItemCommand } = require('@aws-sdk/client-dynamodb');
const { faker } = require('@faker-js/faker');

const dynamoDBClient = new DynamoDBClient({ region: 'us-west-2' });

const personTableName = 'OneHundredLettersPersonTable';
const correspondenceTableName = 'OneHundredLettersCorrespondenceTable';
const letterTableName = 'OneHundredLettersLetterTable';

const numPersons = 10;
const numCorrespondences = 20;
const numLetters = 30;

function generatePersonData(id) {
  return {
    PK: { S: `PERSON#${id}` },
    SK: { S: 'PROFILE' },
    firstName: { S: faker.person.firstName() },
    lastName: { S: faker.person.lastName() },
    address: { S: faker.location.streetAddress() },
    createdAt: { S: faker.date.past().toISOString() },
    updatedAt: { S: faker.date.recent().toISOString() }
  };
}

function generateCorrespondenceData(personId, correspondenceId) {
  return {
    PK: { S: `CORRESPONDENCE#${correspondenceId}` },
    SK: { S: `PERSON#${personId}` },
    reason: { S: faker.lorem.sentence() },
    createdAt: { S: faker.date.past().toISOString() },
    updatedAt: { S: faker.date.recent().toISOString() }
  };
}

function generateLetterData(correspondenceId, letterId) {
  return {
    PK: { S: `CORRESPONDENCE#${correspondenceId}` },
    SK: { S: `LETTER#${letterId}` },
    type: { S: faker.helpers.arrayElement(['email', 'physical mail']) },
    date: { S: faker.date.past().toISOString() },
    text: { S: faker.lorem.paragraph() },
    method: { S: faker.helpers.arrayElement(['handwritten', 'typed']) },
    status: { S: faker.helpers.arrayElement(['sent', 'pending']) },
    imageURL: { S: faker.image.url() },
    title: { S: faker.lorem.words() },
    createdAt: { S: faker.date.past().toISOString() },
    updatedAt: { S: faker.date.recent().toISOString() }
  };
}

async function seedData() {
  try {
    for (let i = 1; i <= numPersons; i++) {
      const person = generatePersonData(i);
      const params = {
        TableName: personTableName,
        Item: person
      };
      const command = new PutItemCommand(params);
      await dynamoDBClient.send(command);
      console.log(`Inserted person: ${person.PK.S}`);
    }

    for (let i = 1; i <= numCorrespondences; i++) {
      const personId = faker.helpers.arrayElement([...Array(numPersons).keys()].map(i => i + 1));
      const correspondence = generateCorrespondenceData(personId, i);
      const params = {
        TableName: correspondenceTableName,
        Item: correspondence
      };
      const command = new PutItemCommand(params);
      await dynamoDBClient.send(command);
      console.log(`Inserted correspondence: ${correspondence.PK.S}`);
    }

    for (let i = 1; i <= numLetters; i++) {
      const correspondenceId = faker.helpers.arrayElement([...Array(numCorrespondences).keys()].map(i => i + 1));
      const letter = generateLetterData(correspondenceId, i);
      const params = {
        TableName: letterTableName,
        Item: letter
      };
      const command = new PutItemCommand(params);
      await dynamoDBClient.send(command);
      console.log(`Inserted letter: ${letter.PK.S}`);
    }
    console.log('Seed data inserted successfully...');
  } catch (error) {
    console.error('Error seeding data: ', error);
  }
}

seedData();

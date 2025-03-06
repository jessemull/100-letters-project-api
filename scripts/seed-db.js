const AWS = require('aws-sdk');
const { faker } = require('@faker-js/faker');

const dynamoDB = new AWS.DynamoDB.DocumentClient({ region: 'us-west-2' });

const personTableName = 'OneHundredLettersPersonTable';
const correspondenceTableName = 'OneHundredLettersCorrespondenceTable';
const letterTableName = 'OneHundredLettersLetterTable';

const numPersons = 10;
const numCorrespondences = 20;
const numLetters = 30;

function generatePersonData(id) {
  return {
    PK: `PERSON#${id}`,
    SK: 'PROFILE',
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    address: faker.location.streetAddress(),
    createdAt: faker.date.past().toISOString(),
    updatedAt: faker.date.recent().toISOString()
  };
}

function generateCorrespondenceData(personId, correspondenceId) {
  return {
    PK: `CORRESPONDENCE#${correspondenceId}`,
    SK: `PERSON#${personId}`,
    reason: faker.lorem.sentence(),
    createdAt: faker.date.past().toISOString(),
    updatedAt: faker.date.recent().toISOString()
  };
}

function generateLetterData(correspondenceId, letterId) {
  return {
    PK: `CORRESPONDENCE#${correspondenceId}`,
    SK: `LETTER#${letterId}`,
    type: faker.helpers.arrayElement(['email', 'physical mail']), // Use helpers
    date: faker.date.past().toISOString(),
    text: faker.lorem.paragraph(),
    method: faker.helpers.arrayElement(['handwritten', 'typed']), // Use helpers
    status: faker.helpers.arrayElement(['sent', 'pending']), // Use helpers
    imageURL: faker.image.url(),
    title: faker.lorem.words(),
    createdAt: faker.date.past().toISOString(),
    updatedAt: faker.date.recent().toISOString()
  };
}

async function seedData() {
  try {
    // Seed persons
    for (let i = 1; i <= numPersons; i++) {
      const person = generatePersonData(i);
      await dynamoDB.put({
        TableName: personTableName,
        Item: person
      }).promise();
      console.log(`Inserted person: ${person.PK}`);
    }

    // Seed correspondences
    for (let i = 1; i <= numCorrespondences; i++) {
      const personId = faker.helpers.arrayElement([...Array(numPersons).keys()].map(i => i + 1)); // Ensure array index is correct
      const correspondence = generateCorrespondenceData(personId, i);
      await dynamoDB.put({
        TableName: correspondenceTableName,
        Item: correspondence
      }).promise();
      console.log(`Inserted correspondence: ${correspondence.PK}`);
    }

    for (let i = 1; i <= numLetters; i++) {
      const correspondenceId = faker.helpers.arrayElement([...Array(numCorrespondences).keys()].map(i => i + 1)); // Ensure array index is correct
      const letter = generateLetterData(correspondenceId, i);
      await dynamoDB.put({
        TableName: letterTableName,
        Item: letter
      }).promise();
      console.log(`Inserted letter: ${letter.PK}`);
    }
    console.log('Seed data inserted successfully...');
  } catch (error) {
    console.error('Error seeding data: ', error);
  }
}

seedData();

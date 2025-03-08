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
    recipientId: { S: `RECIPIENT#${id}` },
    firstName: { S: faker.person.firstName() },
    lastName: { S: faker.person.lastName() },
    address: { S: faker.location.streetAddress() },
    createdAt: { S: faker.date.past().toISOString() },
    updatedAt: { S: faker.date.recent().toISOString() }
  };
}

function generateCorrespondenceData(recipientId, correspondenceId) {
  return {
    correspondenceId: { S: `CORRESPONDENCE#${correspondenceId}` },
    recipientId: { S: `RECIPIENT#${recipientId}` }, 
    reason: { S: faker.lorem.sentence() },
    createdAt: { S: faker.date.past().toISOString() },
    updatedAt: { S: faker.date.recent().toISOString() }
  };
}

function generateLetterData(correspondenceId, letterId) {
  return {
    letterId: { S: `LETTER#${letterId}` },
    correspondenceId: { S: `CORRESPONDENCE#${correspondenceId}` }, 
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
    for (let i = 1; i <= numRecipients; i++) {
      const recipient = generateRecipientData(i);
      const params = {
        TableName: recipientTableName,
        Item: recipient
      };
      const command = new PutItemCommand(params);
      await dynamoDBClient.send(command);
      console.log(`Inserted recipient: ${recipient.recipientId.S}`);
    }

    for (let i = 1; i <= numCorrespondences; i++) {
      const recipientId = faker.helpers.arrayElement([...Array(numRecipients).keys()].map(i => i + 1));
      const correspondence = generateCorrespondenceData(recipientId, i);
      const params = {
        TableName: correspondenceTableName,
        Item: correspondence
      };
      const command = new PutItemCommand(params);
      await dynamoDBClient.send(command);
      console.log(`Inserted correspondence: ${correspondence.correspondenceId.S}`);
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
      console.log(`Inserted letter: ${letter.letterId.S}`);
    }
    console.log('Seed data inserted successfully...');
  } catch (error) {
    console.error('Error seeding data: ', error);
  }
}

seedData();

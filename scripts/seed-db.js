const { DynamoDBClient, PutItemCommand } = require('@aws-sdk/client-dynamodb');
const { faker } = require('@faker-js/faker');
const { v4: uuidv4 } = require('uuid');

const dynamoDBClient = new DynamoDBClient({ region: 'us-west-2' });

const recipientTableName = 'one-hundred-letters-recipient-table-dev';
const correspondenceTableName = 'one-hundred-letters-correspondence-table-dev';
const letterTableName = 'one-hundred-letters-letter-table-dev';

const numCorrespondences = 60;

function generateRecipientData(id) {
  return {
    searchPartition: { S: 'RECIPIENT' },
    address: {
      M: {
        city: { S: faker.location.city() },
        country: { S: faker.location.country() },
        postalCode: { S: faker.location.zipCode() },
        state: { S: faker.location.state() },
        street: { S: faker.location.streetAddress() }
      }
    },
    createdAt: { S: faker.date.past().toISOString() },
    description: { S: faker.lorem.sentence() },
    firstName: { S: faker.person.firstName() },
    lastName: { S: faker.person.lastName() },
    occupation: { S: faker.person.jobTitle() },
    organization: { S: faker.company.name() },
    recipientId: { S: id },
    updatedAt: { S: faker.date.recent().toISOString() }
  };
}

function generateCorrespondenceData(recipientId, correspondenceId) {
  return {
    correspondenceId: { S: correspondenceId },
    createdAt: { S: faker.date.past().toISOString() },
    recipientId: { S: recipientId },
    reason: {
      M: {
        description: { S: faker.lorem.sentence() },
        category: { S: faker.helpers.arrayElement(['ARTS', 'ENTERTAINMENT', 'FAMILY', 'FOOD', 'FRIENDS', 'GOVERNMENT', 'LITERATURE', 'MENTORS', 'MUSIC', 'SCIENCE', 'SPORTS', 'TECHNOLOGY']) },
      }
    },
    searchPartition: { S: 'CORRESPONDENCE' },
    status: { S: faker.helpers.arrayElement(['PENDING', 'RESPONDED', 'UNSENT', 'COMPLETED']) },
    title: { S: faker.lorem.words() },
    updatedAt: { S: faker.date.recent().toISOString() }
  };
}

function generateImageURLData(correspondenceId, letterId, imageNumber, view) {
  const uuid = uuidv4();
  const baseUrl = `https://dev.onehundredletters.com/images/mockCorrespondenceId/mockLetterId/mockView`;

  return {
    M: {
      id: { S: uuid },
      fileKey: { S: `images/${correspondenceId}/${letterId}/${view}/${uuid}_large_${imageNumber}.jpg` },
      url: { S: `${baseUrl}/mock_image_large_${imageNumber}.jpg` },
      urlThumbnail: { S: `${baseUrl}/mock_image_thumb_${imageNumber}.jpg` },
      view: { S: view },
      caption: { S: faker.lorem.sentence() },
      dateUploaded: { S: faker.date.recent().toISOString() },
      mimeType: { S: faker.helpers.arrayElement(['image/jpeg', 'image/png', 'image/webp']) },
      sizeInBytes: { N: faker.number.int({ min: 10000, max: 5000000 }).toString() },
      uploadedBy: { S: faker.internet.email() }
    }
  };
}

function maybeDateField() {
  return Math.random() > 0.5
    ? { S: faker.date.recent().toISOString() }
    : undefined;
}

function generateLetterData(correspondenceId, letterId) {
  const imageCount = faker.number.int({ min: 1, max: 10 });
  const imageNumbers = faker.helpers.shuffle([...Array(10).keys()]).slice(0, imageCount);

  const view = faker.helpers.arrayElement(['ENVELOPE_FRONT', 'ENVELOPE_BACK', 'LETTER_FRONT', 'LETTER_BACK']);
  const imageURLs = imageNumbers.map((num) => generateImageURLData(correspondenceId, letterId, num, view));

  const letter = {
    correspondenceId: { S: correspondenceId },
    createdAt: { S: faker.date.past().toISOString() },
    description: { S: faker.lorem.sentence() },
    imageURLs: { L: imageURLs },
    letterId: { S: letterId },
    method: { S: faker.helpers.arrayElement(['TYPED', 'HANDWRITTEN', 'PRINTED', 'DIGITAL', 'OTHER']) },
    searchPartition: { S: 'LETTER' },
    status: { S: faker.helpers.arrayElement(['PENDING', 'SENT', 'RECEIVED', 'RESPONDED']) },
    text: { S: faker.lorem.paragraph() },
    title: { S: faker.lorem.words() },
    type: { S: faker.helpers.arrayElement(['MAIL', 'EMAIL', 'SMS', 'OTHER']) },
    updatedAt: { S: faker.date.recent().toISOString() }
  };

  const sentAt = maybeDateField();
  const receivedAt = maybeDateField();

  if (sentAt) letter.sentAt = sentAt;
  if (receivedAt) letter.receivedAt = receivedAt;

  return letter;
}

async function seedData() {
  try {
    for (let i = 0; i < numCorrespondences; i++) {
      const recipientId = uuidv4();
      const correspondenceId = uuidv4();

      const recipient = generateRecipientData(recipientId);
      await dynamoDBClient.send(new PutItemCommand({ TableName: recipientTableName, Item: recipient }));
      console.log(`Inserted recipient: ${recipientId}`);

      const correspondence = generateCorrespondenceData(recipientId, correspondenceId);
      await dynamoDBClient.send(new PutItemCommand({ TableName: correspondenceTableName, Item: correspondence }));
      console.log(`Inserted correspondence: ${correspondenceId}`);

      const letterCount = faker.number.int({ min: 1, max: 3 });
      for (let j = 0; j < letterCount; j++) {
        const letterId = uuidv4();
        const letter = generateLetterData(correspondenceId, letterId);
        await dynamoDBClient.send(new PutItemCommand({ TableName: letterTableName, Item: letter }));
        console.log(`Inserted letter: ${letterId}`);
      }
    }

    console.log('Seed data inserted successfully...');
  } catch (error) {
    console.error('Error seeding data: ', error);
  }
}

seedData();

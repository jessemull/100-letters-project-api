const AWS = require('aws-sdk');

// Specify the region
AWS.config.update({ region: 'us-west-2' });

const dynamoDB = new AWS.DynamoDB.DocumentClient();

const tableNames = [
  'OneHundredLettersPersonTable',
  'OneHundredLettersCorrespondenceTable',
  'OneHundredLettersLetterTable',
];

async function deleteTableItems(tableName) {
  let params = {
    TableName: tableName
  };

  let data;
  try {
    data = await dynamoDB.scan(params).promise();
  } catch (error) {
    console.error(`Error scanning table ${tableName}: `, error);
    return;
  }

  for (let i = 0; i < data.Items.length; i++) {
    const deleteParams = {
      TableName: tableName,
      Key: {
        PK: data.Items[i].PK,
        SK: data.Items[i].SK,
      },
    };

    try {
      await dynamoDB.delete(deleteParams).promise();
      console.log(`Deleted item from ${tableName}: `, data.Items[i]);
    } catch (error) {
      console.error(`Error deleting item from ${tableName}: `, error);
    }
  }
}

async function resetTables() {
  for (let tableName of tableNames) {
    console.log(`Resetting table: ${tableName}`);
    await deleteTableItems(tableName);
  }
  console.log('All tables have been reset!');
}

resetTables().catch((error) => console.error('Error resetting tables:', error));

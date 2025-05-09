const { DynamoDBClient, ScanCommand, DeleteItemCommand } = require('@aws-sdk/client-dynamodb');

const dynamoDBClient = new DynamoDBClient({ region: 'us-west-2' });

const tableNames = [
  'one-hundred-letters-recipient-table-dev',
  'one-hundred-letters-correspondence-table-dev',
  'one-hundred-letters-letter-table-dev',
];

async function deleteTableItems(tableName) {
  const scanParams = {
    TableName: tableName,
  };

  let data;
  try {
    const scanCommand = new ScanCommand(scanParams);
    data = await dynamoDBClient.send(scanCommand);
  } catch (error) {
    console.error(`Error scanning table ${tableName}: `, error);
    return;
  }

  for (let i = 0; i < data.Items.length; i++) {
    let key;
    if (tableName === 'one-hundred-letters-recipient-table-dev') {
      // Delete recipient items using the composite key (PK and SK)
      key = { PK: data.Items[i].PK, SK: data.Items[i].SK };
    } else if (tableName === 'one-hundred-letters-correspondence-table-dev') {
      // Assuming correspondence table also uses a composite key
      key = { PK: data.Items[i].PK, SK: data.Items[i].SK };
    } else if (tableName === 'one-hundred-letters-letter-table-dev') {
      // Assuming letter table uses a composite key as well
      key = { PK: data.Items[i].PK, SK: data.Items[i].SK };
    }

    const deleteParams = {
      TableName: tableName,
      Key: key,
    };

    try {
      const deleteCommand = new DeleteItemCommand(deleteParams);
      await dynamoDBClient.send(deleteCommand);
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

resetTables().catch((error) => console.error('Error resetting tables: ', error));

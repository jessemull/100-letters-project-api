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
      key = { recipientId: data.Items[i].recipientId };
    } else if (tableName === 'one-hundred-letters-correspondence-table-dev') {
      key = { correspondenceId: data.Items[i].correspondenceId };
    } else if (tableName === 'one-hundred-letters-letter-table-dev') {
      key = { correspondenceId: data.Items[i].correspondenceId, letterId: data.Items[i].letterId };
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

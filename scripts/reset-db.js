/**
 * Delete all items from recipient/correspondence/letter DynamoDB tables.
 *
 * Usage:
 *   node scripts/reset-db.js --env=dev
 *   node scripts/reset-db.js --env=prod --confirm-prod
 *
 * Defaults to --env=dev. Prod requires --confirm-prod.
 * Scans paginate until empty; letter table uses composite key.
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  DynamoDBDocumentClient,
  ScanCommand,
  DeleteCommand,
} = require('@aws-sdk/lib-dynamodb');

const REGION = process.env.AWS_REGION || 'us-west-2';
const TABLES = ['recipient', 'correspondence', 'letter'];

function parseArgs(argv) {
  const args = { env: 'dev', confirmProd: false, help: false };
  for (const raw of argv.slice(2)) {
    if (raw.startsWith('--env=')) args.env = raw.slice('--env='.length);
    else if (raw === '--confirm-prod') args.confirmProd = true;
    else if (raw === '--help' || raw === '-h') args.help = true;
  }
  return args;
}

function tableName(kind, env) {
  return `one-hundred-letters-${kind}-table-${env}`;
}

function itemKey(kind, item) {
  if (kind === 'recipient') {
    return { recipientId: item.recipientId };
  }
  if (kind === 'correspondence') {
    return { correspondenceId: item.correspondenceId };
  }
  if (kind === 'letter') {
    return {
      correspondenceId: item.correspondenceId,
      letterId: item.letterId,
    };
  }
  throw new Error(`Unknown table kind: ${kind}`);
}

async function deleteAllItems(doc, kind, env) {
  const name = tableName(kind, env);
  let deleted = 0;

  // Keep scanning until a page returns no items (handles pagination + races).
  for (;;) {
    const page = await doc.send(
      new ScanCommand({
        TableName: name,
        Limit: 100,
      }),
    );
    const items = page.Items || [];
    if (items.length === 0) break;

    for (const item of items) {
      await doc.send(
        new DeleteCommand({
          TableName: name,
          Key: itemKey(kind, item),
        }),
      );
      deleted += 1;
    }
  }

  return { tableName: name, deleted };
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    console.log(
      'Usage: node scripts/reset-db.js --env=dev|prod [--confirm-prod]',
    );
    process.exit(0);
  }

  if (args.env !== 'dev' && args.env !== 'prod') {
    console.error(`Invalid --env=${args.env}; use dev or prod`);
    process.exit(1);
  }

  if (args.env === 'prod' && !args.confirmProd) {
    console.error(
      'Refusing to wipe prod without --confirm-prod. Backup first (scripts/export-db.js).',
    );
    process.exit(1);
  }

  const client = DynamoDBDocumentClient.from(
    new DynamoDBClient({ region: REGION }),
  );
  console.log(`Resetting ${args.env} DynamoDB tables in ${REGION}...`);

  for (const kind of TABLES) {
    const result = await deleteAllItems(client, kind, args.env);
    console.log(`  ${result.tableName}: deleted ${result.deleted}`);
  }

  console.log('All tables have been reset.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

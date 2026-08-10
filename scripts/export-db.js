/**
 * Export DynamoDB recipient/correspondence/letter tables to dated JSON.
 *
 * Usage:
 *   node scripts/export-db.js --env=dev
 *   node scripts/export-db.js --env=prod --out=./backups
 *
 * Defaults: --env=dev, --out=./backups/db-export-<timestamp>
 */

const fs = require('fs');
const path = require('path');
const {
  DynamoDBClient,
  ScanCommand,
} = require('@aws-sdk/client-dynamodb');
const { unmarshall } = require('@aws-sdk/util-dynamodb');

const REGION = process.env.AWS_REGION || 'us-west-2';
const TABLES = ['recipient', 'correspondence', 'letter'];

function parseArgs(argv) {
  const args = { env: 'dev', out: null };
  for (const raw of argv.slice(2)) {
    if (raw.startsWith('--env=')) args.env = raw.slice('--env='.length);
    else if (raw.startsWith('--out=')) args.out = raw.slice('--out='.length);
    else if (raw === '--help' || raw === '-h') args.help = true;
  }
  return args;
}

function tableName(kind, env) {
  return `one-hundred-letters-${kind}-table-${env}`;
}

async function scanAll(client, name) {
  const items = [];
  let ExclusiveStartKey;

  do {
    const page = await client.send(
      new ScanCommand({
        TableName: name,
        ExclusiveStartKey,
      }),
    );
    for (const item of page.Items || []) {
      items.push(unmarshall(item));
    }
    ExclusiveStartKey = page.LastEvaluatedKey;
  } while (ExclusiveStartKey);

  return items;
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    console.log(
      'Usage: node scripts/export-db.js --env=dev|prod [--out=./backups]',
    );
    process.exit(0);
  }

  if (args.env !== 'dev' && args.env !== 'prod') {
    console.error(`Invalid --env=${args.env}; use dev or prod`);
    process.exit(1);
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outDir =
    args.out ||
    path.join(process.cwd(), 'backups', `db-export-${args.env}-${stamp}`);

  fs.mkdirSync(outDir, { recursive: true });

  const client = new DynamoDBClient({ region: REGION });
  const summary = { env: args.env, region: REGION, exportedAt: new Date().toISOString(), tables: {} };

  console.log(`Exporting ${args.env} tables to ${outDir}`);

  for (const kind of TABLES) {
    const name = tableName(kind, args.env);
    console.log(`Scanning ${name}...`);
    const items = await scanAll(client, name);
    const file = path.join(outDir, `${kind}.json`);
    fs.writeFileSync(file, JSON.stringify(items, null, 2));
    summary.tables[kind] = { tableName: name, count: items.length, file: path.basename(file) };
    console.log(`  ${items.length} items → ${file}`);
  }

  fs.writeFileSync(
    path.join(outDir, 'summary.json'),
    JSON.stringify(summary, null, 2),
  );
  console.log('Done.', JSON.stringify(summary.tables, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

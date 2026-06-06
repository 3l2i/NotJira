/**
 * ═══════════════════════════════════════════════════════════════
 * DynamoDB Table Creation Script — Mini-Jira on AWS
 * ═══════════════════════════════════════════════════════════════
 *
 * Creates all 6 DynamoDB tables with proper GSIs.
 * Uses On-Demand (PAY_PER_REQUEST) billing → safe for AWS Free Tier.
 *
 * Usage:
 *   node infrastructure/dynamodb/create-tables.js
 *
 * Prerequisites:
 *   - AWS CLI configured OR running on an EC2 instance with an IAM role
 *   - Region: eu-north-1
 * ═══════════════════════════════════════════════════════════════
 */

import {
  DynamoDBClient,
  CreateTableCommand,
  DescribeTableCommand,
  waitUntilTableExists,
} from '@aws-sdk/client-dynamodb';

const REGION = 'eu-north-1';
const client = new DynamoDBClient({ region: REGION });

// ─── Table Definitions ──────────────────────────────────────

const tables = [
  // ┌─────────────────────────────────────────────────┐
  // │  1. USERS TABLE                                 │
  // │  PK: userId                                     │
  // └─────────────────────────────────────────────────┘
  {
    TableName: 'MiniJira_Users',
    KeySchema: [
      { AttributeName: 'userId', KeyType: 'HASH' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'userId', AttributeType: 'S' },
    ],
    BillingMode: 'PAY_PER_REQUEST',
  },

  // ┌─────────────────────────────────────────────────┐
  // │  2. TEAMS TABLE                                 │
  // │  PK: teamId                                     │
  // └─────────────────────────────────────────────────┘
  {
    TableName: 'MiniJira_Teams',
    KeySchema: [
      { AttributeName: 'teamId', KeyType: 'HASH' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'teamId', AttributeType: 'S' },
    ],
    BillingMode: 'PAY_PER_REQUEST',
  },

  // ┌─────────────────────────────────────────────────┐
  // │  3. PROJECTS TABLE                              │
  // │  PK: projectId                                  │
  // └─────────────────────────────────────────────────┘
  {
    TableName: 'MiniJira_Projects',
    KeySchema: [
      { AttributeName: 'projectId', KeyType: 'HASH' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'projectId', AttributeType: 'S' },
    ],
    BillingMode: 'PAY_PER_REQUEST',
  },

  // ┌─────────────────────────────────────────────────┐
  // │  4. TASKS TABLE (Most Critical)                 │
  // │  PK: taskId                                     │
  // │  GSI 1: teamId + createdAt  → Team isolation    │
  // │  GSI 2: assigneeId + createdAt → User tasks     │
  // └─────────────────────────────────────────────────┘
  {
    TableName: 'MiniJira_Tasks',
    KeySchema: [
      { AttributeName: 'taskId', KeyType: 'HASH' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'taskId', AttributeType: 'S' },
      { AttributeName: 'teamId', AttributeType: 'S' },
      { AttributeName: 'assigneeId', AttributeType: 'S' },
      { AttributeName: 'createdAt', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        // GSI 1 — CRITICAL for team isolation enforcement
        // Employees query tasks ONLY through this index
        IndexName: 'teamId-createdAt-index',
        KeySchema: [
          { AttributeName: 'teamId', KeyType: 'HASH' },
          { AttributeName: 'createdAt', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
      {
        // GSI 2 — Fetch tasks by assignee (for "My Tasks" view)
        IndexName: 'assigneeId-createdAt-index',
        KeySchema: [
          { AttributeName: 'assigneeId', KeyType: 'HASH' },
          { AttributeName: 'createdAt', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
    BillingMode: 'PAY_PER_REQUEST',
  },

  // ┌─────────────────────────────────────────────────┐
  // │  5. COMMENTS TABLE                              │
  // │  PK: commentId                                  │
  // │  GSI: taskId + createdAt                        │
  // └─────────────────────────────────────────────────┘
  {
    TableName: 'MiniJira_Comments',
    KeySchema: [
      { AttributeName: 'commentId', KeyType: 'HASH' },
      { AttributeName: 'taskId', KeyType: 'RANGE' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'commentId', AttributeType: 'S' },
      { AttributeName: 'taskId', AttributeType: 'S' },
    ],
    BillingMode: 'PAY_PER_REQUEST',
  },

  // ┌─────────────────────────────────────────────────┐
  // │  6. AUDIT LOG TABLE                             │
  // │  PK: taskId, SK: timestamp                      │
  // │  (Composite key — no GSI needed)                │
  // └─────────────────────────────────────────────────┘
  {
    TableName: 'MiniJira_AuditLog',
    KeySchema: [
      { AttributeName: 'taskId', KeyType: 'HASH' },
      { AttributeName: 'timestamp', KeyType: 'RANGE' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'taskId', AttributeType: 'S' },
      { AttributeName: 'timestamp', AttributeType: 'S' },
    ],
    BillingMode: 'PAY_PER_REQUEST',
  },
];

// ─── Creation Logic ─────────────────────────────────────────

async function tableExists(tableName) {
  try {
    await client.send(new DescribeTableCommand({ TableName: tableName }));
    return true;
  } catch (err) {
    if (err.name === 'ResourceNotFoundException') return false;
    throw err;
  }
}

async function createTable(tableConfig) {
  const { TableName } = tableConfig;

  if (await tableExists(TableName)) {
    console.log(`⏭️  Table "${TableName}" already exists — skipping.`);
    return;
  }

  console.log(`📦 Creating table "${TableName}"...`);

  try {
    await client.send(new CreateTableCommand(tableConfig));

    // Wait for the table to become ACTIVE
    await waitUntilTableExists(
      { client, maxWaitTime: 120 },
      { TableName }
    );

    console.log(`✅ Table "${TableName}" is ACTIVE.`);
  } catch (err) {
    console.error(`❌ Failed to create "${TableName}":`, err.message);
    throw err;
  }
}

async function main() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   Mini-Jira DynamoDB Table Setup             ║');
  console.log('║   Region: eu-north-1 | Billing: On-Demand    ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log();

  for (const table of tables) {
    await createTable(table);
  }

  console.log();
  console.log('🎉 All tables created successfully!');
  console.log();
  console.log('Table Summary:');
  console.log('─────────────────────────────────────────────');
  console.log('  MiniJira_Users      │ PK: userId     │ No GSI');
  console.log('  MiniJira_Teams      │ PK: teamId     │ No GSI');
  console.log('  MiniJira_Projects   │ PK: projectId  │ No GSI');
  console.log('  MiniJira_Tasks      │ PK: taskId     │ GSIs: teamId-createdAt, assigneeId-createdAt');
  console.log('  MiniJira_Comments   │ PK: commentId  │ SK: taskId (composite key)');
  console.log('  MiniJira_AuditLog   │ PK: taskId     │ SK: timestamp (composite key)');
  console.log('─────────────────────────────────────────────');
}

main().catch((err) => {
  console.error('💥 Setup failed:', err);
  process.exit(1);
});

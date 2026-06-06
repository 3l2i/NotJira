/**
 * Seed script — creates the Frontend and Backend teams in DynamoDB
 * using the exact teamIds already stored in Cognito for Sara and Omar.
 *
 * Run: node server/scripts/seedTeams.js
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(client);
const TABLE = process.env.DYNAMODB_TEAMS_TABLE || 'mini-jira-teams';

const teams = [
  { teamId: 'frontend-id', name: 'Frontend' },
  { teamId: 'backend-id',  name: 'Backend'  },
];

async function seed() {
  for (const team of teams) {
    await docClient.send(new PutCommand({
      TableName: TABLE,
      Item: { ...team, createdAt: new Date().toISOString() },
    }));
    console.log(`✅ Created team: ${team.name} (${team.teamId})`);
  }
  console.log('\n🎉 Teams seeded successfully!');
}

seed().catch(err => { console.error('❌ Seed failed:', err); process.exit(1); });

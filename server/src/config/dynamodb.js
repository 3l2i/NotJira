import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'eu-north-1',
});

// DynamoDBDocumentClient adds marshalling/unmarshalling
// so we work with plain JS objects instead of DynamoDB attribute maps
const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    convertEmptyValues: false,
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  },
  unmarshallOptions: {
    wrapNumbers: false,
  },
});

// Table name constants — read from env for flexibility
export const TABLE_NAMES = {
  USERS: process.env.DYNAMODB_USERS_TABLE || 'MiniJira_Users',
  TEAMS: process.env.DYNAMODB_TEAMS_TABLE || 'MiniJira_Teams',
  PROJECTS: process.env.DYNAMODB_PROJECTS_TABLE || 'MiniJira_Projects',
  TASKS: process.env.DYNAMODB_TASKS_TABLE || 'MiniJira_Tasks',
  COMMENTS: process.env.DYNAMODB_COMMENTS_TABLE || 'MiniJira_Comments',
  AUDIT: process.env.DYNAMODB_AUDIT_TABLE || 'MiniJira_AuditLog',
};

export { client as dynamoDbClient, docClient };

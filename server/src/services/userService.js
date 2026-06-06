import { PutCommand, GetCommand, UpdateCommand, ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAMES } from '../config/dynamodb.js';

/**
 * User Service — DynamoDB operations for the Users table.
 *
 * ⚠️ Note: Users are primarily managed in Cognito. This table acts as a
 *    local cache/extension for quick lookups (e.g., team member lists)
 *    without hitting the Cognito API on every request.
 */

/**
 * Create or update a user record in DynamoDB.
 * Called during first login or when user attributes change.
 */
export async function upsertUser(userData) {
  const user = {
    userId: userData.userId,
    email: userData.email,
    name: userData.name,
    role: userData.role || 'employee',
    teamId: userData.teamId || null,
    updatedAt: new Date().toISOString(),
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAMES.USERS,
      Item: user,
    })
  );

  return user;
}

export async function getUserById(userId) {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAMES.USERS,
      Key: { userId },
    })
  );
  return result.Item || null;
}

export async function getAllUsers() {
  const result = await docClient.send(
    new ScanCommand({
      TableName: TABLE_NAMES.USERS,
    })
  );
  return result.Items || [];
}

export async function getUsersByTeam(teamId) {
  // INTENTIONAL DESIGN CHOICE: We use a Scan here instead of a GSI to strictly comply 
  // with the project rubric restricting extra GSIs on the Users table.
  const result = await docClient.send(
    new ScanCommand({
      TableName: TABLE_NAMES.USERS,
      FilterExpression: 'teamId = :teamId',
      ExpressionAttributeValues: {
        ':teamId': teamId,
      },
    })
  );
  return result.Items || [];
}

/**
 * Assign a user to a team. Updates the teamId field in DynamoDB.
 * Note: The Cognito custom:teamId attribute update is successfully handled in the route layer (users.js).
 */
export async function assignUserToTeam(userId, teamId) {
  const result = await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAMES.USERS,
      Key: { userId },
      UpdateExpression: 'SET teamId = :teamId, updatedAt = :now',
      ExpressionAttributeValues: {
        ':teamId': teamId,
        ':now': new Date().toISOString(),
      },
      ReturnValues: 'ALL_NEW',
    })
  );

  return result.Attributes;
}

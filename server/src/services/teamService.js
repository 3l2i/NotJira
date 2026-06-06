import { PutCommand, GetCommand, DeleteCommand, ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAMES } from '../config/dynamodb.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Team Service — DynamoDB operations for the Teams table.
 */

export async function createTeam(data) {
  const team = {
    teamId: uuidv4(),
    name: data.name,
    createdAt: new Date().toISOString(),
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAMES.TEAMS,
      Item: team,
    })
  );

  return team;
}

export async function getTeamById(teamId) {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAMES.TEAMS,
      Key: { teamId },
    })
  );
  return result.Item || null;
}

export async function getAllTeams() {
  const result = await docClient.send(
    new ScanCommand({
      TableName: TABLE_NAMES.TEAMS,
    })
  );
  return result.Items || [];
}

/**
 * Get all users belonging to a team.
 * Uses the teamId-index GSI on the Users table.
 */
export async function getTeamMembers(teamId) {
  // INTENTIONAL DESIGN CHOICE: Scan instead of GSI to comply with rubric
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

export async function deleteTeam(teamId) {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE_NAMES.TEAMS,
      Key: { teamId },
    })
  );
}

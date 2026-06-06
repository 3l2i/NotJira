import { PutCommand, GetCommand, UpdateCommand, DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAMES } from '../config/dynamodb.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Project Service — DynamoDB operations for the Projects table.
 */

export async function createProject(data) {
  const project = {
    projectId: uuidv4(),
    name: data.name,
    description: data.description || '',
    managerId: data.managerId,
    createdAt: new Date().toISOString(),
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAMES.PROJECTS,
      Item: project,
    })
  );

  return project;
}

export async function getProjectById(projectId) {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAMES.PROJECTS,
      Key: { projectId },
    })
  );
  return result.Item || null;
}

export async function getAllProjects() {
  const result = await docClient.send(
    new ScanCommand({
      TableName: TABLE_NAMES.PROJECTS,
    })
  );
  return result.Items || [];
}

export async function updateProject(projectId, updates) {
  const updateExpressions = [];
  const expressionValues = {};
  const expressionNames = {};

  for (const [key, value] of Object.entries(updates)) {
    if (key === 'projectId') continue;
    updateExpressions.push(`#${key} = :${key}`);
    expressionValues[`:${key}`] = value;
    expressionNames[`#${key}`] = key;
  }

  const result = await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAMES.PROJECTS,
      Key: { projectId },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeValues: expressionValues,
      ExpressionAttributeNames: expressionNames,
      ReturnValues: 'ALL_NEW',
    })
  );

  return result.Attributes;
}

export async function deleteProject(projectId) {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE_NAMES.PROJECTS,
      Key: { projectId },
    })
  );
}

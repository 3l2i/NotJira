import { PutCommand, GetCommand, UpdateCommand, DeleteCommand, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAMES } from '../config/dynamodb.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Task Service — all DynamoDB operations for the Tasks table.
 *
 * ⚠️ Team isolation is enforced here by always querying via the
 *     teamId GSI for employee-facing operations.
 */

/**
 * Create a new task.
 */
export async function createTask(data) {
  const now = new Date().toISOString();
  const task = {
    taskId: uuidv4(),
    projectId: data.projectId,
    title: data.title,
    description: data.description || '',
    status: data.status || 'todo',
    priority: data.priority || 'medium',
    teamId: data.teamId,
    createdBy: data.createdBy,
    createdAt: now,
    updatedAt: now,
  };

  if (data.assigneeId) {
    task.assigneeId = data.assigneeId;
    task.assigneeName = data.assigneeName || 'Unknown';
  }
  if (data.deadline) task.deadline = data.deadline;
  if (data.imageKey) task.imageKey = data.imageKey;

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAMES.TASKS,
      Item: task,
    })
  );

  return task;
}

/**
 * Get a single task by its ID.
 */
export async function getTaskById(taskId) {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAMES.TASKS,
      Key: { taskId },
    })
  );
  return result.Item || null;
}

/**
 * Get all tasks for a specific team (uses GSI: teamId-createdAt-index).
 * This is the PRIMARY access pattern for employees.
 */
export async function getTasksByTeam(teamId) {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAMES.TASKS,
      IndexName: 'teamId-createdAt-index',
      KeyConditionExpression: 'teamId = :teamId',
      ExpressionAttributeValues: {
        ':teamId': teamId,
      },
      ScanIndexForward: false, // newest first
    })
  );
  return result.Items || [];
}

/**
 * Get all tasks for a specific assignee (uses GSI: assigneeId-createdAt-index).
 */
export async function getTasksByAssignee(assigneeId) {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAMES.TASKS,
      IndexName: 'assigneeId-createdAt-index',
      KeyConditionExpression: 'assigneeId = :assigneeId',
      ExpressionAttributeValues: {
        ':assigneeId': assigneeId,
      },
      ScanIndexForward: false,
    })
  );
  return result.Items || [];
}

/**
 * Get ALL tasks (manager-only — uses Scan).
 * ⚠️ Scan is expensive at scale but fine for a demo project.
 */
export async function getAllTasks() {
  const result = await docClient.send(
    new ScanCommand({
      TableName: TABLE_NAMES.TASKS,
    })
  );
  return result.Items || [];
}

/**
 * Update a task. Only updates the fields provided.
 */
export async function updateTask(taskId, updates) {
  const updateExpressions = [];
  const expressionValues = {};
  const expressionNames = {};

  // Always update updatedAt
  updates.updatedAt = new Date().toISOString();

  for (const [key, value] of Object.entries(updates)) {
    if (key === 'taskId') continue; // Can't update the PK
    updateExpressions.push(`#${key} = :${key}`);
    expressionValues[`:${key}`] = value;
    expressionNames[`#${key}`] = key;
  }

  const result = await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAMES.TASKS,
      Key: { taskId },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeValues: expressionValues,
      ExpressionAttributeNames: expressionNames,
      ReturnValues: 'ALL_NEW',
    })
  );

  return result.Attributes;
}

/**
 * Delete a task.
 */
export async function deleteTask(taskId) {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE_NAMES.TASKS,
      Key: { taskId },
    })
  );
}

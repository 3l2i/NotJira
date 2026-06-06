import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAMES } from '../config/dynamodb.js';

/**
 * Audit Service — logs every task status change to the AuditLog table.
 *
 * AuditLog table schema:
 *   PK: taskId
 *   SK: timestamp (ISO string)
 *   Attributes: actorId, fromStatus, toStatus
 */

/**
 * Log a status change in the audit trail.
 */
export async function logStatusChange({ taskId, actorId, actorName, fromStatus, toStatus }) {
  const entry = {
    taskId,
    timestamp: new Date().toISOString(),
    actorId,
    actorName: actorName || actorId,
    fromStatus,
    toStatus,
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAMES.AUDIT,
      Item: entry,
    })
  );

  return entry;
}

/**
 * Get the full audit trail for a task, ordered chronologically.
 */
export async function getAuditLog(taskId) {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAMES.AUDIT,
      KeyConditionExpression: 'taskId = :taskId',
      ExpressionAttributeValues: {
        ':taskId': taskId,
      },
      ScanIndexForward: true, // oldest first
    })
  );
  return result.Items || [];
}

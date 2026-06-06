import { PublishCommand } from '@aws-sdk/client-sns';
import { snsClient, SNS_TOPICS } from '../config/sns.js';

/**
 * Notification Service — publishes events to SNS for fan-out.
 *
 * When a task is assigned, this publishes a message to the
 * TaskAssignment SNS topic, which:
 *   1. Sends an email to the assignee (email subscription)
 *   2. Pushes to the SQS queue (for the Assignment Worker Lambda)
 */

/**
 * Publish a task assignment event to SNS.
 */
export async function publishTaskAssignment(task) {
  if (!SNS_TOPICS.TASK_ASSIGNMENT) {
    console.warn('⚠️ SNS_TASK_ASSIGNMENT_TOPIC_ARN not configured. Skipping notification.');
    return null;
  }

  const message = `
You have been assigned a new task!

Title: ${task.title}
Priority: ${task.priority || 'Normal'}
Team: ${task.teamId}
Due Date: ${task.deadline || 'Not set'}

Log in to Mini-Jira to view details.
`;

  try {
    const result = await snsClient.send(
      new PublishCommand({
        TopicArn: SNS_TOPICS.TASK_ASSIGNMENT,
        Subject: `New Task Assigned: ${task.title}`,
        // FIX: Send only the fields the Lambda needs — not the full task object.
        // Sending the full task wastes bandwidth and could expose sensitive data.
        Message: JSON.stringify({
          taskId: task.taskId,
          title: task.title,
          assigneeId: task.assigneeId,
          teamId: task.teamId,
          projectId: task.projectId,
        }),
        MessageAttributes: {
          eventType: {
            DataType: 'String',
            StringValue: 'TASK_ASSIGNED',
          },
          teamId: {
            DataType: 'String',
            StringValue: task.teamId,
          },
        },
      })
    );

    console.log(`📨 SNS notification published: ${result.MessageId}`);
    return result.MessageId;
  } catch (err) {
    // Don't fail the request if notification fails — log and continue
    console.error('❌ Failed to publish SNS notification:', err.message);
    return null;
  }
}

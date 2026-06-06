import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';

const cw = new CloudWatchClient({ region: process.env.AWS_REGION || 'eu-north-1' });
const NAMESPACE = 'MiniJira/Analytics';

/**
 * Publish a "Task Created" metric to CloudWatch.
 * @param {string} teamId - The team the task belongs to.
 */
export async function publishTaskCreated(teamId) {
  try {
    await cw.send(new PutMetricDataCommand({
      Namespace: NAMESPACE,
      MetricData: [{
        MetricName: 'TasksCreated',
        Value: 1,
        Unit: 'Count',
        Dimensions: [{ Name: 'TeamID', Value: teamId || 'unknown' }],
      }],
    }));
  } catch (err) {
    // Never fail the request if CloudWatch is unavailable
    console.error('⚠️ CloudWatch publishTaskCreated failed:', err.message);
  }
}

/**
 * Publish a "Task Closed" metric and "TimeToClose" metric to CloudWatch.
 * @param {string} teamId - The team the task belongs to.
 * @param {number} timeToCloseHours - How many hours from creation to close.
 */
export async function publishTaskClosed(teamId, timeToCloseHours) {
  try {
    await cw.send(new PutMetricDataCommand({
      Namespace: NAMESPACE,
      MetricData: [
        {
          MetricName: 'TasksClosed',
          Value: 1,
          Unit: 'Count',
          Dimensions: [{ Name: 'TeamID', Value: teamId || 'unknown' }],
        },
        {
          MetricName: 'TimeToClose',
          Value: timeToCloseHours,
          Unit: 'None', // CloudWatch doesn't have an "Hours" unit; we store raw number
          Dimensions: [{ Name: 'TeamID', Value: teamId || 'unknown' }],
        },
      ],
    }));
  } catch (err) {
    console.error('⚠️ CloudWatch publishTaskClosed failed:', err.message);
  }
}

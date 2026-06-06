import { DynamoDBClient, ScanCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';

const ddb = new DynamoDBClient({ region: 'eu-north-1' });
const sns = new SNSClient({ region: 'eu-north-1' });
const cw = new CloudWatchClient({ region: 'eu-north-1' });

const TASKS_TABLE = process.env.TASKS_TABLE;
const USERS_TABLE = process.env.USERS_TABLE;
const SNS_TOPIC_ARN = process.env.SNS_TOPIC_ARN;

export const handler = async (event) => {
  console.log('📅 Daily Digest Lambda triggered');

  try {
    const today = new Date().toISOString().split('T')[0];

    // ── FIX: Paginated Scan ─────────────────────────────────────────────────
    // DynamoDB Scan returns max 1MB of data per call.
    // If the Tasks table has many records, we MUST paginate using
    // LastEvaluatedKey or we silently miss tasks beyond the first page.
    let allTasks = [];
    let lastKey = undefined;

    do {
      const result = await ddb.send(new ScanCommand({
        TableName: TASKS_TABLE,
        // Server-side filter: only fetch non-DONE tasks due today or earlier.
        // NOTE: FilterExpression does NOT reduce the 1MB scan limit —
        // it filters AFTER reading. We still need the pagination loop.
        FilterExpression: 'deadline <= :today AND #s <> :done',
        ExpressionAttributeNames: { '#s': 'status' },
        ExpressionAttributeValues: {
          ':today': { S: today },
          ':done': { S: 'done' },
        },
        ExclusiveStartKey: lastKey,
      }));

      allTasks = allTasks.concat(result.Items || []);
      lastKey = result.LastEvaluatedKey; // undefined when no more pages
    } while (lastKey);

    console.log(`📊 Found ${allTasks.length} pending/overdue tasks`);

    if (allTasks.length === 0) {
      console.log('✅ No pending tasks for today.');
      return { statusCode: 200, body: 'No tasks to notify' };
    }

    // ── Group tasks by assigneeId ───────────────────────────────────────────
    const grouped = allTasks.reduce((acc, task) => {
      const userId = task.assigneeId?.S;
      if (!userId) return acc;
      if (!acc[userId]) acc[userId] = [];
      acc[userId].push(task.title?.S || 'Untitled Task');
      return acc;
    }, {});

    // ── Send a summary email to each user ──────────────────────────────────
    for (const [userId, taskTitles] of Object.entries(grouped)) {
      const userResult = await ddb.send(new GetItemCommand({
        TableName: USERS_TABLE,
        Key: { userId: { S: userId } },
      }));

      const email = userResult.Item?.email?.S;
      if (!email) {
        console.warn(`⚠️ No email found for user ${userId}, skipping.`);
        continue;
      }

      console.log(`📡 Sending digest to ${email} (${taskTitles.length} tasks)...`);
      await sns.send(new PublishCommand({
        TopicArn: SNS_TOPIC_ARN,
        Subject: '📝 Your Daily Mini-Jira Digest',
        Message: `Hello!\n\nYou have ${taskTitles.length} task(s) pending or overdue:\n\n- ${taskTitles.join('\n- ')}\n\nHave a productive day!\n— A7SAN MN JIRA`,
      }));
    }

    console.log('✅ All digests sent successfully');

    // CloudWatch: Publish OverdueTasksCount metric for alarming
    try {
      await cw.send(new PutMetricDataCommand({
        Namespace: 'MiniJira/Analytics',
        MetricData: [{
          MetricName: 'OverdueTasksCount',
          Value: allTasks.length,
          Unit: 'Count',
          Dimensions: [{ Name: 'Environment', Value: 'production' }],
        }],
      }));
      console.log(`📊 CloudWatch OverdueTasksCount published: ${allTasks.length}`);
    } catch (cwErr) {
      console.error('⚠️ CloudWatch metric failed (non-fatal):', cwErr.message);
    }
  } catch (err) {
    console.error('❌ Error generating digest:', err);
  }

  return { statusCode: 200 };
};

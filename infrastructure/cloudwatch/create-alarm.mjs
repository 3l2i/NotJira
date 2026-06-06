import { CloudWatchClient, PutMetricAlarmCommand } from "@aws-sdk/client-cloudwatch";

const client = new CloudWatchClient({ region: "eu-north-1" });

// The SNS topic that will receive the alarm email
const SNS_TOPIC_ARN = "arn:aws:sns:eu-north-1:722867460649:MiniJira-UserNotifications";

async function createAlarms() {
  try {
    // ── Alarm 1: Image Resizer Errors ────────────────────────────────────────
    // Fires if the ImageResize Lambda has MORE than 1 error in 5 minutes.
    // Why: If images stop being resized, the team should know immediately.
    await client.send(new PutMetricAlarmCommand({
      AlarmName: "MiniJira-ImageResizer-Errors",
      AlarmDescription: "Alert when the Image Resize Lambda crashes more than once in 5 minutes.",
      Namespace: "AWS/Lambda",
      MetricName: "Errors",
      Dimensions: [{ Name: "FunctionName", Value: "MiniJira-ImageResize" }],
      Statistic: "Sum",
      Period: 300,           // 5 minutes
      EvaluationPeriods: 1,
      Threshold: 1,
      ComparisonOperator: "GreaterThanThreshold",
      TreatMissingData: "notBreaching",
      AlarmActions: [SNS_TOPIC_ARN],
      OKActions: [SNS_TOPIC_ARN],
    }));
    console.log("✅ Alarm 1 created: MiniJira-ImageResizer-Errors");

    // ── Alarm 2: Assignment Worker Errors ────────────────────────────────────
    // Fires if the AssignmentWorker Lambda has any error in 5 minutes.
    // Why: If the worker fails, audit logs won't be written and emails won't send.
    await client.send(new PutMetricAlarmCommand({
      AlarmName: "MiniJira-AssignmentWorker-Errors",
      AlarmDescription: "Alert when the Assignment Worker Lambda errors out.",
      Namespace: "AWS/Lambda",
      MetricName: "Errors",
      Dimensions: [{ Name: "FunctionName", Value: "MiniJira-AssignmentWorker" }],
      Statistic: "Sum",
      Period: 300,
      EvaluationPeriods: 1,
      Threshold: 1,
      ComparisonOperator: "GreaterThanThreshold",
      TreatMissingData: "notBreaching",
      AlarmActions: [SNS_TOPIC_ARN],
      OKActions: [SNS_TOPIC_ARN],
    }));
    console.log("✅ Alarm 2 created: MiniJira-AssignmentWorker-Errors");

    // ── Alarm 3: SQS Dead Letter / Message Age ───────────────────────────────
    // Fires if SQS messages are sitting unprocessed for more than 5 minutes.
    // Why: Messages stuck in the queue means notifications aren't being sent.
    await client.send(new PutMetricAlarmCommand({
      AlarmName: "MiniJira-SQS-OldMessages",
      AlarmDescription: "Alert when SQS messages are not being processed (stuck queue).",
      Namespace: "AWS/SQS",
      MetricName: "ApproximateAgeOfOldestMessage",
      Dimensions: [{ Name: "QueueName", Value: "MiniJira-AssignmentQueue" }],
      Statistic: "Maximum",
      Period: 300,
      EvaluationPeriods: 1,
      Threshold: 300,        // 5 minutes in seconds
      ComparisonOperator: "GreaterThanThreshold",
      TreatMissingData: "notBreaching",
      AlarmActions: [SNS_TOPIC_ARN],
    }));
    console.log("✅ Alarm 3 created: MiniJira-SQS-OldMessages");

    console.log("\n🔔 All alarms are now live in CloudWatch!");
    console.log("🔗 View: https://eu-north-1.console.aws.amazon.com/cloudwatch/home?region=eu-north-1#alarmsV2:");
  } catch (error) {
    console.error("❌ Error creating alarms:", error);
  }
}

createAlarms();

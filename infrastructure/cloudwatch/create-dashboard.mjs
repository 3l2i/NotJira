import { CloudWatchClient, PutDashboardCommand } from "@aws-sdk/client-cloudwatch";

const client = new CloudWatchClient({ region: "eu-north-1" });

const dashboardName = "MiniJira-Overview";

// Define the visual layout and metrics
const dashboardBody = {
  widgets: [
    {
      type: "metric",
      x: 0,
      y: 0,
      width: 12,
      height: 6,
      properties: {
        metrics: [
          ["AWS/Lambda", "Invocations", "FunctionName", "MiniJira-ImageResize", { color: "#2ca02c", label: "Image Resizer" }],
          ["AWS/Lambda", "Invocations", "FunctionName", "MiniJira-AssignmentWorker", { color: "#1f77b4", label: "Task Worker" }],
          ["AWS/Lambda", "Invocations", "FunctionName", "MiniJira-DailyDigest", { color: "#9467bd", label: "Daily Digest" }]
        ],
        view: "timeSeries",
        stacked: false,
        region: "eu-north-1",
        title: "Lambda Successes (Invocations)"
      }
    },
    {
      type: "metric",
      x: 12,
      y: 0,
      width: 12,
      height: 6,
      properties: {
        metrics: [
          ["AWS/Lambda", "Errors", "FunctionName", "MiniJira-ImageResize", { color: "#d62728" }],
          ["AWS/Lambda", "Errors", "FunctionName", "MiniJira-AssignmentWorker", { color: "#ff7f0e" }]
        ],
        view: "timeSeries",
        stacked: false,
        region: "eu-north-1",
        title: "System Errors (Lambda Crashes)"
      }
    },
    {
      type: "metric",
      x: 0,
      y: 6,
      width: 12,
      height: 6,
      properties: {
        metrics: [
          ["AWS/S3", "BucketSizeBytes", "StorageType", "StandardStorage", "BucketName", "minijira-originals-ali-605856", { label: "Originals (KB)" }],
          ["AWS/S3", "BucketSizeBytes", "StorageType", "StandardStorage", "BucketName", "minijira-resized-ali-605856", { label: "Resized (KB)" }]
        ],
        view: "timeSeries",
        stacked: true,
        region: "eu-north-1",
        title: "S3 Storage Growth"
      }
    },
    {
      type: "metric",
      x: 12,
      y: 6,
      width: 12,
      height: 6,
      properties: {
        metrics: [
          ["AWS/SQS", "NumberOfMessagesSent", "QueueName", "MiniJira-AssignmentQueue", { label: "Notifications Sent" }]
        ],
        view: "timeSeries",
        stacked: false,
        region: "eu-north-1",
        title: "SQS Traffic (Notifications)"
      }
    }
  ]
};

async function createDashboard() {
  try {
    const command = new PutDashboardCommand({
      DashboardName: dashboardName,
      DashboardBody: JSON.stringify(dashboardBody)
    });

    await client.send(command);
    console.log(`✅ Success: CloudWatch Dashboard "${dashboardName}" has been created/updated.`);
    console.log(`🔗 Link: https://eu-north-1.console.aws.amazon.com/cloudwatch/home?region=eu-north-1#dashboards:name=${dashboardName}`);
  } catch (error) {
    console.error("❌ Error creating dashboard:", error);
  }
}

createDashboard();

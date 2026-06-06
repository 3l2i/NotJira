import { SNSClient } from '@aws-sdk/client-sns';
import { SQSClient } from '@aws-sdk/client-sqs';

const snsClient = new SNSClient({
  region: process.env.AWS_REGION || 'eu-north-1',
});

const sqsClient = new SQSClient({
  region: process.env.AWS_REGION || 'eu-north-1',
});

export const SNS_TOPICS = {
  TASK_ASSIGNMENT: process.env.SNS_TASK_ASSIGNMENT_TOPIC_ARN,
};

export const SQS_QUEUES = {
  ASSIGNMENT: process.env.SQS_ASSIGNMENT_QUEUE_URL,
};

export { snsClient, sqsClient };

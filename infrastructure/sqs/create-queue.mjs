import { SQSClient, CreateQueueCommand, GetQueueAttributesCommand } from '@aws-sdk/client-sqs';

const sqs = new SQSClient({ region: 'eu-north-1' });

async function createQueue() {
  console.log('🚀 Creating SQS Queue: MiniJira-AssignmentQueue...');
  
  try {
    // 1. Create the queue
    const createResult = await sqs.send(new CreateQueueCommand({
      QueueName: 'MiniJira-AssignmentQueue',
      Attributes: {
        VisibilityTimeout: '300',      // 5 minutes (allows Lambda time to process)
        MessageRetentionPeriod: '86400', // 1 day (standard for demo)
        ReceiveMessageWaitTimeSeconds: '20', // Long polling
      }
    }));

    const queueUrl = createResult.QueueUrl;
    console.log('✅ SQS Queue created successfully!');
    console.log('🔗 Queue URL:', queueUrl);

    // 2. Get the queue ARN (needed for SNS subscription)
    const attrsResult = await sqs.send(new GetQueueAttributesCommand({
      QueueUrl: queueUrl,
      AttributeNames: ['QueueArn']
    }));

    const queueArn = attrsResult.Attributes.QueueArn;
    console.log('📋 Queue ARN:', queueArn);
    console.log('\n⚠️ ACTION: Copy these to your .env');

  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

createQueue();
